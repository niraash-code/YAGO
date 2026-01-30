use md5::{Digest, Md5};
use sophon_engine::orchestrator::{ChunkOrchestrator, OrchestratorEvent};
use sophon_engine::protocol::{
    FileChunkReference, ManifestCategory, ManifestFile, ManifestStats, SophonManifest,
};
use sophon_engine::SophonClient;
use std::time::Duration;
use tokio::sync::mpsc;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn create_test_manifest() -> SophonManifest {
    SophonManifest {
        manifest_id: "meticulous_manifest".to_string(),
        game_id: "test_game".to_string(),
        version: "1.0.0".to_string(),
        categories: vec![ManifestCategory {
            id: "core".to_string(),
            name: "Core".to_string(),
            size: 20,
            is_required: true,
        }],
        files: vec![ManifestFile {
            name: "meticulous.txt".to_string(),
            size: 20,
            md5: "mock_hash".to_string(),
            category_id: Some("core".to_string()),
            chunks: vec![
                FileChunkReference {
                    chunk_id: "chunk_1".to_string(),
                    chunk_name: "chunk_1".to_string(),
                    offset: 0,
                    size: 10,
                },
                FileChunkReference {
                    chunk_id: "chunk_2".to_string(),
                    chunk_name: "chunk_2".to_string(),
                    offset: 10,
                    size: 10,
                },
            ],
        }],
        stats: ManifestStats {
            total_size: 20,
            chunk_count: 2,
            file_count: 1,
        },
        diff_packages: vec![],
    }
}

#[tokio::test]
async fn test_orchestrator_pause_resume_simulation() {
    let mock_server = MockServer::start().await;

    let chunk1_data = b"0123456789";
    let chunk1_hex = hex::encode(Md5::digest(chunk1_data));
    let chunk2_data = b"abcdefghij";
    let chunk2_hex = hex::encode(Md5::digest(chunk2_data));

    Mock::given(method("GET"))
        .and(path(format!("/{}", chunk1_hex)))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_bytes(chunk1_data.as_slice())
                .set_delay(Duration::from_millis(100)),
        )
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path(format!("/{}", chunk2_hex)))
        .respond_with(ResponseTemplate::new(200).set_body_bytes(chunk2_data.as_slice()))
        .mount(&mock_server)
        .await;

    let mut manifest = create_test_manifest();
    manifest.files[0].chunks[0].chunk_id = chunk1_hex.clone();
    manifest.files[0].chunks[0].chunk_name = chunk1_hex.clone();
    manifest.files[0].chunks[1].chunk_id = chunk2_hex.clone();
    manifest.files[0].chunks[1].chunk_name = chunk2_hex.clone();

    let temp_dir = tempfile::tempdir().unwrap();
    let client = SophonClient::new();

    let (tx_pause, rx_pause) = tokio::sync::watch::channel(false);

    let orchestrator = ChunkOrchestrator::new(
        "test".into(),
        client,
        vec![manifest],
        temp_dir.path().to_path_buf(),
        mock_server.uri(),
        1,
    );

    let (tx, mut rx) = mpsc::channel(100);

    let handle = tokio::spawn(async move { orchestrator.run(tx, rx_pause).await });

    // Wait for first chunk to be written
    let mut chunks_written = 0;
    while let Some(event) = rx.recv().await {
        if matches!(event, OrchestratorEvent::ChunkWritten { .. }) {
            chunks_written += 1;
            // Pause after first chunk
            let _ = tx_pause.send(true);
            break;
        }
    }

    assert_eq!(chunks_written, 1);

    // Resume after a short delay
    tokio::time::sleep(Duration::from_millis(200)).await;
    let _ = tx_pause.send(false);

    while let Some(event) = rx.recv().await {
        if matches!(event, OrchestratorEvent::ChunkWritten { .. }) {
            chunks_written += 1;
        }
        if matches!(event, OrchestratorEvent::Completed) {
            break;
        }
    }

    assert_eq!(chunks_written, 2);
    handle.await.unwrap().unwrap();

    let content = std::fs::read_to_string(temp_dir.path().join("meticulous.txt")).unwrap();
    assert_eq!(content, "0123456789abcdefghij");
}

#[tokio::test]
async fn test_orchestrator_error_recovery() {
    let mock_server = MockServer::start().await;

    let chunk_data = b"recover_me";
    let chunk_hex = hex::encode(Md5::digest(chunk_data));

    // Fail first time, succeed second time
    Mock::given(method("GET"))
        .and(path(format!("/{}", chunk_hex)))
        .respond_with(ResponseTemplate::new(500))
        .up_to_n_times(1)
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path(format!("/{}", chunk_hex)))
        .respond_with(ResponseTemplate::new(200).set_body_bytes(chunk_data.as_slice()))
        .mount(&mock_server)
        .await;

    let mut manifest = create_test_manifest();
    manifest.files[0].chunks = vec![FileChunkReference {
        chunk_id: chunk_hex.clone(),
        chunk_name: chunk_hex.clone(),
        offset: 0,
        size: 10,
    }];
    manifest.files[0].size = 10;

    let temp_dir = tempfile::tempdir().unwrap();
    let client = SophonClient::new();
    let (_tx_p, rx_p) = tokio::sync::watch::channel(false);

    let orchestrator = ChunkOrchestrator::new(
        "test".into(),
        client,
        vec![manifest],
        temp_dir.path().to_path_buf(),
        mock_server.uri(),
        1,
    );

    let (tx, mut rx) = mpsc::channel(100);
    orchestrator.run(tx, rx_p).await.unwrap();

    let mut completed = false;
    while let Some(event) = rx.recv().await {
        if matches!(event, OrchestratorEvent::Completed) {
            completed = true;
            break;
        }
    }

    assert!(completed);
    let content = std::fs::read_to_string(temp_dir.path().join("meticulous.txt")).unwrap();
    assert_eq!(content, "recover_me");
}
