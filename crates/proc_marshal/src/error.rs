use thiserror::Error;

#[derive(Error, Debug)]
pub enum MarshalError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Process not found: {0}")]
    ProcessNotFound(String),

    #[error("Memory patch error: {0}")]
    PatchError(String),

    #[error("Registry error: {0}")]
    RegistryError(String),

    #[error("Access denied: {0}")]
    AccessDenied(String),
}

pub type Result<T> = std::result::Result<T, MarshalError>;
