use thiserror::Error;

#[derive(Error, Debug)]
pub enum LibrarianError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Internal Engine error: {0}")]
    Fs(#[from] fs_engine::FsError),

    #[error("Mod not found: {0}")]
    ModNotFound(String),

    #[error("Profile error: {0}")]
    ProfileError(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("File imported as ReShade Preset: {0}")]
    ImportedPreset(String),
}

pub type Result<T> = std::result::Result<T, LibrarianError>;
