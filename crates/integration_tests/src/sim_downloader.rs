use md5::{Digest, Md5};
use sophon_engine::{ManifestStats, SophonManifest, Verifier};
use std::fs;
use tempfile::tempdir;

#[tokio::test]
async fn test_sim_verifier_integration() {
    let dir = tempdir().unwrap();
    let download_dir = dir.path().join("downloads");
    fs::create_dir(&download_dir).unwrap();

    // 1. Setup Fake File
    let test_file = download_dir.join("game_data.bin");
    let content = b"Game Content";
    fs::write(&test_file, content).unwrap();

    let mut hasher = Md5::new();
    hasher.update(content);
    let expected_hash = format!("{:x}", hasher.finalize());

    // 2. Verify Integration
    let verifier_res = Verifier::verify_file(&test_file, &expected_hash).await;
    assert!(verifier_res.is_ok());
}

#[tokio::test]
async fn test_sim_verifier_mismatch() {
    let dir = tempdir().unwrap();
    let file = dir.path().join("bad.bin");
    fs::write(&file, "corrupt").unwrap();

    // Expected hash for "good" (not "corrupt")
    let res = Verifier::verify_file(&file, "deadbeef").await;
    assert!(res.is_err());
}

#[test]
fn test_sim_manifest_structure() {
    // Sanity check that we can construct the manifest structure from external crate
    let _manifest = SophonManifest {
        manifest_id: "test".into(),
        game_id: "test".into(),
        version: "1".into(),
        categories: vec![],
        files: vec![],
        stats: ManifestStats {
            total_size: 0,
            chunk_count: 0,
            file_count: 0,
        },
        diff_packages: vec![],
    };
}
