use logic_weaver::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_dxbc_patcher_asm_parsing() {
    let dir = tempdir().unwrap();
    let asm_path = dir.path().join("test.asm");
    let content = r#"dcl_input v0.xyzw
dcl_input_sgv v1.x, vertex_id
mov o0, v0
"#;
    fs::write(&asm_path, content).unwrap();

    let layouts = dxbc::DxbcPatcher::parse_asm(&asm_path).unwrap();
    assert_eq!(layouts.len(), 2);
    assert_eq!(layouts[0].slot, 0);
    assert_eq!(layouts[1].slot, 1);
}

#[test]
fn test_dxbc_patcher_reindex() {
    let ini = "[Resource]\nstrip = vb0";
    let patched = dxbc::DxbcPatcher::reindex_buffer(ini, 0, 1);
    assert_eq!(patched, "[Resource]\nstrip = vb1");
}
