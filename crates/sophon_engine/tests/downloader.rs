use sophon_engine::*;
use tempfile::tempdir;

#[tokio::test]
async fn test_downloader_install_callback() {
    let dir = tempdir().unwrap();
    let downloader = Downloader::default();

    let manifest = SophonManifest {
        game_id: "test".to_string(),
        version: "1.0".to_string(),
        chunks: vec![],
    };

    let res = downloader
        .install(manifest, dir.path(), |p| {
            println!("Progress: {}%", p.overall_progress);
        })
        .await;

    assert!(res.is_ok());
}

#[tokio::test]
async fn test_downloader_optional_filtering() {
    let dir = tempdir().unwrap();
    let downloader = Downloader::default();

    let manifest_opt = SophonManifest {
        game_id: "test".to_string(),
        version: "1.0".to_string(),
        chunks: vec![ChunkInfo {
            id: "opt".to_string(),
            path: "opt.bin".to_string(),
            size: 100,
            md5: "abc".to_string(),
            is_optional: true,
        }],
    };

    let res_opt = downloader.install(manifest_opt, dir.path(), |_| {}).await;
    assert!(res_opt.is_ok());
}
