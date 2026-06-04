//! Git 克隆操作模块

use anyhow::{anyhow, Result};
use git2::{build::RepoBuilder, FetchOptions, RemoteCallbacks};
use std::path::Path;
use super::auth::get_auth;

fn do_clone(url: &str, path: &Path, branch: &str, auth_type: &str, auth_config: &str) -> Result<()> {
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

pub async fn clone(url: &str, path: &str, branch: &str, auth_type: &str, auth_config: &str) -> Result<()> {
    let path = Path::new(path);

    if path.exists() {
        return Err(anyhow!("Repository already exists at: {}", path.display()));
    }

    let url = url.to_string();
    let branch = branch.to_string();
    let auth_type = auth_type.to_string();
    let auth_config = auth_config.to_string();
    let path_buf = path.to_path_buf();

    tokio::task::spawn_blocking(move || do_clone(&url, &path_buf, &branch, &auth_type, &auth_config))
        .await
        .map_err(|e| anyhow::anyhow!("Clone task panicked: {}", e))?
}
