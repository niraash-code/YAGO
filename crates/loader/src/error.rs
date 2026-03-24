use thiserror::Error;

#[derive(Error, Debug)]
pub enum LoaderError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("FS Engine error: {0}")]
    Fs(#[from] vfs::FsError),

    #[error("INI error: {0}")]
    Ini(#[from] ini::IniError),

    #[error("Loader not found: {0}")]
    NotFound(String),

    #[error("Unsupported game context: {0}")]
    UnsupportedContext(String),
}

pub type Result<T> = std::result::Result<T, LoaderError>;
