use sophon_engine::*;

#[test]
fn test_manifest_chunk_filtering() {
    let manifest = SophonManifest {
        version: "1.0".into(),
        game_id: "test".into(),
        chunks: vec![
            ChunkInfo { id: "c1".into(), path: "a.bin".into(), size: 10, md5: "".into(), is_optional: false },
            ChunkInfo { id: "c2".into(), path: "b.bin".into(), size: 20, md5: "".into(), is_optional: true },
        ],
    };
    
    let mandatory: Vec<_> = manifest.chunks.iter().filter(|c| !c.is_optional).collect();
    let optional: Vec<_> = manifest.chunks.iter().filter(|c| c.is_optional).collect();
    
    assert_eq!(mandatory.len(), 1);
    assert_eq!(mandatory[0].id, "c1");
    assert_eq!(optional.len(), 1);
    assert_eq!(optional[0].id, "c2");
}
