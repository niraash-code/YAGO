use fs_engine::ExeInspector;
use std::path::Path;

#[test]
fn diag_dll_version() {
    let dll_path =
        "/home/nira/Games/TwinTail/Hoyoverse/Genshin Impact/n8wt3ilwvt0y1hzg2orthvq6/mhypbase.dll";
    let path = Path::new(dll_path);
    println!("\n--- DLL Diagnostic ---");
    if path.exists() {
        match ExeInspector::get_version(path) {
            Ok(v) => println!("Version of mhypbase.dll: {}", v),
            Err(e) => println!("Error reading version: {:?}", e),
        }
    } else {
        println!("DLL not found");
    }
}
