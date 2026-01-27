use logic_weaver::*;

#[test]
fn test_validator_valid_logic() {
    let doc = ini_forge::IniDocument {
        sections: vec![ini_forge::ast::Section {
            name: "Logic".to_string(),
            items: vec![
                ini_forge::ast::IniItem::Command {
                    command: "if".into(),
                    args: vec!["cond".into()],
                },
                ini_forge::ast::IniItem::Pair {
                    key: "k".into(),
                    value: "v".into(),
                },
                ini_forge::ast::IniItem::Command {
                    command: "endif".into(),
                    args: vec![],
                },
            ],
        }],
    };
    Validator::validate_logic(&doc).unwrap();
}

#[test]
fn test_validator_invalid_logic_unbalanced_if() {
    let doc = ini_forge::IniDocument {
        sections: vec![ini_forge::ast::Section {
            name: "Logic".to_string(),
            items: vec![ini_forge::ast::IniItem::Command {
                command: "if".into(),
                args: vec!["cond".into()],
            }],
        }],
    };
    assert!(Validator::validate_logic(&doc).is_err());
}

#[test]
fn test_validator_invalid_logic_unexpected_endif() {
    let doc = ini_forge::IniDocument {
        sections: vec![ini_forge::ast::Section {
            name: "Logic".to_string(),
            items: vec![ini_forge::ast::IniItem::Command {
                command: "endif".into(),
                args: vec![],
            }],
        }],
    };
    assert!(Validator::validate_logic(&doc).is_err());
}
