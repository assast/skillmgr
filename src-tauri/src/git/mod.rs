//! Git 操作模块
//! 提供仓库克隆、拉取、认证等功能

pub mod auth;
pub mod clone;
pub mod pull;

use crate::db::repository::Repository;
use anyhow::Result;

/// 同步单个仓库（拉取最新代码）
pub async fn sync_repository(repo: &Repository) -> Result<()> {
    pull::pull(
        repo.local_path.as_str(), 
        repo.branch.as_deref().unwrap_or("main"), 
        repo.auth_type.as_deref().unwrap_or("none"), 
        repo.auth_config.as_deref().unwrap_or("{}")
    ).await
}

/// 克隆新仓库
pub async fn clone_repository(url: &str, path: &str, branch: &str, auth_type: &str, auth_config: &str) -> Result<()> {
    clone::clone(url, path, branch, auth_type, auth_config).await
}
