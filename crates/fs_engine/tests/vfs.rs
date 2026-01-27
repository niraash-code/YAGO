use fs_engine::*;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use tempfile::tempdir;

#[tokio::test]
async fn test_vfs_deploy_and_overwrite() {
    let dir = tempdir().unwrap();
    let source = dir.path().join("source");
    let target = dir.path().join("game/target_link");

    fs::create_dir_all(&source).unwrap();
    File::create(source.join("mod.dll")).unwrap();

    // Initial deployment
    Vfs::deploy_mod(&source, &target).await.unwrap();
    assert!(target.exists());
    assert!(fs::symlink_metadata(&target)
        .unwrap()
        .file_type()
        .is_symlink());

    // Redeploy (should overwrite existing symlink)
    Vfs::deploy_mod(&source, &target).await.unwrap();
    assert!(target.exists());

    // Cleanup
    Vfs::undeploy_mod(&target).await.unwrap();
    assert!(!target.exists());
}

#[tokio::test]
async fn test_vfs_deploy_safety_failure() {
    let dir = tempdir().unwrap();
    let source = dir.path().join("source");
    let target = dir.path().join("real_dir");

    fs::create_dir_all(&source).unwrap();
    fs::create_dir_all(&target).unwrap(); // Target is a REAL directory

    let result = Vfs::deploy_mod(&source, &target).await;
    // Should fail because we refuse to overwrite real directories with symlinks
    assert!(matches!(result, Err(FsError::DirectoryNotEmpty(_))));
}

#[test]
fn test_execute_deployment() {
    let dir = tempdir().unwrap();
    let game_root = dir.path().join("game");
    let mod_storage = dir.path().join("storage");

    // Setup directories
    fs::create_dir_all(&game_root).unwrap();
    fs::create_dir_all(&mod_storage).unwrap();

    // Create a source file for symlinking
    let source_file = mod_storage.join("texture.dds");
    File::create(&source_file).unwrap();

    // Define the plan
    let plan = DeploymentPlan {
        symlink_map: vec![(source_file.clone(), PathBuf::from("YAGO/texture_link.dds"))],
        generated_files: vec![(PathBuf::from("YAGO/config.ini"), "config=1".to_string())],
    };

    // Execute
    execute_deployment(&game_root, &plan, None).unwrap();

    // Verify
    let yago_dir = game_root.join("Mods/YAGO");
    assert!(yago_dir.exists());

    let link = yago_dir.join("texture_link.dds");
    assert!(link.exists());

    // Check if it is a symlink
    assert!(fs::symlink_metadata(&link)
        .unwrap()
        .file_type()
        .is_symlink());

    let generated = yago_dir.join("config.ini");
    assert!(generated.exists());
    let content = fs::read_to_string(generated).unwrap();
    assert_eq!(content, "config=1");
}

#[test]
fn test_execute_deployment_invalid_root() {
    let plan = DeploymentPlan {
        symlink_map: vec![],
        generated_files: vec![],
    };
    let result = execute_deployment(Path::new("non_existent_game_root_path"), &plan, None);
    assert!(matches!(result, Err(FsError::NotFound(_))));
}

#[tokio::test]
async fn test_vfs_wipe_deployment() {
    let dir = tempdir().unwrap();
    let source = dir.path().join("source");
    let target = dir.path().join("target");
    let target_sub = target.join("nested");

    std::fs::create_dir(&source).unwrap();
    std::fs::create_dir_all(&target_sub).unwrap();

    let link = target_sub.join("link");
    Vfs::deploy_mod(&source, &link).await.unwrap();

    assert!(link.exists());

    Vfs::wipe_deployment(&target).await.unwrap();

    assert!(!link.exists());
    assert!(!target_sub.exists());
}

#[test]
fn test_make_symlink() {
    let dir = tempdir().unwrap();
    let target = dir.path().join("real_file.txt");
    let link = dir.path().join("link.txt");

    fs::write(&target, "data").unwrap();

    make_symlink(&target, &link).unwrap();
    assert!(link.exists());
    assert!(fs::symlink_metadata(&link)
        .unwrap()
        .file_type()
        .is_symlink());

    // Test overwrite
    make_symlink(&target, &link).unwrap();
    assert!(link.exists());
}
