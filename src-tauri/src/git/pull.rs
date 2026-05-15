//! Git 拉取操作模块

use anyhow::{anyhow, Result};
use git2::{FetchOptions, RemoteCallbacks, Repository};
use std::path::Path;
use super::auth::get_auth;

/// 拉取仓库最新代码
pub async fn pull(path: &str, branch: &str, auth_type: &str, auth_config: &str) -> Result<()> {
    let path = Path::new(path);
    let repo = Repository::open(path)?;
    
    let mut remote = repo.find_remote("origin")?;
    
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, username_from_url, allowed_types| {
        get_auth(auth_type, auth_config, username_from_url, allowed_types)
    });

    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);
    
    remote.fetch(&[branch], Some(&mut fetch_options), None)?;
    
    let fetch_head = repo.find_reference("FETCH_HEAD")?;
    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)?;
    
    let analysis = repo.merge_analysis(&[&fetch_commit])?;
    
    if analysis.0.is_up_to_date() {
        return Ok(());
    } else if analysis.0.is_fast_forward() {
        let mut reference = repo.find_reference(&format!("refs/heads/{}", branch))?;
        reference.set_target(fetch_commit.id(), "Fast forward merge")?;
        repo.set_head(&format!("refs/heads/{}", branch))?;
        repo.checkout_head(None)?;
    } else {
        return Err(anyhow!("Merge conflict detected, manual intervention required"));
    }

    Ok(())
}
