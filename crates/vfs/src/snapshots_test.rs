#[cfg(test)]
mod tests {
    use crate::archive::ExtractionReport;
    use insta::assert_yaml_snapshot;

    #[test]
    fn test_extraction_report_snapshot() {
        let report = ExtractionReport {
            files_ignored: vec!["d3dx.ini".to_string(), "malware.exe".to_string()],
            has_mod_json: true,
            has_modinfo_json: false,
        };

        assert_yaml_snapshot!("extraction_report_standard", report);
    }
}
