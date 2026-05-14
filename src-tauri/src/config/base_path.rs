use std::path::Path;
use sqlx::SqlitePool;
use crate::db::config::Config;
use std::fs;

/// Config key for base path
const BASE_PATH_CONFIG_KEY: &str = "base_path";

/// Initialize base directory structure
/// Creates all required subdirectories: github/, private-git/, local/, .skillvault/
pub async fn init_base_directory(path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let base_path = Path::new(path);
    
    // Create main base directory if not exists
    fs::create_dir_all(base_path)?;
    
    // Create required subdirectories
    let subdirs = ["github", "private-git", "local", ".skillvault"];
    
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
    // Initialize directory structure first
    init_base_directory(path).await?;
    
    // Save to config
    Config::set(pool, BASE_PATH_CONFIG_KEY, path).await?;
    
    Ok(())
}

/// Tauri command to get base path
#[tauri::command]
pub async fn get_base_path_command(pool: tauri::State<'_, SqlitePool>) -> Result<Option<String>, String> {
    get_base_path(&pool).await.map_err(|e| e.to_string())
}

/// Tauri command to set base path
#[tauri::command]
pub async fn set_base_path_command(pool: tauri::State<'_, SqlitePool>, path: &str) -> Result<(), String> {
    set_base_path(&pool, path).await.map_err(|e| e.to_string())
}

/// Tauri command to initialize base directory
#[tauri::command]
pub async fn init_base_directory_command(path: &str) -> Result<(), String> {
    init_base_directory(path).await.map_err(|e| e.to_string())
}
