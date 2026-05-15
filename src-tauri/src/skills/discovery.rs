use anyhow::Result;
use std::path::Path;

use sqlx::SqlitePool;
use serde::{Serialize, Deserialize};

use crate::db::skill::{Skill, CreateSkill};
use crate::db::repository::Repository;

/// Skill discovery options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryOptions {
    pub repository_id: Option<String>,
    pub force: Option<bool>,
}

/// Discovery result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryResult {
    pub discovered_skills: Vec<Skill>,
    pub skipped_skills: Vec<String>,
    pub errors: Vec<String>,
}

struct SkillMeta {
    name: String,
    description: Option<String>,
}

/// Parse YAML frontmatter from SKILL.md to extract name and description.
/// Format:
/// ```
/// ---
/// name: pdf
/// description: Use this skill when...
/// ---
/// ```
fn parse_skill_meta(path: &Path) -> SkillMeta {
    let skill_md = path.join("SKILL.md");
    let dir_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown-skill")
        .to_string();

    let content = match std::fs::read_to_string(&skill_md) {
        Ok(c) => c,
        Err(_) => {
            return SkillMeta {
                name: dir_name,
                description: None,
            }
        }
    };

    // Find YAML frontmatter between --- delimiters
    let mut lines = content.lines();
    let first = lines.next().map(|l| l.trim()).unwrap_or("");
    if first != "---" {
        return SkillMeta {
            name: dir_name,
            description: None,
        };
    }

    let mut name: Option<String> = None;
    let mut description: Option<String> = None;

    for line in lines {
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }
        if let Some(value) = trimmed.strip_prefix("name:") {
            let v = value.trim().trim_matches('"');
            if !v.is_empty() {
                name = Some(v.to_string());
            }
        } else if let Some(value) = trimmed.strip_prefix("description:") {
            let v = value.trim();
            // Remove surrounding quotes if present
            let v = v.strip_prefix('"').and_then(|s| s.strip_suffix('"')).unwrap_or(v);
            if !v.is_empty() {
                description = Some(v.to_string());
            }
        }
    }

    SkillMeta {
        name: name.unwrap_or(dir_name),
        description,
    }
}

/// Scan a single repository for skills.
/// Only looks at immediate subdirectories of the configured skills path.
/// A directory is a skill if and only if it contains a `SKILL.md` file.
pub async fn scan_repository(
    pool: &SqlitePool,
    repo: &Repository,
    _force: bool,
) -> Result<DiscoveryResult> {
    let mut result = DiscoveryResult {
        discovered_skills: Vec::new(),
        skipped_skills: Vec::new(),
        errors: Vec::new(),
    };

    let base = Path::new(&repo.local_path);

    // Validate skills_path to prevent path traversal
    if !repo.skills_path.is_empty() && repo.skills_path != "skills" {
        let candidate = base.join(&repo.skills_path);
        let canonical_base = base.canonicalize().unwrap_or_else(|_| base.to_path_buf());
        if let Ok(canonical_candidate) = candidate.canonicalize() {
            if !canonical_candidate.starts_with(&canonical_base) {
                result.errors.push(format!(
                    "Invalid skills_path '{}': path traversal detected",
                    repo.skills_path
                ));
                return Ok(result);
            }
        }
    }

    let scan_path = if repo.skills_path.is_empty() || repo.skills_path == "skills" {
        let skills_dir = base.join("skills");
        if skills_dir.is_dir() {
            skills_dir
        } else {
            base.to_path_buf()
        }
    } else {
        base.join(&repo.skills_path)
    };

    if !scan_path.exists() || !scan_path.is_dir() {
        result.errors.push(format!(
            "Scan path does not exist or is not a directory: {}",
            scan_path.display()
        ));
        return Ok(result);
    }

    // Clean up existing skills before re-scanning
    sqlx::query("DELETE FROM skills WHERE repository_id = ?")
        .bind(&repo.id)
        .execute(pool)
        .await?;

    // Read immediate subdirectories only (one level deep)
    let entries = match std::fs::read_dir(&scan_path) {
        Ok(entries) => entries,
        Err(e) => {
            result.errors.push(format!("Failed to read scan path: {}", e));
            return Ok(result);
        }
    };

    let mut batch = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();

        // Only consider directories
        if !path.is_dir() {
            continue;
        }

        // Skip hidden directories
        let file_name = path.file_name().unwrap_or_default().to_string_lossy();
        if file_name.starts_with('.') {
            continue;
        }

        // A skill must have SKILL.md
        if !path.join("SKILL.md").exists() {
            result.skipped_skills.push(path.to_string_lossy().to_string());
            continue;
        }

        let meta = parse_skill_meta(&path);
        let full_path = path.to_string_lossy().to_string();

        batch.push(CreateSkill {
            name: meta.name,
            r#type: "skill".to_string(),
            source_type: repo.source_type.clone(),
            repository_id: Some(repo.id.clone()),
            local_path: full_path,
            description: meta.description,
            usage: None,
            tags: Vec::new(),
            dependencies: Vec::new(),
            llm_analyzed: Some(false),
            quality_score: None,
            status: "active".to_string(),
        });
    }

    if !batch.is_empty() {
        match crate::db::skill::bulk_create_skills(pool, batch).await {
            Ok(skills) => {
                result.discovered_skills.extend(skills);
            }
            Err(e) => {
                result.errors.push(format!("Failed to insert skills: {}", e));
            }
        }
    }

    Ok(result)
}

/// Discover skills in repositories
#[tauri::command]
pub async fn discover_skills(
    options: Option<DiscoveryOptions>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<DiscoveryResult, String> {
    let options = options.unwrap_or(DiscoveryOptions {
        repository_id: None,
        force: Some(false),
    });
    
    let force = options.force.unwrap_or(false);
    let mut result = DiscoveryResult {
        discovered_skills: Vec::new(),
        skipped_skills: Vec::new(),
        errors: Vec::new(),
    };
    
    // Get repositories to scan
    let repos = if let Some(repo_id) = &options.repository_id {
        match Repository::get_by_id(&pool, repo_id).await {
            Ok(Some(repo)) => vec![repo],
            Ok(None) => {
                return Err(format!("Repository not found: {}", repo_id));
            }
            Err(e) => {
                return Err(format!("Failed to get repository: {}", e));
            }
        }
    } else {
        match Repository::get_all(&pool).await {
            Ok(repos) => repos,
            Err(e) => {
                return Err(format!("Failed to get repositories: {}", e));
            }
        }
    };
    
    // Scan each repository
    for repo in repos {
        match scan_repository(&pool, &repo, force).await {
            Ok(repo_result) => {
                result.discovered_skills.extend(repo_result.discovered_skills);
                result.skipped_skills.extend(repo_result.skipped_skills);
                result.errors.extend(repo_result.errors);
            }
            Err(e) => {
                result.errors.push(format!("Failed to scan repository {}: {}", repo.name, e));
            }
        }
    }
    
    Ok(result)
}
