#[cfg(test)]
mod tests {
    use crate::merger::Merger;
    use ini::parser::parse_ini;
    use insta::assert_yaml_snapshot;

    #[test]
    fn test_merger_snapshots() {
        let ini1 = r#"
[Section1]
key1 = value1
"#;
        let ini2 = r#"
[Section1]
key2 = value2
[Section2]
key3 = value3
"#;
        let (_, doc1) = parse_ini(ini1).unwrap();
        let (_, doc2) = parse_ini(ini2).unwrap();

        let merged = Merger::merge_documents(vec![doc1, doc2]).unwrap();
        assert_yaml_snapshot!("merged_ini_output", merged);
    }
}
