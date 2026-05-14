// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod db;
mod config;
mod git;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 添加仓库
#[tauri::command]
async fn add_repository(
    name: &str,
    url: Option<&str>,
    path: &str,
    source_type: &str,
    local_path: &str,
    auth_type: Option<&str>,
    auth_config: Option<&str>,
    branch: Option<&str>,
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<db::repository::Repository, String> {
    let mut repo = db::repository::Repository::create(
        &pool,
        name,
        url,
        path,
        source_type,
        local_path,
        "pending",
    )
    .await
    .map_err(|e| e.to_string())?;
    
    // 如果是远程仓库，执行克隆
    if source_type == "git" && url.is_some() {
        match git::clone_repository(
            url.unwrap(),
            local_path,
            branch.unwrap_or("main"),
            auth_type.unwrap_or("none"),
            auth_config.unwrap_or("{}"),
        ).await {
            Ok(_) => {
                repo.update(&pool, None, None, None, None, None, Some("synced"), None).await.map_err(|e| e.to_string())?;
            }
            Err(e) => {
                repo.update(&pool, None, None, None, None, None, Some("error"), Some(&e.to_string())).await.map_err(|e| e.to_string())?;
                return Err(e.to_string());
            }
        }
    }
    
    Ok(repo)
}

/// 获取所有仓库
#[tauri::command]
async fn list_repositories(
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<Vec<db::repository::Repository>, String> {
    db::repository::Repository::get_all(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// 获取单个仓库
#[tauri::command]
async fn get_repository(
    id: &str,
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<Option<db::repository::Repository>, String> {
    db::repository::Repository::get_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())
}

/// 删除仓库
#[tauri::command]
async fn delete_repository(
    id: &str,
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<(), String> {
    let repo = db::repository::Repository::get_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())?;
    
    if let Some(repo) = repo {
        repo.delete(&pool).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// 同步单个仓库
#[tauri::command]
async fn sync_repository(
    id: &str,
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<db::repository::Repository, String> {
    let mut repo = db::repository::Repository::get_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;
    
    if repo.source_type == "git" && repo.url.is_some() {
        repo.update(&pool, None, None, None, None, None, Some("syncing"), None).await.map_err(|e| e.to_string())?;
        
        match git::sync_repository(&repo).await {
            Ok(_) => {
                repo.update(&pool, None, None, None, None, None, Some("synced"), None).await.map_err(|e| e.to_string())?;
            }
            Err(e) => {
                repo.update(&pool, None, None, None, None, None, Some("error"), Some(&e.to_string())).await.map_err(|e| e.to_string())?;
                return Err(e.to_string());
            }
        }
    }
    
    Ok(repo)
}

/// 同步所有仓库
#[tauri::command]
async fn sync_all_repositories(
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<Vec<db::repository::Repository>, String> {
    let repos = db::repository::Repository::get_all(&pool)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut updated_repos = Vec::new();
    
    for mut repo in repos {
        if repo.source_type == "git" && repo.url.is_some() {
            let _ = repo.update(&pool, None, None, None, None, None, Some("syncing"), None).await;
            
            match git::sync_repository(&repo).await {
                Ok(_) => {
                    let _ = repo.update(&pool, None, None, None, None, None, Some("synced"), None).await;
                }
                Err(e) => {
                    let _ = repo.update(&pool, None, None, None, None, None, Some("error"), Some(&e.to_string())).await;
                }
            }
        }
        updated_repos.push(repo);
    }
    
    Ok(updated_repos)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Create database parent directory if not exists
            let db_path = db::get_db_path(&app.handle());
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            
            // Initialize SQLite pool
            let db_url = format!("sqlite://{}", db_path.to_string_lossy());
            let pool = tauri::async_runtime::block_on(async move {
                sqlx::sqlite::SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&db_url)
                    .await
            })?;
            
            // Add pool to app state
            app.manage(pool.clone());
            
            // Initialize database schema
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = db::init_db(&app_handle).await {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            config::base_path::get_base_path_command,
            config::base_path::set_base_path_command,
            config::base_path::init_base_directory_command,
            add_repository,
            list_repositories,
            get_repository,
            delete_repository,
            sync_repository,
            sync_all_repositories
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
