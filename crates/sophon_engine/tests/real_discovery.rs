use sophon_engine::SophonClient;

#[tokio::test]
#[ignore] // Requires internet access and valid HoYo endpoints
async fn test_real_sophon_discovery_hsr() {
    let client = SophonClient::new();

    // HSR Global params
    let res = client
        .get_build(
            "main",
            "PePf9OoV54",
            "E6RCs6eKqXNC",
            "4ziysqXOQ8",
            "hkrpg_global",
            "VYTpXlbWo8",
            "1",
            "1",
        )
        .await
        .unwrap();

    println!("SUCCESS HSR: Manifest URL: {}", res.manifest_url);
    assert!(!res.manifest_url.is_empty());

    let manifest = client.fetch_manifest(&res.manifest_url).await.unwrap();
    println!("Manifest Parsed: {} files found", manifest.files.len());
    assert!(!manifest.files.is_empty());
}

#[tokio::test]
#[ignore]
async fn test_real_sophon_discovery_genshin() {
    let client = SophonClient::new();

    // Genshin Global params
    let res = client
        .get_build(
            "main",
            "ScSYQBFhu9",
            "bDL4JUHL625x",
            "gopR6Cufr3",
            "hk4e_global",
            "VYTpXlbWo8",
            "1",
            "1",
        )
        .await
        .unwrap();

    println!("SUCCESS Genshin: Manifest URL: {}", res.manifest_url);
    assert!(!res.manifest_url.is_empty());
}
