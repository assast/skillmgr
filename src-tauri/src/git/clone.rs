//! Git 克隆操作模块

use anyhow::{anyhow, Result};
use git2::{build::RepoBuilder, FetchOptions, RemoteCallbacks};
use std::path::Path;
use super::auth::get_auth;

/// 克隆Git仓库
pub async fn clone(url: &str, path: &str, branch: &str, auth_type: &str, auth_config: &str) -> Result<()> {
    let path = Path::new(path);
    
    if path.exists() {
        return Err(anyhow!("Repository already exists at: {}", path.display()));
    }

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, username_from_url, allowed_types| {
        get_auth(auth_type, auth_config, username_from_url, allowed_types)
    });

    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);

    RepoBuilder::new()
        .branch(branch)
        .fetch_options(fetch_options)
        .clone(url, path)?;

    Ok(())
}
