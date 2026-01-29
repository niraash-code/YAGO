use sophon_engine::Downloader;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};
use tempfile::tempdir;
use std::fs;

#[tokio::test]
async fn test_downloader_resume() {
    let mock_server = MockServer::start().await;
    let file_content = "0123456789";
    let file_path = "/test.file";

    // Mock HEAD request for content length
    Mock::given(method("HEAD"))
        .and(path(file_path))
        .respond_with(ResponseTemplate::new(200).append_header("content-length", "10"))
        .mount(&mock_server)
        .await;

    // Mock GET request for range
    Mock::given(method("GET"))
        .and(path(file_path))
        //.and(header("range", "bytes=5-")) // Wiremock matching specific headers can be tricky if not exact
        .respond_with(ResponseTemplate::new(206).set_body_string("56789")) // Return last 5 bytes
        .mount(&mock_server)
        .await;

    let dir = tempdir().unwrap();
    let target_path = dir.path().join("test.file");
    
    // Create partial file
    fs::write(&target_path, "01234").unwrap();

    let downloader = Downloader::default();
    let url = format!("{}{}", mock_server.uri(), file_path);

    downloader.download_file(&url, &target_path, |_| {}).await.unwrap();

    let content = fs::read_to_string(&target_path).unwrap();
    assert_eq!(content, file_content);
}

#[tokio::test]
async fn test_downloader_full() {
    let mock_server = MockServer::start().await;
    let file_content = "full_content";
    let file_path = "/full.file";

    Mock::given(method("HEAD"))
        .and(path(file_path))
        .respond_with(ResponseTemplate::new(200).append_header("content-length", "12"))
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path(file_path))
        .respond_with(ResponseTemplate::new(200).set_body_string(file_content))
        .mount(&mock_server)
        .await;

    let dir = tempdir().unwrap();
    let target_path = dir.path().join("full.file");

    let downloader = Downloader::default();
    let url = format!("{}{}", mock_server.uri(), file_path);

    downloader.download_file(&url, &target_path, |_| {}).await.unwrap();

    let content = fs::read_to_string(&target_path).unwrap();
    assert_eq!(content, file_content);
}
