use std::path::Path;
use sqlx::SqlitePool;
use crate::db::config::Config;
use std::fs;

const BASE_PATH_CONFIG_KEY: &str = "base_path";

/// Initialize base directory structure
/// Creates subdirectories: github/, private-git/, local/, .skill-vaults/
pub async fn init_base_directory(path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let base_path = Path::new(path);
    fs::create_dir_all(base_path)?;

    let subdirs = ["github", "private-git", "local", ".skill-vaults"];
    for subdir in subdirs.iter() {
        let subdir_path = base_path.join(subdir);
        fs::create_dir_all(subdir_path)?;
    }

    Ok(())
}

/// Get current base path from config
pub async fn get_base_path(pool: &SqlitePool) -> Result<Option<String>, Box<dyn std::error::Error>> {
    Config::get(pool, BASE_PATH_CONFIG_KEY).await
}

/// Set base path, save to config and initialize directory structure
pub async fn set_base_path(pool: &SqlitePool, path: &str) -> Result<(), Box<dyn std::error::Error>> {
    init_base_directory(path).await?;
    Config::set(pool, BASE_PATH_CONFIG_KEY, path).await?;
    Ok(())
}

/// Migrate base directory to a new location
/// Moves all content subdirectories and the database
pub async fn migrate_base_directory(
    app_handle: &tauri::AppHandle,
    pool: &SqlitePool,
    new_path: &str,
) -> Result<bool, String> {
    let current_base = get_base_path(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No base path configured".to_string())?;

    if current_base == new_path {
        return Ok(false);
    }

    // Initialize new directory structure
    init_base_directory(new_path)
        .await
        .map_err(|e| format!("Failed to initialize new directory: {}", e))?;

    let old_base = Path::new(&current_base);
    let new_base = Path::new(new_path);

    // Move content directories
    let content_dirs = ["github", "private-git", "local"];
    for dir_name in content_dirs.iter() {
        let old_dir = old_base.join(dir_name);
        let new_dir = new_base.join(dir_name);

        if old_dir.exists() {
            if new_dir.exists() {
                // Merge: move individual items
                if let Ok(entries) = fs::read_dir(&old_dir) {
                    for entry in entries.flatten() {
                        let dest = new_dir.join(entry.file_name());
                        if !dest.exists() {
                            fs::rename(entry.path(), dest)
                                .map_err(|e| format!("Failed to move {}: {}", dir_name, e))?;
                        }
                    }
                }
            } else {
                fs::rename(&old_dir, &new_dir)
                    .map_err(|e| format!("Failed to move {}: {}", dir_name, e))?;
            }
        }
    }

    // Move .skill-vaults directory (contains vault.db)
    let old_config_dir = old_base.join(".skill-vaults");
    let new_config_dir = new_base.join(".skill-vaults");

    if old_config_dir.exists() {
        // Copy vault.db to new location (can't rename while pool is open)
        let old_db = old_config_dir.join("vault.db");
        let new_db = new_config_dir.join("vault.db");

        if old_db.exists() && !new_db.exists() {
            fs::copy(&old_db, &new_db)
                .map_err(|e| format!("Failed to copy database: {}", e))?;
        }
    }

    // Update config table with new base path
    Config::set(pool, BASE_PATH_CONFIG_KEY, new_path)
        .await
        .map_err(|e| format!("Failed to update config: {}", e))?;

    // Update bootstrap.json
    crate::db::write_bootstrap(app_handle, new_path)
        .map_err(|e| format!("Failed to update bootstrap: {}", e))?;

    Ok(true) // require_restart
}

#[tauri::command]
pub async fn get_base_path_command(pool: tauri::State<'_, SqlitePool>) -> Result<Option<String>, String> {
    get_base_path(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_base_path_command(pool: tauri::State<'_, SqlitePool>, path: &str) -> Result<(), String> {
    set_base_path(&pool, path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn init_base_directory_command(path: &str) -> Result<(), String> {
    init_base_directory(path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn migrate_base_directory_command(
    app_handle: tauri::AppHandle,
    pool: tauri::State<'_, SqlitePool>,
    new_path: &str,
) -> Result<bool, String> {
    migrate_base_directory(&app_handle, &pool, new_path).await
}
