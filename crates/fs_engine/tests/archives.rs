use fs_engine::*;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use tempfile::tempdir;

#[test]
fn test_extract_archive_zip() {
    let dir = tempdir().unwrap();
    let zip_path = dir.path().join("test.zip");
    let extract_dir = dir.path().join("extracted");

    // Create a real zip file
    let file = File::create(&zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    zip.start_file("test.txt", options).unwrap();
    zip.write_all(b"Hello Zip").unwrap();
    zip.finish().unwrap();

    Safety::extract_archive(&zip_path, &extract_dir).unwrap();

    assert!(extract_dir.join("test.txt").exists());
    let content = std::fs::read_to_string(extract_dir.join("test.txt")).unwrap();
    assert_eq!(content, "Hello Zip");
}

#[test]
fn test_is_allowed() {
    // Deny List
    assert!(!archive::is_allowed("d3dx.ini"));
    assert!(!archive::is_allowed("D3DX.INI")); // Case insensitive
    assert!(!archive::is_allowed("d3d11.dll"));
    assert!(!archive::is_allowed("dxgi.dll"));
    assert!(!archive::is_allowed("uninstall.exe"));
    assert!(!archive::is_allowed("malware.exe"));
    assert!(!archive::is_allowed("script.vbs")); // Not allowed extension
    assert!(!archive::is_allowed("debug.log"));

    // Allow List
    assert!(archive::is_allowed("mod.json"));
    assert!(archive::is_allowed("config.ini"));
    assert!(archive::is_allowed("texture.dds"));
    assert!(archive::is_allowed("model.ib"));
    assert!(archive::is_allowed("model.vb"));
    assert!(archive::is_allowed("shader.txt"));
    assert!(archive::is_allowed("image.png"));
    assert!(archive::is_allowed("image.jpg"));
    assert!(archive::is_allowed("data.json"));
    assert!(archive::is_allowed("sub/folder/file.ini")); // Paths should work
}

#[test]
fn test_sanitize_path() {
    let base = Path::new("/base");

    // Normal
    assert_eq!(
        archive::sanitize_path(base, "file.txt").unwrap(),
        base.join("file.txt")
    );
    assert_eq!(
        archive::sanitize_path(base, "dir/file.txt").unwrap(),
        base.join("dir/file.txt")
    );

    // Traversal attempts (Strip '..' components)
    assert_eq!(
        archive::sanitize_path(base, "../file.txt").unwrap(),
        base.join("file.txt")
    );
    assert_eq!(
        archive::sanitize_path(base, "../../file.txt").unwrap(),
        base.join("file.txt")
    );

    // Absolute paths (should be treated as relative components)
    assert_eq!(
        archive::sanitize_path(base, "/etc/passwd").unwrap(),
        base.join("etc/passwd")
    );
}

#[test]
fn test_malware_exclusion() {
    let dir = tempfile::tempdir().unwrap();
    let archive_path = dir.path().join("test.zip");
    let dest_path = dir.path().join("extracted");

    // Create Mock Zip Properly
    {
        let file = fs::File::create(&archive_path).unwrap();
        let mut zw = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);

        zw.start_file("malware.exe", options).unwrap();
        std::io::copy(&mut std::io::Cursor::new(b"evil code"), &mut zw).unwrap();

        zw.start_file("character.ini", options).unwrap();
        std::io::copy(&mut std::io::Cursor::new(b"[TextureOverride]"), &mut zw).unwrap();

        zw.finish().unwrap();
    }

    // Run Extraction
    let report = archive::extract_and_sanitize(&archive_path, &dest_path).unwrap();

    // Assertions
    assert!(dest_path.join("character.ini").exists());
    assert!(!dest_path.join("malware.exe").exists());
    assert!(report.files_ignored.contains(&"malware.exe".to_string()));
}

#[test]
fn test_extract_and_sanitize_with_root_strip() {
    let dir = tempdir().unwrap();
    let zip_path = dir.path().join("root_mod.zip");
    let dest_path = dir.path().join("extracted");

    // Create Zip with root "AwesomeMod/"
    let file = fs::File::create(&zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default();

    zip.add_directory("AwesomeMod/", options).unwrap();
    zip.start_file("AwesomeMod/mod.json", options).unwrap();
    std::io::copy(&mut std::io::Cursor::new(b"{}"), &mut zip).unwrap();
    zip.start_file("AwesomeMod/config.ini", options).unwrap();
    std::io::copy(&mut std::io::Cursor::new(b"key=val"), &mut zip).unwrap();
    zip.finish().unwrap();

    let report = archive::extract_and_sanitize(&zip_path, &dest_path).unwrap();
    assert!(report.has_mod_json);
    assert!(dest_path.join("mod.json").exists());
    assert!(dest_path.join("config.ini").exists());
    assert!(!dest_path.join("AwesomeMod").exists());
}

#[test]
fn test_extract_targz() {
    let dir = tempdir().unwrap();
    let tar_path = dir.path().join("test.tar.gz");
    let dest_path = dir.path().join("extracted_tar");

    // Create tar.gz
    let file = fs::File::create(&tar_path).unwrap();
    let enc = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut tar = tar::Builder::new(enc);

    let mut header = tar::Header::new_gnu();
    header.set_path("hello.txt").unwrap();
    header.set_size(11);
    header.set_cksum();
    tar.append(&header, &b"tar content"[..]).unwrap();
    tar.finish().unwrap();
    drop(tar); // Ensure everything is flushed/written

    archive::extract_targz(&tar_path, &dest_path).unwrap();

    let content = fs::read_to_string(dest_path.join("hello.txt")).unwrap();
    assert_eq!(content, "tar content");
}
