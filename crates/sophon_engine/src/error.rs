use thiserror::Error;

#[derive(Error, Debug)]
pub enum SophonError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Checksum mismatch for {0}")]
    ChecksumMismatch(String),

    #[error("Protocol error: {0}")]
    Protocol(String),

    #[error("API error: {0}")]
    Api(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Invalid data: {0}")]
    InvalidData(String),

    #[error("Download interrupted")]
    Interrupted,
}

pub type Result<T> = std::result::Result<T, SophonError>;
