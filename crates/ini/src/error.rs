use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum IniError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Parse error at {0}")]
    Parse(String),

    #[error("Recursive include depth exceeded at {0}")]
    MaxDepthExceeded(PathBuf),

    #[error("Include file not found: {0}")]
    IncludeNotFound(PathBuf),
}

pub type Result<T> = std::result::Result<T, IniError>;
