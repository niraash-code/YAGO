use sophon_engine::orchestrator::ChunkOrchestrator;
use sophon_engine::protocol::{
    FileChunkReference, ManifestCategory, ManifestFile, ManifestStats, SophonManifest,
};
use sophon_engine::SophonClient;
use std::path::PathBuf;

fn create_test_manifest() -> SophonManifest {
    SophonManifest {
        manifest_id: "test_manifest".to_string(),
        game_id: "test_game".to_string(),
        version: "1.0.0".to_string(),
        categories: vec![ManifestCategory {
            id: "core".to_string(),
            name: "Core".to_string(),
        }],
        files: vec![
            ManifestFile {
                name: "file1.dat".to_string(),
                size: 100,
                md5: "file1_hash".to_string(),
                category_id: Some("core".to_string()),
                chunks: vec![
                    FileChunkReference {
                        chunk_id: "chunk_A".to_string(),
                        offset: 0,
                        size: 50,
                    },
                    FileChunkReference {
                        chunk_id: "chunk_B".to_string(),
                        offset: 50,
                        size: 50,
                    },
                ],
            },
            ManifestFile {
                name: "file2.dat".to_string(),
                size: 50,
                md5: "file2_hash".to_string(),
                category_id: Some("core".to_string()),
                chunks: vec![FileChunkReference {
                    chunk_id: "chunk_A".to_string(),
                    offset: 0,
                    size: 50,
                }],
            },
        ],
        stats: ManifestStats {
            total_size: 150,
            chunk_count: 2,
            file_count: 2,
        },
        diff_packages: vec![],
    }
}

#[tokio::test]
async fn test_deduplication_logic() {
    let manifest = create_test_manifest();
    let client = SophonClient::new();
    let target_dir = PathBuf::from("/tmp/test_download");
    let base_url = "http://localhost:8080".to_string();

    let orchestrator = ChunkOrchestrator::new(
        "test_game".to_string(),
        client,
        manifest,
        target_dir,
        base_url,
        1,
    );
    let (work_items, total_bytes) = orchestrator.deduplicate_work();

    assert_eq!(total_bytes, 100); // 50 (A) + 50 (B)
    assert_eq!(work_items.len(), 2);

    let chunk_a = work_items.iter().find(|w| w.chunk_id == "chunk_A").unwrap();
    assert_eq!(chunk_a.targets.len(), 2);
    // Should be file1.dat @ 0 and file2.dat @ 0
    assert!(chunk_a
        .targets
        .iter()
        .any(|t| t.relative_path.to_string_lossy() == "file1.dat" && t.offset == 0));
    assert!(chunk_a
        .targets
        .iter()
        .any(|t| t.relative_path.to_string_lossy() == "file2.dat" && t.offset == 0));

    let chunk_b = work_items.iter().find(|w| w.chunk_id == "chunk_B").unwrap();
    assert_eq!(chunk_b.targets.len(), 1);
    assert_eq!(
        chunk_b.targets[0].relative_path.to_string_lossy(),
        "file1.dat"
    );
    assert_eq!(chunk_b.targets[0].offset, 50);
}
