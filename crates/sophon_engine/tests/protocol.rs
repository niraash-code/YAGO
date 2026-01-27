use sophon_engine::*;

#[test]
fn test_sophon_protocol_delta_logic() {
    assert!(SophonProtocol::is_delta_needed("1.0.0", "1.1.0"));
    assert!(!SophonProtocol::is_delta_needed("2.0", "2.0"));
    assert!(SophonProtocol::is_delta_needed("", "1.0"));
}

#[test]
fn test_manifest_stub() {
    let manifest = SophonManifest {
        game_id: "test".to_string(),
        version: "1.0".to_string(),
        chunks: vec![ChunkInfo {
            id: "1".to_string(),
            path: "data".to_string(),
            md5: "abc".to_string(),
            size: 100,
            is_optional: false,
        }],
    };
    assert_eq!(manifest.chunks.len(), 1);
}

#[tokio::test]
async fn test_provider_fetch_game_info() {
    let res = Provider::fetch_game_info("genshin").await;
    assert!(res.is_ok());
    let info = res.unwrap();
    assert_eq!(info.id, "genshin");
}
