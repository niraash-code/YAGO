use crate::ast::{IniDocument, IniItem, Section};
use nom::{
    branch::alt,
    bytes::complete::{tag, take_until},
    character::complete::{char, multispace0, not_line_ending, space0},
    combinator::map,
    multi::many0,
    sequence::{pair, preceded},
    IResult,
};

fn strip_inline_comment(input: &str) -> &str {
    if let Some(pos) = input.find(';') {
        &input[..pos]
    } else if let Some(pos) = input.find("//") {
        &input[..pos]
    } else if let Some(pos) = input.find('#') {
        &input[..pos]
    } else {
        input
    }
}

fn parse_comment(input: &str) -> IResult<&str, IniItem> {
    map(
        preceded(
            pair(alt((tag(";"), tag("//"), tag("#"))), space0),
            not_line_ending,
        ),
        |s: &str| IniItem::Comment(s.to_string()),
    )(input)
}

fn parse_pair(input: &str) -> IResult<&str, IniItem> {
    let (input, line) = not_line_ending(input)?;
    let clean_line = strip_inline_comment(line).trim();
    if clean_line.is_empty() || clean_line.starts_with('[') {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Tag,
        )));
    }

    if let Some(pos) = clean_line.find('=') {
        let (key, value) = clean_line.split_at(pos);
        let key = key.trim();
        let value = value[1..].trim(); // skip '='
        let key_lower = key.to_lowercase();

        if key_lower == "run" {
            Ok((
                input,
                IniItem::Command {
                    command: "run".to_string(),
                    args: vec![value.to_string()],
                },
            ))
        } else {
            Ok((
                input,
                IniItem::Pair {
                    key: key.to_string(),
                    value: value.to_string(),
                },
            ))
        }
    } else {
        // Flag or value-less declaration (e.g. global $active)
        Ok((
            input,
            IniItem::Pair {
                key: clean_line.to_string(),
                value: String::new(),
            },
        ))
    }
}

fn parse_command(input: &str) -> IResult<&str, IniItem> {
    let (input, cmd) = alt((tag("endif"), tag("if"), tag("else")))(input)?;

    // Ensure it's a whole word by checking what follows
    let (input, raw_args) = not_line_ending(input)?;

    if !raw_args.is_empty() && !raw_args.starts_with(char::is_whitespace) {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Tag,
        )));
    }

    let args_stripped = strip_inline_comment(raw_args);

    Ok((
        input,
        IniItem::Command {
            command: cmd.to_string(),
            args: args_stripped
                .split_whitespace()
                .map(|s| s.to_string())
                .collect(),
        },
    ))
}

fn parse_section_header(input: &str) -> IResult<&str, String> {
    delimited_header(input)
}

fn delimited_header(input: &str) -> IResult<&str, String> {
    let (input, _) = char('[')(input)?;
    let (input, name) = take_until("]")(input)?;
    let (input, _) = char(']')(input)?;
    Ok((input, name.to_string()))
}

fn parse_item(input: &str) -> IResult<&str, IniItem> {
    let (input, _) = multispace0(input)?;
    alt((parse_comment, parse_command, parse_pair))(input)
}

fn parse_section(input: &str) -> IResult<&str, Section> {
    let (input, _) = multispace0(input)?;
    let (input, name) = parse_section_header(input)?;
    let (input, items) = many0(parse_item)(input)?;
    Ok((input, Section { name, items }))
}

pub fn parse_ini(input: &str) -> IResult<&str, IniDocument> {
    // Skip UTF-8 BOM if present
    let input = input.strip_prefix('\u{FEFF}').unwrap_or(input);

    // Initial items before any section (e.g. global comments or includes)
    let (input, global_items) = many0(parse_item)(input)?;
    let (input, sections) = many0(parse_section)(input)?;

    let mut all_sections = Vec::new();
    if !global_items.is_empty() {
        all_sections.push(Section {
            name: "GLOBAL".to_string(),
            items: global_items,
        });
    }
    all_sections.extend(sections);

    Ok((
        input,
        IniDocument {
            sections: all_sections,
        },
    ))
}
