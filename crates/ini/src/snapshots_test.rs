#[cfg(test)]
mod tests {
    use crate::parser::parse_ini;
    use insta::assert_yaml_snapshot;
    use proptest::prelude::*;

    #[test]
    fn test_ini_parser_snapshots() {
        let input = r#"[Section]
key = value
; Comment
if variable == 1
    nested = true
endif
"#;
        let (_, doc) = parse_ini(input).expect("Failed to parse valid INI");
        assert_yaml_snapshot!("ini_ast_standard", doc);
    }

    proptest! {
        #[test]
        fn test_parser_no_panic(s in "\\PC*") {
            let _ = parse_ini(&s);
        }
    }
}
