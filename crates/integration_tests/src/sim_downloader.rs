use crate::context::SimulationContext;
use md5::{Digest, Md5};
use sophon_engine::SophonManifest;
use std::fs;

#[tokio::test]
async fn test_sim_downloader_and_verifier() {
    let ctx = SimulationContext::new().await;
    let download_dir = ctx.root.path().join("downloads");
    fs::create_dir(&download_dir).unwrap();

    // 1. Setup Mock Manifest
    let manifest = SophonManifest {
        game_id: "test_game".to_string(),
        version: "1.0.0".to_string(),
        chunks: vec![], // Empty for stub testing or we could mock server
    };

    let downloader = sophon_engine::Downloader::default();

    // 2. Mock Download (Since real reqwest needs internet/mock server)
    // We'll test the verifier logic integrated with a fake file
    let test_file = download_dir.join("game_data.bin");
    let content = b"Game Content";
    fs::write(&test_file, content).unwrap();

    let mut hasher = Md5::new();
    hasher.update(content);
    let expected_hash = format!("{:x}", hasher.finalize());

    // 3. Verify Integration
    let verifier_res = sophon_engine::Verifier::verify_file(&test_file, &expected_hash).await;
    assert!(verifier_res.is_ok());

    // 4. Test downloader callback flow (stub)
    let res = downloader.install(manifest, &download_dir, |_| {}).await;
    assert!(res.is_ok());
}

#[tokio::test]
async fn test_sim_verifier_mismatch() {
    let ctx = SimulationContext::new().await;
    let file = ctx.staging_root.join("bad.bin");
    fs::write(&file, "corrupt").unwrap();

    // Expected hash for "good" (not "corrupt")
    let res = sophon_engine::Verifier::verify_file(&file, "deadbeef").await;
    assert!(res.is_err());
}
