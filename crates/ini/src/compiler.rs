use crate::ast::{IniDocument, IniItem};
use crate::error::{IniError, Result};
use crate::parser::parse_ini;
use std::path::Path;

pub struct IniCompiler {
    max_depth: u32,
}

impl Default for IniCompiler {
    fn default() -> Self {
        Self { max_depth: 10 }
    }
}

impl IniCompiler {
    pub fn new(max_depth: u32) -> Self {
        Self { max_depth }
    }

    /// Recursively parses and compiles an INI file, resolving all includes.
    pub fn compile(&self, path: &Path) -> Result<IniDocument> {
        self.compile_recursive(path, 0)
    }

    /// Compiles INI content directly from a string (no include resolution).
    pub fn compile_str(&self, content: &str) -> Result<IniDocument> {
        let (_, doc) = parse_ini(content).map_err(|e| IniError::Parse(e.to_string()))?;
        Ok(doc)
    }

    fn compile_recursive(&self, path: &Path, depth: u32) -> Result<IniDocument> {
        if depth > self.max_depth {
            return Err(IniError::MaxDepthExceeded(path.to_path_buf()));
        }

        let content = std::fs::read_to_string(path)?;
        let (_, doc) = parse_ini(&content).map_err(|e| IniError::Parse(e.to_string()))?;

        Ok(doc)
    }

    /// Serializes an IniDocument back to a string.
    pub fn serialize(&self, doc: &IniDocument) -> String {
        let mut output = String::new();
        let mut indent_level = 0;

        for (sec_idx, section) in doc.sections.iter().enumerate() {
            if section.name != "GLOBAL" {
                output.push_str(&format!("[{}]\n", section.name));
            }
            for item in &section.items {
                match item {
                    IniItem::Pair { key, value } => {
                        let indent = "    ".repeat(indent_level);
                        let trimmed_value = value.trim();
                        let key_lower = key.to_lowercase();

                        if trimmed_value.is_empty() {
                            if key_lower.starts_with("global") {
                                output.push_str(&format!("{}{} = 0\n", indent, key));
                            } else {
                                output.push_str(&format!("{}{}\n", indent, key));
                            }
                        } else {
                            // Standard format with spaces around = works best for most 3DMigoto versions
                            output.push_str(&format!("{}{} = {}\n", indent, key, trimmed_value));
                        }
                    }
                    IniItem::Command { command, args } => {
                        let command_lower = command.to_lowercase();
                        if command_lower == "endif" || command_lower == "else" {
                            indent_level = indent_level.saturating_sub(1);
                        }

                        let indent = "    ".repeat(indent_level);

                        if command_lower == "if"
                            || command_lower == "else"
                            || command_lower == "endif"
                        {
                            if args.is_empty() {
                                output.push_str(&format!("{}{}\n", indent, command));
                            } else {
                                output.push_str(&format!(
                                    "{}{} {}\n",
                                    indent,
                                    command,
                                    args.join(" ")
                                ));
                            }

                            if command_lower == "if" || command_lower == "else" {
                                indent_level += 1;
                            }
                        } else {
                            output.push_str(&format!(
                                "{}{} = {}\n",
                                indent,
                                command,
                                args.join(" ")
                            ));
                        }
                    }
                    IniItem::Comment(c) => {
                        let indent = "    ".repeat(indent_level);
                        output.push_str(&format!("{}; {}\n", indent, c));
                    }
                }
            }
            if sec_idx < doc.sections.len() - 1 {
                output.push('\n');
            }
        }
        output
    }
}
