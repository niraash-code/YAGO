use fs_engine::*;
use image::{ImageBuffer, Rgba};
use tempfile::tempdir;

#[test]
fn test_transcoder_load_failure() {
    let dir = tempdir().unwrap();
    let invalid_path = dir.path().join("not_an_image.txt");
    std::fs::File::create(&invalid_path).unwrap();

    let result = Transcoder::fix_normal_map(&invalid_path);
    assert!(result.is_err());
}

#[test]
fn test_transcoder_stub_integrity() {
    let dir = tempdir().unwrap();
    let img_path = dir.path().join("test.png");

    let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(2, 2);
    img.save(&img_path).unwrap();

    let result = Transcoder::fix_normal_map(&img_path).unwrap();
    assert!(!result); // Stub returns false
    assert!(img_path.exists());
}
