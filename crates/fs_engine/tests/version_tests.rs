use fs_engine::ExeInspector;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_config_ini_parsing() {
    let dir = tempdir().unwrap();
    let game_path = dir.path().join("GenshinImpact.exe");

    // Create a fake file
    fs::write(&game_path, "fake content").unwrap();

    // Test case 1: Standard lowercase game_version
    let ini_content = "[General]\ngame_version=5.3.0\nchannel=1";
    fs::write(dir.path().join("config.ini"), ini_content).unwrap();
    assert_eq!(ExeInspector::get_version(&game_path).unwrap(), "5.3.0");

    // Test case 2: Mixed case filename and key with spaces
    fs::remove_file(dir.path().join("config.ini")).unwrap();
    let ini_content = "[General]\nVersion = 1.2.3 \n";
    fs::write(dir.path().join("Config.ini"), ini_content).unwrap();
    assert_eq!(ExeInspector::get_version(&game_path).unwrap(), "1.2.3");
}

#[test]
fn test_parent_dir_lookup() {
    let dir = tempdir().unwrap();
    let data_dir = dir.path().join("GenshinImpact_Data");
    fs::create_dir_all(&data_dir).unwrap();

    let exe_path = data_dir.join("GenshinImpact.exe");
    fs::write(&exe_path, "fake content").unwrap();

    // Place config.ini one level up (standard structure)
    let ini_content = "game_version=4.5.6";
    fs::write(dir.path().join("config.ini"), ini_content).unwrap();

    assert_eq!(ExeInspector::get_version(&exe_path).unwrap(), "4.5.6");
}

#[test]
fn test_pkg_version_parsing() {
    let dir = tempdir().unwrap();
    let game_path = dir.path().join("GenshinImpact.exe");
    fs::write(&game_path, "fake content").unwrap();

    // Test case: pkg_version with JSON-like structure
    let pkg_content = "{\"version\": \"3.8.0\", \"revision\": \"12345\"}";
    fs::write(dir.path().join("audio_en-us_pkg_version"), pkg_content).unwrap();
    assert_eq!(ExeInspector::get_version(&game_path).unwrap(), "3.8.0");
}

#[test]
fn test_validate_exe_real() {
    let dir = tempdir().unwrap();
    let pe_path = dir.path().join("test.exe");
    let mut pe_data = vec![0u8; 100];
    pe_data[0] = 0x4D; // M
    pe_data[1] = 0x5A; // Z
    fs::write(&pe_path, &pe_data).unwrap();
    assert!(ExeInspector::validate_exe(&pe_path).unwrap());

    let elf_path = dir.path().join("test.so");
    let mut elf_data = vec![0u8; 100];
    elf_data[0] = 0x7F;
    elf_data[1] = 0x45;
    elf_data[2] = 0x4C;
    elf_data[3] = 0x46;
    fs::write(&elf_path, &elf_data).unwrap();
    assert!(ExeInspector::validate_exe(&elf_path).unwrap());

    let txt_path = dir.path().join("test.txt");
    fs::write(&txt_path, "not an exe").unwrap();
    assert!(!ExeInspector::validate_exe(&txt_path).unwrap());
}

#[test]
fn test_version_not_found() {
    let dir = tempdir().unwrap();
    let game_path = dir.path().join("NoVersion.exe");
    fs::write(&game_path, "no version info here").unwrap();
    assert_eq!(ExeInspector::get_version(&game_path).unwrap(), "Unknown");
}
