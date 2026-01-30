use sophon_engine::protocol::{FileChunkReference, ManifestFile, ManifestStats, SophonManifest};
use sophon_engine::scanner::{ScanMode, Scanner};
use std::fs;
use tempfile::tempdir;

#[tokio::test]
async fn test_scanner_missing_file() {
    let dir = tempdir().unwrap();
    let manifest = SophonManifest {
        manifest_id: "test".into(),
        game_id: "test".into(),
        version: "1".into(),
        categories: vec![],
        files: vec![ManifestFile {
            name: "missing.dat".into(),
            size: 100,
            md5: "hash".into(),
            category_id: None,
            chunks: vec![FileChunkReference {
                chunk_id: "chunk_1".into(),
                chunk_name: "chunk_1_file".into(),
                offset: 0,
                size: 100,
            }],
        }],
        stats: ManifestStats {
            total_size: 100,
            chunk_count: 1,
            file_count: 1,
        },
        diff_packages: vec![],
    };

    let divergence = Scanner::scan(dir.path(), &manifest, ScanMode::MetadataOnly)
        .await
        .unwrap();

    assert_eq!(divergence.missing_chunks.len(), 1);
    assert_eq!(divergence.missing_chunks[0], "chunk_1");
    assert_eq!(divergence.corrupted_files.len(), 1);
    assert_eq!(
        divergence.corrupted_files[0].to_string_lossy(),
        "missing.dat"
    );
}

#[tokio::test]
async fn test_scanner_size_mismatch() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("corrupt.dat");
    fs::write(&file_path, "too short").unwrap();

    let manifest = SophonManifest {
        manifest_id: "test".into(),
        game_id: "test".into(),
        version: "1".into(),
        categories: vec![],
        files: vec![ManifestFile {
            name: "corrupt.dat".into(),
            size: 100,
            md5: "hash".into(),
            category_id: None,
            chunks: vec![FileChunkReference {
                chunk_id: "chunk_corrupt".into(),
                chunk_name: "chunk_corrupt_file".into(),
                offset: 0,
                size: 100,
            }],
        }],
        stats: ManifestStats {
            total_size: 100,
            chunk_count: 1,
            file_count: 1,
        },
        diff_packages: vec![],
    };

    let divergence = Scanner::scan(dir.path(), &manifest, ScanMode::MetadataOnly)
        .await
        .unwrap();

    assert_eq!(divergence.missing_chunks.len(), 1);
    assert_eq!(divergence.missing_chunks[0], "chunk_corrupt");
}
