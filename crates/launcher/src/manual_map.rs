use crate::error::{MarshalError, Result};
use std::path::Path;

#[allow(dead_code)]
/// # Safety
/// This function is currently a stub and always returns an error.
/// When implemented, it will perform manual mapping which involves
/// direct memory manipulation in a remote process.
pub unsafe fn inject_manual(_pid: u32, _dll_path: &Path) -> Result<()> {
    Err(MarshalError::Io(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "Manual Mapping is not yet implemented",
    )))
}
