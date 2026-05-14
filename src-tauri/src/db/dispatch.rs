use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Dispatch {
    pub id: String,
    pub target_dir: String,
    pub skill_id: String,
    pub method: String,
    pub source_path: String,
    pub dest_path: String,
    pub dispatched_at: Option<DateTime<Utc>>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub sync_status: String,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Dispatch {
    /// Create a new dispatch rule
    pub async fn create(
        pool: &SqlitePool,
        target_dir: &str,
        skill_id: &str,
        method: &str,
        source_path: &str,
        dest_path: &str,
        sync_status: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let dispatch = sqlx::query_as::<_, Dispatch>(
            "INSERT INTO dispatch (target_dir, skill_id, method, source_path, dest_path, sync_status) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6) 
             RETURNING *"
        )
        .bind(target_dir)
        .bind(skill_id)
        .bind(method)
        .bind(source_path)
        .bind(dest_path)
        .bind(sync_status)
        .fetch_one(pool)
        .await?;
        
        Ok(dispatch)
    }
    
    /// Get all dispatch rules
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>, Box<dyn std::error::Error>> {
        let dispatches = sqlx::query_as::<_, Dispatch>("SELECT * FROM dispatch")
            .fetch_all(pool)
            .await?;
        Ok(dispatches)
    }
    
    /// Get dispatch rules by skill id
    pub async fn get_by_skill_id(pool: &SqlitePool, skill_id: &str) -> Result<Vec<Self>, Box<dyn std::error::Error>> {
        let dispatches = sqlx::query_as::<_, Dispatch>("SELECT * FROM dispatch WHERE skill_id = ?1")
            .bind(skill_id)
            .fetch_all(pool)
            .await?;
        Ok(dispatches)
    }
    
    /// Get dispatch by id
    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Self>, Box<dyn std::error::Error>> {
        let dispatch = sqlx::query_as::<_, Dispatch>("SELECT * FROM dispatch WHERE id = ?1")
            .bind(id)
            .fetch_optional(pool)
            .await?;
        Ok(dispatch)
    }
    
    /// Update dispatch rule
    pub async fn update(
        &self,
        pool: &SqlitePool,
        target_dir: Option<&str>,
        method: Option<&str>,
        source_path: Option<&str>,
        dest_path: Option<&str>,
        sync_status: Option<&str>,
        error_message: Option<&str>,
        last_synced_at: Option<DateTime<Utc>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "UPDATE dispatch SET 
                target_dir = COALESCE(?1, target_dir), 
                method = COALESCE(?2, method), 
                source_path = COALESCE(?3, source_path), 
                dest_path = COALESCE(?4, dest_path),
                sync_status = COALESCE(?5, sync_status),
                error_message = COALESCE(?6, error_message),
                last_synced_at = COALESCE(?7, last_synced_at),
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?8"
        )
        .bind(target_dir)
        .bind(method)
        .bind(source_path)
        .bind(dest_path)
        .bind(sync_status)
        .bind(error_message)
        .bind(last_synced_at)
        .bind(&self.id)
        .execute(pool)
        .await?;
        Ok(())
    }
    
    /// Delete dispatch rule
    pub async fn delete(&self, pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM dispatch WHERE id = ?1")
            .bind(&self.id)
            .execute(pool)
            .await?;
        Ok(())
    }
}
