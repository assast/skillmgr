use std::path::PathBuf;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use sqlx::SqlitePool;
use tauri::State;

use crate::db::dispatch::{Dispatch, DispatchMethod, SyncStatus};
use crate::db::skill::Skill;
use super::target_dir::TargetDir;
use super::copy::{copy_dir, hardlink_dir};

/// Dispatch a skill to target directory using specified method
#[tauri::command]
pub async fn dispatch_skill(
    skill_id: &str,
    target_dir_id: &str,
    dispatch_method: DispatchMethod,
    pool: State<'_, SqlitePool>,
) -> Result<Dispatch, String> {
    let skill = Skill::get_by_id(&pool, skill_id)
        .await
        .map_err(|e| format!("Failed to get skill: {}", e))?
        .ok_or_else(|| format!("Skill with id {} not found", skill_id))?;

    let target_dir = sqlx::query_as::<_, TargetDir>(
        "SELECT * FROM target_dirs WHERE id = ?"
    )
    .bind(target_dir_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| format!("Failed to get target directory: {}", e))?
    .ok_or_else(|| format!("Target directory with id {} not found", target_dir_id))?;

    process_single_dispatch_with_skill(&skill, &target_dir, dispatch_method, &pool).await
}

/// List all dispatch rules
#[tauri::command]
pub async fn list_dispatches(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Dispatch>, String> {
    Dispatch::get_all(&pool)
        .await
        .map_err(|e| format!("Failed to list dispatches: {}", e))
}

/// Delete a dispatch record and clean up the dispatched file/symlink
#[tauri::command]
pub async fn delete_dispatch(
    dispatch_id: &str,
    pool: State<'_, SqlitePool>,
) -> Result<bool, String> {
    let dispatch = Dispatch::get_by_id(&pool, dispatch_id)
        .await
        .map_err(|e| format!("Failed to get dispatch: {}", e))?
        .ok_or_else(|| format!("Dispatch with id {} not found", dispatch_id))?;

    let dest_path = PathBuf::from(&dispatch.dest_path);
    if dest_path.exists() {
        match dispatch.method {
            DispatchMethod::Symlink => {
                std::fs::remove_file(&dest_path)
                    .or_else(|_| std::fs::remove_dir_all(&dest_path))
                    .map_err(|e| format!("Failed to remove symlink: {}", e))?;
            }
            DispatchMethod::Copy => {
                std::fs::remove_dir_all(&dest_path)
                    .map_err(|e| format!("Failed to remove copied files: {}", e))?;
            }
        DispatchMethod::Hardlink => {
            // Remove hardlink: try file first, then directory
            std::fs::remove_file(&dest_path)
                .or_else(|_| std::fs::remove_dir_all(&dest_path))
                .map_err(|e| format!("Failed to remove hardlink: {}", e))?;
        }
    }
    }

    Dispatch::delete(&pool, dispatch_id)
        .await
        .map_err(|e| format!("Failed to delete dispatch record: {}", e))
}

/// Bulk dispatch result containing successful dispatches and errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkDispatchResult {
    pub successful: Vec<Dispatch>,
    pub errors: Vec<(String, String)>, // (skill_id, error_message)
}

/// Bulk dispatch multiple skills to target directory using specified method
#[tauri::command]
pub async fn bulk_dispatch(
    skill_ids: Vec<String>,
    target_dir_id: &str,
    dispatch_method: DispatchMethod,
    pool: State<'_, SqlitePool>,
) -> Result<BulkDispatchResult, String> {
    let mut bulk_result = BulkDispatchResult {
        successful: Vec::new(),
        errors: Vec::new(),
    };

    if skill_ids.is_empty() {
        return Ok(bulk_result);
    }

    // Get target directory once (common for all dispatches)
    let target_dir = sqlx::query_as::<_, TargetDir>(
        "SELECT * FROM target_dirs WHERE id = ?"
    )
    .bind(target_dir_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| format!("Failed to get target directory: {}", e))?
    .ok_or_else(|| format!("Target directory with id {} not found", target_dir_id))?;

    // Pre-fetch all skills in one query to avoid N+1 database calls
    let mut qb = sqlx::QueryBuilder::new("SELECT * FROM skills WHERE id IN (");
    let mut separated = qb.separated(", ");
    for skill_id in &skill_ids {
        separated.push_bind(skill_id);
    }
    separated.push_unseparated(")");
    let rows = qb.build().fetch_all(&*pool)
        .await
        .map_err(|e| format!("Failed to fetch skills: {}", e))?;

    let skills: Vec<Skill> = rows.iter()
        .filter_map(|r| crate::db::skill::map_row_to_skill(r).ok())
        .collect();

    let skill_map: std::collections::HashMap<_, _> = skills.into_iter().map(|s| (s.id.clone(), s)).collect();

    // Process dispatches sequentially to avoid concurrency issues
    for skill_id in skill_ids {
        let skill = match skill_map.get(&skill_id) {
            Some(s) => s.clone(),
            None => {
                bulk_result.errors.push((skill_id.clone(), format!("Skill with id {} not found", skill_id)));
                continue;
            }
        };

        match process_single_dispatch_with_skill(&skill, &target_dir, dispatch_method, &pool).await {
            Ok(dispatch) => bulk_result.successful.push(dispatch),
            Err(e) => bulk_result.errors.push((skill_id, e)),
        }
    }

    Ok(bulk_result)
}

/// Helper function to process a single dispatch with pre-fetched skill
async fn process_single_dispatch_with_skill(
    skill: &Skill,
    target_dir: &TargetDir,
    dispatch_method: DispatchMethod,
    pool: &SqlitePool,
) -> Result<Dispatch, String> {
    // Build source and destination paths
    let source_path = PathBuf::from(&skill.local_path);
    let dest_base = if target_dir.skills_subdir.is_empty() {
        PathBuf::from(&target_dir.path)
    } else {
        PathBuf::from(&target_dir.path).join(&target_dir.skills_subdir)
    };
    if !dest_base.exists() {
        std::fs::create_dir_all(&dest_base)
            .map_err(|e| format!("Failed to create destination directory {}: {}", dest_base.display(), e))?;
    }
    let dest_path = dest_base.join(&skill.name);

    // Check if source path exists
    if !source_path.exists() {
        return Err(format!("Skill source path does not exist: {}", source_path.display()));
    }

    // Remove existing destination if present (re-dispatch scenario)
    if dest_path.exists() {
        std::fs::remove_file(&dest_path)
            .or_else(|_| std::fs::remove_dir_all(&dest_path))
            .map_err(|e| format!("Failed to remove existing destination {}: {}", dest_path.display(), e))?;
    }

    // Create parent directories if they don't exist
    if let Some(parent) = dest_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }

    // Perform dispatch based on method
    match dispatch_method {
        DispatchMethod::Symlink => {
            // Create symbolic link
            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(&source_path, &dest_path)
                    .map_err(|e| format!("Failed to create symbolic link: {}", e))?;
            }

            #[cfg(windows)]
            {
                std::os::windows::fs::symlink_dir(&source_path, &dest_path)
                    .map_err(|e| format!("Failed to create symbolic link: {}", e))?;
            }
        }
        DispatchMethod::Copy => {
            // Recursively copy directory
            copy_dir(&source_path, &dest_path)?;
        }
        DispatchMethod::Hardlink => {
            if source_path.is_file() {
                std::fs::hard_link(&source_path, &dest_path)
                    .map_err(|e| format!("Failed to create hard link: {}", e))?;
            } else {
                hardlink_dir(&source_path, &dest_path)
                    .map_err(|e| format!("Failed to create hard link directory: {}", e))?;
            }
        }
    }

    // Create dispatch record
    let now = chrono::Utc::now();
    let dispatch = Dispatch::create(
        pool,
        target_dir.id.clone(),
        skill.id.clone(),
        dispatch_method,
        source_path.to_string_lossy().to_string(),
        dest_path.to_string_lossy().to_string(),
        SyncStatus::Synced,
        None,
        Some(now),
    )
    .await
    .map_err(|e| format!("Failed to create dispatch record: {}", e))?;

    Ok(dispatch)
}

/// Scan a target directory's skills subfolder and create dispatch records
/// for any skill folders found on disk but missing from the database
#[tauri::command]
#[allow(dead_code)]
pub async fn scan_target_dir(
    target_dir_id: &str,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Dispatch>, String> {
    let target_dir = sqlx::query_as::<_, TargetDir>(
        "SELECT * FROM target_dirs WHERE id = ?"
    )
    .bind(target_dir_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| format!("Failed to get target directory: {}", e))?
    .ok_or_else(|| format!("Target directory with id {} not found", target_dir_id))?;

    let dest_base = if target_dir.skills_subdir.is_empty() {
        PathBuf::from(&target_dir.path)
    } else {
        PathBuf::from(&target_dir.path).join(&target_dir.skills_subdir)
    };

    if !dest_base.exists() {
        return Ok(Vec::new());
    }

    let existing_dispatches = Dispatch::get_by_target_dir(&pool, target_dir_id)
        .await
        .map_err(|e| format!("Failed to get existing dispatches: {}", e))?;
    let existing_skill_ids: std::collections::HashSet<_> =
        existing_dispatches.iter().map(|d| d.skill_id.clone()).collect();

    let all_skills = sqlx::query("SELECT * FROM skills")
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Failed to fetch skills: {}", e))?;
    let skill_map: std::collections::HashMap<String, crate::db::skill::Skill> = all_skills
        .iter()
        .filter_map(|r| crate::db::skill::map_row_to_skill(r).ok())
        .map(|s| (s.name.clone(), s))
        .collect();

    let mut created = Vec::new();
    for entry in std::fs::read_dir(&dest_base)
        .map_err(|e| format!("Failed to read directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        if !entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }
        let folder_name = entry.file_name().to_string_lossy().to_string();
        let Some(skill) = skill_map.get(&folder_name) else {
            continue;
        };
        if existing_skill_ids.contains(&skill.id) {
            continue;
        }
        let dest_path = dest_base.join(&folder_name);
        let source_path = PathBuf::from(&skill.local_path);
        if !source_path.exists() {
            continue;
        }
        let method = if dest_path.is_symlink() {
            DispatchMethod::Symlink
        } else {
            DispatchMethod::Copy
        };
        let now = chrono::Utc::now();
        match Dispatch::create(
            &pool,
            target_dir_id.to_string(),
            skill.id.clone(),
            method,
            source_path.to_string_lossy().to_string(),
            dest_path.to_string_lossy().to_string(),
            SyncStatus::Synced,
            None,
            Some(now),
        )
        .await
        {
            Ok(dispatch) => created.push(dispatch),
            Err(_) => continue,
        }
    }

    Ok(created)
}

