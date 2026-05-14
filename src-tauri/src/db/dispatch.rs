use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TEXT")]
#[sqlx(rename_all = "snake_case")]
pub enum DispatchMethod {
    Symlink,
    Copy,
    Hardlink,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TEXT")]
#[sqlx(rename_all = "snake_case")]
pub enum SyncStatus {
    Synced,
    Outdated,
    Conflict,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Dispatch {
    pub id: String,
    pub target_dir: String,
    pub skill_id: String,
    pub method: DispatchMethod,
    pub source_path: String,
    pub dest_path: String,
    pub dispatched_at: DateTime<Utc>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub sync_status: SyncStatus,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Dispatch {
    /// Create dispatch table with proper schema and foreign key constraint
    pub async fn create_table(pool: &SqlitePool) -> Result<()> {
        sqlx::query!(
            r#"
            CREATE TABLE IF NOT EXISTS dispatch (
                id TEXT PRIMARY KEY,
                target_dir TEXT NOT NULL,
                skill_id TEXT NOT NULL,
                method TEXT NOT NULL,
                source_path TEXT NOT NULL,
                dest_path TEXT NOT NULL,
                dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_synced_at DATETIME,
                sync_status TEXT NOT NULL,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Create a new dispatch rule
    pub async fn create(
        pool: &SqlitePool,
        target_dir: String,
        skill_id: String,
        method: DispatchMethod,
        source_path: String,
        dest_path: String,
        sync_status: SyncStatus,
        error_message: Option<String>,
        last_synced_at: Option<DateTime<Utc>>,
    ) -> Result<Self> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let dispatch = sqlx::query_as!(
            Dispatch,
            r#"
            INSERT INTO dispatch (
                id, target_dir, skill_id, method, source_path, dest_path,
                dispatched_at, last_synced_at, sync_status, error_message,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
            id,
            target_dir,
            skill_id,
            method,
            source_path,
            dest_path,
            now,
            last_synced_at,
            sync_status,
            error_message,
            now,
            now
        )
        .fetch_one(pool)
        .await?;

        Ok(dispatch)
    }
    
    /// Get all dispatch rules
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>> {
        let dispatches = sqlx::query_as!(
            Dispatch,
            r#"SELECT * FROM dispatch ORDER BY created_at DESC"#
        )
        .fetch_all(pool)
        .await?;
        Ok(dispatches)
    }
    
    /// Get dispatch rules by skill id
    pub async fn get_by_skill_id(pool: &SqlitePool, skill_id: &str) -> Result<Vec<Self>> {
        let dispatches = sqlx::query_as!(
            Dispatch,
            r#"SELECT * FROM dispatch WHERE skill_id = ? ORDER BY created_at DESC"#,
            skill_id
        )
        .fetch_all(pool)
        .await?;
        Ok(dispatches)
    }

    /// Get dispatch rules by sync status
    pub async fn get_by_sync_status(pool: &SqlitePool, status: SyncStatus) -> Result<Vec<Self>> {
        let dispatches = sqlx::query_as!(
            Dispatch,
            r#"SELECT * FROM dispatch WHERE sync_status = ? ORDER BY created_at DESC"#,
            status
        )
        .fetch_all(pool)
        .await?;
        Ok(dispatches)
    }
    
    /// Get dispatch by id
    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Self>> {
        let dispatch = sqlx::query_as!(
            Dispatch,
            r#"SELECT * FROM dispatch WHERE id = ?"#,
            id
        )
        .fetch_optional(pool)
        .await?;
        Ok(dispatch)
    }
    
    /// Update dispatch rule
    pub async fn update(
        &self,
        pool: &SqlitePool,
        target_dir: Option<String>,
        skill_id: Option<String>,
        method: Option<DispatchMethod>,
        source_path: Option<String>,
        dest_path: Option<String>,
        last_synced_at: Option<DateTime<Utc>>,
        sync_status: Option<SyncStatus>,
        error_message: Option<Option<String>>,
    ) -> Result<Self> {
        let now = Utc::now();

        let target_dir = target_dir.as_ref().unwrap_or(&self.target_dir);
        let skill_id = skill_id.as_ref().unwrap_or(&self.skill_id);
        let method = method.as_ref().unwrap_or(&self.method);
        let source_path = source_path.as_ref().unwrap_or(&self.source_path);
        let dest_path = dest_path.as_ref().unwrap_or(&self.dest_path);
        let last_synced_at = last_synced_at.or(self.last_synced_at);
        let sync_status = sync_status.as_ref().unwrap_or(&self.sync_status);
        let error_message = error_message.unwrap_or_else(|| self.error_message.clone());

        let updated = sqlx::query_as!(
            Dispatch,
            r#"
            UPDATE dispatch
            SET
                target_dir = ?,
                skill_id = ?,
                method = ?,
                source_path = ?,
                dest_path = ?,
                last_synced_at = ?,
                sync_status = ?,
                error_message = ?,
                updated_at = ?
            WHERE id = ?
            RETURNING *
            "#,
            target_dir,
            skill_id,
            method,
            source_path,
            dest_path,
            last_synced_at,
            sync_status,
            error_message,
            now,
            self.id
        )
        .fetch_one(pool)
        .await?;

        Ok(updated)
    }
    
    /// Delete dispatch rule
    pub async fn delete(&self, pool: &SqlitePool) -> Result<()> {
        sqlx::query!(
            r#"DELETE FROM dispatch WHERE id = ?"#,
            self.id
        )
        .execute(pool)
        .await?;
        Ok(())
    }
}
