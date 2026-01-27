use crate::error::{Result, WeaverError};
use ini_forge::ast::{IniDocument, IniItem};

pub struct Validator;

impl Validator {
    /// Validates the logic syntax of an INI document.
    /// - Checks for balanced if/endif blocks.
    /// - Checks for proper nesting.
    pub fn validate_logic(doc: &IniDocument) -> Result<()> {
        for section in &doc.sections {
            let mut depth = 0;

            for item in &section.items {
                if let IniItem::Command { command, .. } = item {
                    let cmd = command.to_lowercase();

                    if cmd == "if" || cmd.starts_with("if_") {
                        depth += 1;
                    } else if cmd == "endif" {
                        if depth == 0 {
                            return Err(WeaverError::ValidationError(format!(
                                "Unexpected 'endif' in section [{}] (no matching if)",
                                section.name
                            )));
                        }
                        depth -= 1;
                    } else if cmd == "else" && depth == 0 {
                        return Err(WeaverError::ValidationError(format!(
                            "Unexpected 'else' in section [{}] (outside of if block)",
                            section.name
                        )));
                    }
                }
            }

            if depth > 0 {
                return Err(WeaverError::ValidationError(format!(
                    "Unclosed 'if' block in section [{}] (missing {} endifs)",
                    section.name, depth
                )));
            }
        }
        Ok(())
    }
}
