use anyhow::Result;
use std::path::Path;

/// Recursively copy a directory from source to destination
pub fn copy_dir(source: &Path, destination: &Path) -> Result<(), String> {
    // Create destination directory
    std::fs::create_dir_all(destination)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    // Iterate over entries in source directory
    for entry in
        std::fs::read_dir(source).map_err(|e| format!("Failed to read source directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let entry_path = entry.path();
        let dest_path = destination.join(entry.file_name());

        if entry_path.is_dir() {
            // Recursively copy subdirectories
            copy_dir(&entry_path, &dest_path)?;
        } else {
            // Copy files
            std::fs::copy(&entry_path, &dest_path)
                .map_err(|e| format!("Failed to copy file {}: {}", entry_path.display(), e))?;
        }
    }

    Ok(())
}

/// Recursively create hard links for a directory
pub fn hardlink_dir(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create directory {}: {}", dst.display(), e))?;
    for entry in std::fs::read_dir(src)
        .map_err(|e| format!("Failed to read directory {}: {}", src.display(), e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {}", e))?;
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to get file type: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            hardlink_dir(&src_path, &dst_path)?;
        } else if file_type.is_file() {
            std::fs::hard_link(&src_path, &dst_path)
                .map_err(|e| format!("Failed to hardlink {}: {}", src_path.display(), e))?;
        } else {
            std::fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy {}: {}", src_path.display(), e))?;
        }
    }
    Ok(())
}
