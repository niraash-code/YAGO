#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    #[test]
    fn test_path_encoding_and_decoding_logic() {
        let mock_templates_dir = if cfg!(windows) {
            PathBuf::from("C:\\Users\\Nira\\AppData\\Roaming\\yago\\templates")
        } else {
            PathBuf::from("/home/nira/.local/share/yago/templates")
        };

        let asset_name = "genshin_background.webp";
        let full_path = mock_templates_dir.join(asset_name);
        let path_str = full_path.to_string_lossy().to_string();

        let encoded = urlencoding::encode(&path_str);
        let protocol_url = format!("yago-asset://{}", encoded);
        
        println!("Protocol URL: {}", protocol_url);

        let uri_string = protocol_url.clone();
        let mut path_part = uri_string.replace("yago-asset://localhost", "");
        path_part = path_part.replace("yago-asset://", "");
        
        let decoded = urlencoding::decode(&path_part).expect("Decode failed");
        let mut resolved_path = PathBuf::from(decoded.into_owned());

        #[cfg(unix)]
        if !resolved_path.is_absolute() && path_part.starts_with("%2F") {
            resolved_path = PathBuf::from(format!("/{}", resolved_path.display()));
        }

        println!("Resolved Path: {:?}", resolved_path);
        assert_eq!(full_path, resolved_path);
    }

    #[test]
    fn test_strip_prefix_logic() {
        let input_1 = "local://templates/genshin_background.webp";
        let input_2 = "local://genshin_background.webp";

        let strip = |url: &str| -> String {
            let path_str = url.strip_prefix("local://").unwrap();
            path_str.strip_prefix("templates/").unwrap_or(path_str).to_string()
        };

        assert_eq!(strip(input_1), "genshin_background.webp");
        assert_eq!(strip(input_2), "genshin_background.webp");
    }
}
