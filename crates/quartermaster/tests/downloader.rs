use quartermaster::*;
use tempfile::tempdir;

#[tokio::test]
#[ignore]
async fn test_download_file() {
    let dir = tempdir().unwrap();
    let dest = dir.path().join("LICENSE");
    let url = "https://raw.githubusercontent.com/tokio-rs/tokio/master/LICENSE";

    let mut progress_called = false;
    download_file(url, &dest, |curr, total| {
        progress_called = true;
        assert!(curr <= total);
    })
    .await
    .unwrap();

    assert!(dest.exists());
    assert!(progress_called);
    let content = std::fs::read_to_string(&dest).unwrap();
    assert!(content.contains("MIT"));
}
