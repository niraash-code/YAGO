use quartermaster::*;

#[tokio::test]
#[ignore]
async fn test_fetch_proton_release() {
    let release = github::get_latest_release("GloriousEggroll", "proton-ge-custom")
        .await
        .unwrap();
    assert!(!release.assets.is_empty());
    assert!(release.assets[0].name.ends_with(".tar.gz"));
}

#[tokio::test]
#[ignore]
async fn test_resolve_repos() {
    // Proton
    let proton_release = github::get_latest_release("GloriousEggroll", "proton-ge-custom")
        .await
        .unwrap();
    println!(
        "Proton URL: {}",
        proton_release.assets[0].browser_download_url
    );
    assert!(proton_release.assets[0]
        .browser_download_url
        .contains("github.com"));

    // Wuwa
    let wuwa_release = github::get_latest_release("SpectrumQT", "WWMI-Package")
        .await
        .unwrap();
    println!("Wuwa URL: {}", wuwa_release.assets[0].browser_download_url);
    assert!(wuwa_release.assets[0]
        .browser_download_url
        .contains("github.com"));
}

#[tokio::test]
#[ignore]
async fn test_fetch_source_map() {
    let games = vec!["wuwa", "zzz", "genshin", "hsr", "hi3", "common"];

    for game_id in games {
        let (owner, repo) = match game_id {
            "wuwa" => ("SpectrumQT", "WWMI-Package"),
            "zzz" => ("leotorrez", "ZZMI-Package"),
            "genshin" => ("SilentNightSound", "GIMI-Package"),
            "hsr" => ("SpectrumQT", "SRMI-TEST"),
            "hi3" => ("leotorrez", "HIMI-Package"),
            "common" => ("SilentNightSound", "GI-Model-Importer"),
            _ => continue,
        };

        match github::get_latest_release(owner, repo).await {
            Ok(release) => {
                let asset = release.assets.iter().find(|a| a.name.ends_with(".zip"));
                println!(
                    "Game: {:<10} | Repo: {:<20}/{:<20} | URL: {}",
                    game_id,
                    owner,
                    repo,
                    asset
                        .map(|a| a.browser_download_url.as_str())
                        .unwrap_or("NOT FOUND")
                );
            }
            Err(e) => println!("Game: {:<10} | FAILED: {}", game_id, e),
        }
    }
}
