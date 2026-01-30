use ini_forge::ast::IniItem;
use ini_forge::parser::parse_ini;

#[test]
fn test_ini_document_default() {
    let input = "[Section]\nkey=value";
    let (_, doc) = parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 1);
}

#[test]
fn test_logic_commands_parsing() {
    let input = "if $condition\n  key=value\nendif";
    let (_, doc) = parse_ini(input).unwrap();
    // GLOBAL section is created for items before any section header
    assert_eq!(doc.sections[0].name, "GLOBAL");
}

#[test]
fn test_parser_edge_cases() {
    let input = "";
    let (_, doc) = parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 0);
}

#[test]
fn test_parser_empty_section() {
    let input = "[EmptySection]";
    let (_, doc) = parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 1);
    assert_eq!(doc.sections[0].name, "EmptySection");
    assert_eq!(doc.sections[0].items.len(), 0);
}

#[test]
fn test_parser_header_trimming() {
    let input = "  [ Section ]  \nkey=value";
    let (_, doc) = parse_ini(input).unwrap();
    assert_eq!(doc.sections[0].name, " Section ");
}

#[test]
fn test_parser_with_comments_and_mixed_items() {
    let input = r#"// Global comment
; Another global comment
run = global_script.py

[Section1]
key1 = value1 // inline comment
// section comment
if $condition
  key2 = value2
endif

[Section2]
# not a comment in this parser (yet), should be a pair if # is allowed in keys
// but // is a comment
"#;
    let (_, doc) = parse_ini(input).unwrap();
    assert_eq!(doc.sections.len(), 3); // GLOBAL, Section1, Section2
    assert_eq!(doc.sections[0].name, "GLOBAL");

    let section1 = &doc.sections[1];
    assert_eq!(section1.name, "Section1");
    assert!(section1
        .items
        .iter()
        .any(|i| matches!(i, IniItem::Comment(_))));
}

#[test]
fn test_parser_complex_logic() {
    let input = r#"[Logic]
if $A
  if $B
    key = both
  else
    key = onlyA
  endif
else
  key = none
endif
"#;
    let (_, doc) = parse_ini(input).unwrap();
    assert_eq!(doc.sections[0].name, "Logic");
    let commands: Vec<_> = doc.sections[0]
        .items
        .iter()
        .filter(|i| matches!(i, IniItem::Command { .. }))
        .collect();
    assert_eq!(commands.len(), 6);
}

#[test]
fn test_parser_invalid_input() {
    let input = "this is not ini";
    let res = parse_ini(input);
    // Should still succeed but might not have sections/items if it doesn't match
    assert!(res.is_ok());
}
