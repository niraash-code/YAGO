use fs_engine::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_make_symlink_non_existent_source() {
    let dir = tempdir().unwrap();
    let source = dir.path().join("ghost_file.txt");
    let link = dir.path().join("link.txt");

    let result = make_symlink(&source, &link);
    assert!(result.is_ok());
    assert!(fs::symlink_metadata(&link)
        .unwrap()
        .file_type()
        .is_symlink());
}

#[test]
fn test_extract_corrupt_zip() {
    let dir = tempdir().unwrap();
    let corrupt_zip = dir.path().join("bad.zip");
    let output = dir.path().join("out");

    fs::write(&corrupt_zip, b"not a zip file").unwrap();

    let result = extract_and_sanitize(&corrupt_zip, &output);
    assert!(result.is_err());
}

#[test]
#[cfg(unix)]
fn test_sanitize_read_only_dir() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempdir().unwrap();
    let root = dir.path().join("ro_root");
    fs::create_dir(&root).unwrap();

    let file = root.join("FILE.TXT");
    fs::write(&file, "data").unwrap();

    // Make directory read-only
    let mut perms = fs::metadata(&root).unwrap().permissions();
    perms.set_mode(0o555);
    fs::set_permissions(&root, perms).unwrap();

    // Sanitize should fail if it tries to rename files in a RO directory
    let result = Safety::sanitize_filenames(&root);
    assert!(result.is_err());

    // Restore permissions for cleanup
    let mut perms = fs::metadata(&root).unwrap().permissions();
    perms.set_mode(0o755);
    fs::set_permissions(&root, perms).unwrap();
}
