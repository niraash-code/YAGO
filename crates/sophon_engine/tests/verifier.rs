use md5::Digest;
use sophon_engine::*;
use std::fs::File;
use std::io::Write;
use tempfile::tempdir;

#[tokio::test]
async fn test_verifier_comprehensive() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.bin");

    let content = b"Sophon Engine Test";
    let mut hasher = md5::Md5::new();
    hasher.update(content);
    let expected_hash = format!("{:x}", hasher.finalize());

    {
        let mut file = File::create(&file_path).unwrap();
        file.write_all(content).unwrap();
    }

    assert!(Verifier::verify_file(&file_path, &expected_hash)
        .await
        .is_ok());

    assert!(
        Verifier::verify_file(&file_path, &expected_hash.to_uppercase())
            .await
            .is_ok()
    );

    assert!(
        Verifier::verify_file(&file_path, "deadbeefdeadbeefdeadbeefdeadbeef")
            .await
            .is_err()
    );

    let large_path = dir.path().join("large.bin");
    let mut large_file = File::create(&large_path).unwrap();
    let mut large_hasher = md5::Md5::new();
    let chunk = [0u8; 1024];
    for _ in 0..10 {
        large_file.write_all(&chunk).unwrap();
        large_hasher.update(chunk);
    }
    let large_expected = format!("{:x}", large_hasher.finalize());

    assert!(Verifier::verify_file(&large_path, &large_expected)
        .await
        .is_ok());
}

#[tokio::test]
async fn test_verifier_failure() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("corrupt.bin");
    std::fs::write(&path, b"corrupt data").unwrap();

    let wrong_hash = "00000000000000000000000000000000";
    let res = Verifier::verify_file(&path, wrong_hash).await;

    assert!(res.is_err());
    assert!(res.unwrap_err().to_string().contains("Checksum mismatch"));
}
