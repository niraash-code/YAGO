use crate::ast::{IniDocument, IniItem, Section};
use nom::{
    branch::alt,
    bytes::complete::{tag, take_until, take_while1},
    character::complete::{char, multispace0, not_line_ending, space0},
    combinator::map,
    multi::many0,
    sequence::{delimited, pair, preceded, separated_pair},
    IResult,
};

fn is_key_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_' || c == '$' || c == '.' || c == '-' || c == ' '
}

fn parse_comment(input: &str) -> IResult<&str, IniItem> {
    map(
        preceded(pair(alt((tag(";"), tag("//"))), space0), not_line_ending),
        |s: &str| IniItem::Comment(s.to_string()),
    )(input)
}

fn parse_pair(input: &str) -> IResult<&str, IniItem> {
    map(
        separated_pair(
            take_while1(is_key_char),
            delimited(space0, char('='), space0),
            not_line_ending,
        ),
        |(key, value): (&str, &str)| {
            let key = key.trim();
            let key_lower = key.to_lowercase();
            if key_lower == "run" {
                IniItem::Command {
                    command: "run".to_string(),
                    args: vec![value.trim().to_string()],
                }
            } else {
                IniItem::Pair {
                    key: key.to_string(),
                    value: value.trim().to_string(),
                }
            }
        },
    )(input)
}

fn parse_command(input: &str) -> IResult<&str, IniItem> {
    let (input, cmd) = alt((tag("if"), tag("endif"), tag("else")))(input)?;

    // Ensure it's a whole word by checking what follows
    let (input, args) = not_line_ending(input)?;

    if !args.is_empty() && !args.starts_with(char::is_whitespace) {
        return Err(nom::Err::Error(nom::error::Error::new(
            input,
            nom::error::ErrorKind::Tag,
        )));
    }

    Ok((
        input,
        IniItem::Command {
            command: cmd.to_string(),
            args: args.split_whitespace().map(|s| s.to_string()).collect(),
        },
    ))
}

fn parse_section_header(input: &str) -> IResult<&str, String> {
    delimited(
        char('['),
        map(take_until("]"), |s: &str| s.to_string()),
        char(']'),
    )(input)
}

fn parse_item(input: &str) -> IResult<&str, IniItem> {
    delimited(
        multispace0,
        alt((parse_comment, parse_command, parse_pair)),
        multispace0,
    )(input)
}

fn parse_section(input: &str) -> IResult<&str, Section> {
    let (input, name) = delimited(multispace0, parse_section_header, multispace0)(input)?;
    let (input, items) = many0(parse_item)(input)?;
    Ok((input, Section { name, items }))
}

pub fn parse_ini(input: &str) -> IResult<&str, IniDocument> {
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
