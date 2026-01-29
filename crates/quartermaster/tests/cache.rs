use quartermaster::*;
use std::fs;
use tempfile::tempdir;

#[tokio::test]
async fn test_asset_cache_skip_if_exists() {
    let dir = tempdir().unwrap();
    let cache_dir = dir.path().join("cache");
    let cache = AssetCache::new(cache_dir.clone());
    
    let url = "https://example.com/logo.png";
    let hash = md5::compute(url.as_bytes());
    let filename = format!("{:x}.png", hash);
    let cached_path = cache_dir.join(filename);
    
    // Pre-create the file
    fs::write(&cached_path, "pre-cached data").unwrap();
    
    // Resolve (should NOT trigger download)
    let result_path = cache.resolve(url).await.unwrap();
    
    assert_eq!(result_path, cached_path);
    let content = fs::read_to_string(result_path).unwrap();
    assert_eq!(content, "pre-cached data");
}
