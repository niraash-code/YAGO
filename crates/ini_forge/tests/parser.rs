use ini_forge::*;

#[test]
fn test_ini_document_default() {
    let doc = IniDocument::default();
    assert!(doc.sections.is_empty());
}

#[test]
fn test_parser_edge_cases() {
    // Empty Input
    let (_, doc) = parser::parse_ini("").unwrap();
    assert!(doc.sections.is_empty());

    // Just comments
    let input = "// Line 1\n; Line 2";
    let (_, doc) = parser::parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 1);
    assert_eq!(doc.sections[0].name, "GLOBAL");
    assert_eq!(doc.sections[0].items.len(), 2);

    // Mixed content with messy spacing
    let input = r#"
   [ Section ]   
key = value
  run  =  MyCommand  
"#;
    let (_, doc) = parser::parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 1);
    assert_eq!(doc.sections[0].name, " Section ");

    let sec = &doc.sections[0];
    assert!(sec
        .items
        .iter()
        .any(|i| matches!(i, IniItem::Pair { key, .. } if key == "key")));
    assert!(sec
        .items
        .iter()
        .any(|i| matches!(i, IniItem::Command { command, .. } if command == "run")));
}

#[test]
fn test_logic_commands_parsing() {
    let input = r#"[Logic]
if $condition == 1
  key = value
endif
"#;
    let (_, doc) = parser::parse_ini(input).unwrap();
    let sec = &doc.sections[0];

    let has_if = sec
        .items
        .iter()
        .any(|i| matches!(i, IniItem::Command { command, .. } if command == "if"));
    let has_endif = sec
        .items
        .iter()
        .any(|i| matches!(i, IniItem::Command { command, .. } if command == "endif"));

    assert!(has_if);
    assert!(has_endif);
}

#[test]
fn test_parser_header_trimming() {
    let input = "[  Header  ]\nkey=value";
    let (_, doc) = parser::parse_ini(input).unwrap();
    assert_eq!(doc.sections[0].name, "  Header  ");
}

#[test]
fn test_parser_empty_section() {
    let input = "[Empty]\n\n[Next]\nk=v";
    let (_, doc) = parser::parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 2);
    assert_eq!(doc.sections[0].name, "Empty");
    assert!(doc.sections[0].items.is_empty());
}
