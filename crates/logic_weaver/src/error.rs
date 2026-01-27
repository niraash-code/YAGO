use thiserror::Error;

#[derive(Error, Debug)]
pub enum WeaverError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("INI error: {0}")]
    Ini(#[from] ini_forge::IniError),

    #[error("Logic error: {0}")]
    Logic(String),

    #[error("DXBC Parse error: {0}")]
    DxbcParse(String),

    #[error("Validation error: {0}")]
    ValidationError(String),
}

pub type Result<T> = std::result::Result<T, WeaverError>;
