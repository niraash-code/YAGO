use md5::{Digest, Md5};
use sophon_engine::orchestrator::{ChunkOrchestrator, OrchestratorEvent};
use sophon_engine::protocol::{
    FileChunkReference, ManifestCategory, ManifestFile, ManifestStats, SophonManifest,
};
use sophon_engine::SophonClient;
use tokio::sync::mpsc;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn create_test_manifest() -> SophonManifest {
    SophonManifest {
        manifest_id: "test_manifest".to_string(),
        game_id: "test_game".to_string(),
        version: "1.0.0".to_string(),
        categories: vec![ManifestCategory {
            id: "core".to_string(),
            name: "Core".to_string(),
        }],
        files: vec![ManifestFile {
            name: "output.txt".to_string(),
            size: 10,
            md5: "mock_hash".to_string(),
            category_id: Some("core".to_string()),
            chunks: vec![
                FileChunkReference {
                    chunk_id: "chunk_1".to_string(),
                    offset: 0,
                    size: 5,
                },
                FileChunkReference {
                    chunk_id: "chunk_2".to_string(),
                    offset: 5,
                    size: 5,
                },
            ],
        }],
        stats: ManifestStats {
            total_size: 10,
            chunk_count: 2,
            file_count: 1,
        },
    }
}

#[tokio::test]
async fn test_full_download_integration() {
    // 1. Setup Mock Server
    let mock_server = MockServer::start().await;

    // Chunk 1: "HELLO"
    let chunk1_data = b"HELLO";
    let mut hasher = Md5::new();
    hasher.update(chunk1_data);
    let chunk1_md5 = hasher.finalize();
    let chunk1_hex = hex::encode(chunk1_md5);

    // Chunk 2: "WORLD"
    let chunk2_data = b"WORLD";
    let mut hasher = Md5::new();
    hasher.update(chunk2_data);
    let chunk2_md5 = hasher.finalize();
    let chunk2_hex = hex::encode(chunk2_md5);

    Mock::given(method("GET"))
        .and(path(format!("/{}", chunk1_hex)))
        .respond_with(ResponseTemplate::new(200).set_body_bytes(chunk1_data.as_slice()))
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path(format!("/{}", chunk2_hex)))
        .respond_with(ResponseTemplate::new(200).set_body_bytes(chunk2_data.as_slice()))
        .mount(&mock_server)
        .await;

    // 2. Setup Manifest with correct hashes
    let mut manifest = create_test_manifest();
    // Update chunk IDs in manifest to match calculated hashes
    manifest.files[0].chunks[0].chunk_id = chunk1_hex.clone();
    manifest.files[0].chunks[1].chunk_id = chunk2_hex.clone();

    // 3. Setup Orchestrator
    let temp_dir = tempfile::tempdir().unwrap();
    let target_dir = temp_dir.path().to_path_buf();
    let client = SophonClient::new();
    let base_url = mock_server.uri();

    let orchestrator = ChunkOrchestrator::new(client, manifest, target_dir.clone(), base_url, 2);

    let (tx, mut rx) = mpsc::channel(100);

    // 4. Run
    let handle = tokio::spawn(async move {
        orchestrator.run(tx).await
    });

    // 5. Monitor
    let mut completed = false;
    let mut chunks_written = 0;

    while let Some(event) = rx.recv().await {
        match event {
            OrchestratorEvent::ChunkWritten { .. } => chunks_written += 1,
            OrchestratorEvent::Completed => completed = true,
            OrchestratorEvent::Error { error, .. } => panic!("Download failed: {}", error),
            _ => {}
        }
    }

    handle.await.unwrap().unwrap();

    assert!(completed);
    assert_eq!(chunks_written, 2);

    // 6. Verify File Content
    let file_path = target_dir.join("output.txt");
    assert!(file_path.exists());
    let content = std::fs::read_to_string(file_path).unwrap();
    assert_eq!(content, "HELLOWORLD");
}
