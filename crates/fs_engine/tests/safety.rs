use fs_engine::*;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use tempfile::tempdir;

#[test]
fn test_validate_exe() {
    let dir = tempdir().unwrap();
    let valid_exe = dir.path().join("valid.exe");
    let invalid_file = dir.path().join("invalid.txt");

    // Write MZ header
    let mut f = File::create(&valid_exe).unwrap();
    f.write_all(&[0x4D, 0x5A, 0x90, 0x00]).unwrap(); // MZ..

    // Write junk
    let mut f2 = File::create(&invalid_file).unwrap();
    f2.write_all(b"Just text").unwrap();

    assert!(ExeInspector::validate_exe(&valid_exe).unwrap());
    assert!(!ExeInspector::validate_exe(&invalid_file).unwrap());
    assert!(!ExeInspector::validate_exe(&dir.path().join("non_existent")).unwrap());
}

#[test]
fn test_validate_elf() {
    let dir = tempdir().unwrap();
    let elf_file = dir.path().join("test_elf");

    // Write ELF header
    let mut f = File::create(&elf_file).unwrap();
    f.write_all(&[0x7F, 0x45, 0x4C, 0x46]).unwrap(); // .ELF

    assert!(ExeInspector::validate_exe(&elf_file).unwrap());
}

#[test]
fn test_exe_inspector_get_version_stub() {
    let dir = tempdir().unwrap();
    let valid_exe = dir.path().join("valid.exe");

    let mut f = File::create(&valid_exe).unwrap();
    f.write_all(&[0x4D, 0x5A]).unwrap();

    let _ = ExeInspector::get_version(&valid_exe);
}

#[test]
fn test_move_to_trash_success() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("to_be_deleted.txt");
    std::fs::write(&file_path, "Bye bye").unwrap();

    assert!(file_path.exists());
    Safety::move_to_trash(&file_path).unwrap();
    assert!(!file_path.exists());
}

#[test]
fn test_move_to_trash_non_existent() {
    let path = Path::new("non_existent_file_for_trash_test");
    let result = Safety::move_to_trash(path);
    assert!(matches!(result, Err(FsError::NotFound(_))));
}

#[test]
fn test_sanitize_filenames_complex() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    // Setup complex directory structure
    fs::create_dir(root.join("UPPER")).unwrap();
    File::create(root.join("UPPER/File.TXT")).unwrap();
    File::create(root.join("RootFile.DDS")).unwrap();

    // Use a dot-prefixed folder that we explicitly want to skip
    let hidden_dir = root.join(".hidden_data");
    fs::create_dir(&hidden_dir).unwrap();
    File::create(hidden_dir.join("ShouldIgnore.TXT")).unwrap();

    let _ = Safety::sanitize_filenames(root).unwrap();

    assert!(root.join("upper").is_dir());
    assert!(root.join("upper/file.txt").is_file());
    assert!(root.join("rootfile.dds").is_file());
    // Hidden should be ignored
    assert!(root.join(".hidden_data/ShouldIgnore.TXT").exists());
}

#[tokio::test]
async fn test_atomic_import_success() {
    let dir = tempdir().unwrap();
    let staging = dir.path().join("staging");
    let library = dir.path().join("lib/mod_a");

    fs::create_dir_all(&staging).unwrap();
    File::create(staging.join("config.json")).unwrap();

    Safety::atomic_import(&staging, &library).await.unwrap();

    assert!(library.exists());
    assert!(library.join("config.json").exists());
    assert!(!staging.exists());
}

#[tokio::test]
#[cfg(unix)]
async fn test_atomic_import_read_only() {
    let dir = tempdir().unwrap();
    let staging = dir.path().join("staging");
    let lib_parent = dir.path().join("lib_ro");
    let library = lib_parent.join("mod");

    fs::create_dir_all(&staging).unwrap();
    fs::create_dir_all(&lib_parent).unwrap();

    // make parent read-only, so we can't write 'mod' into it
    use std::os::unix::fs::PermissionsExt;
    let mut perms = fs::metadata(&lib_parent).unwrap().permissions();
    perms.set_mode(0o555);
    fs::set_permissions(&lib_parent, perms).unwrap();

    let result = Safety::atomic_import(&staging, &library).await;
    assert!(result.is_err());
}

#[test]
fn test_copy_recursive_sync() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("src");
    let dst = dir.path().join("dst");

    fs::create_dir_all(src.join("a/b")).unwrap();
    File::create(src.join("a/b/file.txt")).unwrap();
    File::create(src.join("root.ini")).unwrap();

    Safety::copy_recursive_sync(&src, &dst).unwrap();

    assert!(dst.join("a/b/file.txt").is_file());
    assert!(dst.join("root.ini").is_file());
}

#[test]
fn test_get_dir_size() {
    let dir = tempdir().unwrap();
    let root = dir.path();

    let mut f1 = File::create(root.join("10bytes.txt")).unwrap();
    f1.write_all(&[0u8; 10]).unwrap();

    fs::create_dir(root.join("sub")).unwrap();
    let mut f2 = File::create(root.join("sub/5bytes.bin")).unwrap();
    f2.write_all(&[0u8; 5]).unwrap();

    let size = Safety::get_dir_size(root).unwrap();
    assert_eq!(size, 15);
}
