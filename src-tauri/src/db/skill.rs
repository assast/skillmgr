use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub repository_id: String,
    pub path: String,
    pub version: Option<String>,
    pub author: Option<String>,
    pub r#type: String,
    pub source_type: String,
    pub local_path: String,
    pub usage: Option<String>,
    pub tags: Option<String>,
    pub dependencies: Option<String>,
    pub llm_analyzed: bool,
    pub quality_score: Option<i32>,
    pub status: String,
    pub first_discovered_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Skill {
    /// Create a new skill
    pub async fn create(
        pool: &SqlitePool,
        name: &str,
        description: Option<&str>,
        repository_id: &str,
        path: &str,
        version: Option<&str>,
        author: Option<&str>,
        r#type: &str,
        source_type: &str,
        local_path: &str,
        status: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let skill = sqlx::query_as::<_, Skill>(
            "INSERT INTO skills (name, description, repository_id, path, version, author, type, source_type, local_path, llm_analyzed, status) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, false, ?10) 
             RETURNING *"
        )
        .bind(name)
        .bind(description)
        .bind(repository_id)
        .bind(path)
        .bind(version)
        .bind(author)
        .bind(r#type)
        .bind(source_type)
        .bind(local_path)
        .bind(status)
        .fetch_one(pool)
        .await?;
        
        Ok(skill)
    }
    
    /// Get all skills
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>, Box<dyn std::error::Error>> {
        let skills = sqlx::query_as::<_, Skill>("SELECT * FROM skills")
            .fetch_all(pool)
            .await?;
        Ok(skills)
    }
    
    /// Get skills by repository id
    pub async fn get_by_repository_id(pool: &SqlitePool, repo_id: &str) -> Result<Vec<Self>, Box<dyn std::error::Error>> {
        let skills = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE repository_id = ?1")
            .bind(repo_id)
            .fetch_all(pool)
            .await?;
        Ok(skills)
    }
    
    /// Get skill by id
    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Self>, Box<dyn std::error::Error>> {
        let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = ?1")
            .bind(id)
            .fetch_optional(pool)
            .await?;
        Ok(skill)
    }
    
    /// Update skill
    pub async fn update(
        &self,
        pool: &SqlitePool,
        name: Option<&str>,
        description: Option<&str>,
        path: Option<&str>,
        version: Option<&str>,
        author: Option<&str>,
        r#type: Option<&str>,
        usage: Option<&str>,
        tags: Option<&str>,
        dependencies: Option<&str>,
        llm_analyzed: Option<bool>,
        quality_score: Option<i32>,
        status: Option<&str>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "UPDATE skills SET 
                name = COALESCE(?1, name), 
                description = COALESCE(?2, description), 
                path = COALESCE(?3, path), 
                version = COALESCE(?4, version), 
                author = COALESCE(?5, author),
                type = COALESCE(?6, type),
                usage = COALESCE(?7, usage),
                tags = COALESCE(?8, tags),
                dependencies = COALESCE(?9, dependencies),
                llm_analyzed = COALESCE(?10, llm_analyzed),
                quality_score = COALESCE(?11, quality_score),
                status = COALESCE(?12, status),
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?13"
        )
        .bind(name)
        .bind(description)
        .bind(path)
        .bind(version)
        .bind(author)
        .bind(r#type)
        .bind(usage)
        .bind(tags)
        .bind(dependencies)
        .bind(llm_analyzed)
        .bind(quality_score)
        .bind(status)
        .bind(&self.id)
        .execute(pool)
        .await?;
        Ok(())
    }
    
    /// Delete skill
    pub async fn delete(&self, pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM skills WHERE id = ?1")
            .bind(&self.id)
            .execute(pool)
            .await?;
        Ok(())
    }
}
