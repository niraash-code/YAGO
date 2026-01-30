use sophon_engine::SophonClient;

#[tokio::test]
async fn test_hi3_global_sophon() {
    let client = SophonClient::new();

    // HI3 Global (Verified GLB params)
    let res = client
        .get_build(
            "main",         // branch
            "19XDCbNucU",   // package_id
            "ag43v1QVxlUH", // password
            "5TIVvvcwtM",   // plat_app
            "bh3_global",   // game_biz
            "VYTpXlbWo8",   // launcher_id
            "1",            // channel_id
            "1",            // sub_channel_id
        )
        .await;

    match res {
        Ok(b) => {
            println!("SUCCESS HI3: Manifest URL: {}", b.manifest_url);
            println!("Version: {}", b.version);
        }
        Err(e) => {
            println!("FAILED HI3: {}", e);
        }
    }
}
