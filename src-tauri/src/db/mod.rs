pub mod schema;
pub mod repository;
pub mod skill;
pub mod dispatch;
pub mod config;

use tauri::{AppHandle, Manager};
use sqlx::{SqlitePool, Executor};
use std::path::PathBuf;

/// Get database path
pub fn get_db_path(app_handle: &AppHandle) -> PathBuf {
    let base_path = app_handle.path().data_dir().unwrap_or_else(|_| PathBuf::from("."));
    base_path.join(".skillvault").join("vault.db")
}

/// Initialize database with schema
pub async fn init_db(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get SQL pool
    let pool = app_handle.state::<SqlitePool>();
    
    // Execute initialization SQL
    pool.execute(schema::INIT_SQL).await?;
    
    Ok(())
}
