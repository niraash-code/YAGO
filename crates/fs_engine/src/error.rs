use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FsError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Trash error: {0}")]
    Trash(String),

    #[error("Image processing error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Symlink error: {0}")]
    Symlink(String),

    #[error("Path not found: {0}")]
    NotFound(PathBuf),

    #[error("Invalid path: {0}")]
    InvalidPath(PathBuf),

    #[error("Directory not empty: {0}")]
    DirectoryNotEmpty(PathBuf),
}

pub type Result<T> = std::result::Result<T, FsError>;
