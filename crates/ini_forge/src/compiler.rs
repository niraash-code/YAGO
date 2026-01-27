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
        for section in &doc.sections {
            if section.name != "GLOBAL" {
                output.push_str(&format!("[{}]\n", section.name));
            }
            for item in &section.items {
                match item {
                    IniItem::Pair { key, value } => {
                        output.push_str(&format!("{} = {}\n", key, value));
                    }
                    IniItem::Command { command, args } => {
                        output.push_str(&format!("{} = {}\n", command, args.join(" ")));
                    }
                    IniItem::Comment(c) => {
                        output.push_str(&format!("; {}\n", c));
                    }
                }
            }
            output.push('\n');
        }
        output
    }
}
