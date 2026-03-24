use crate::error::{Result, WeaverError};
use ini::ast::{IniDocument, IniItem};
use std::collections::{HashMap, HashSet};

pub struct Validator;

impl Validator {
    /// Validates the logic syntax of an INI document.
    pub fn validate_logic(doc: &IniDocument) -> Result<()> {
        // 1. Balanced If/Endif Check
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

        // 2. Deep Cycle Detection
        Self::detect_logic_cycles(doc)?;

        // 3. Ghost Variable & Duplicate Global Audit
        Self::audit_variables(doc)?;

        Ok(())
    }

    /// Detects deep circular recursion in CommandLists (A -> B -> A).
    pub fn detect_logic_cycles(doc: &IniDocument) -> Result<()> {
        let mut adj = HashMap::new();
        for section in &doc.sections {
            let name = section.name.to_lowercase();
            if name.starts_with("commandlist") {
                let mut targets = Vec::new();
                for item in &section.items {
                    if let IniItem::Command { command, args } = item {
                        if command.to_lowercase() == "run" {
                            for arg in args {
                                targets.push(arg.to_lowercase());
                            }
                        }
                    }
                }
                adj.insert(name, targets);
            }
        }

        let mut visited = HashSet::new();
        let mut stack = HashSet::new();

        for node in adj.keys() {
            if Self::has_cycle(node, &adj, &mut visited, &mut stack) {
                return Err(WeaverError::ValidationError(format!(
                    "Infinite logic loop detected in CommandList: '{}'",
                    node
                )));
            }
        }
        Ok(())
    }

    fn has_cycle(
        node: &String,
        adj: &HashMap<String, Vec<String>>,
        visited: &mut HashSet<String>,
        stack: &mut HashSet<String>,
    ) -> bool {
        if stack.contains(node) {
            return true;
        }
        if visited.contains(node) {
            return false;
        }

        visited.insert(node.clone());
        stack.insert(node.clone());

        if let Some(neighbors) = adj.get(node) {
            for neighbor in neighbors {
                if adj.contains_key(neighbor) && Self::has_cycle(neighbor, adj, visited, stack) {
                    return true;
                }
            }
        }

        stack.remove(node);
        false
    }

    /// Detects usage of variables that were never declared and duplicate declarations.
    pub fn audit_variables(doc: &IniDocument) -> Result<()> {
        let mut defined_vars = HashSet::new();

        // Pass 1: Collect all global declarations and check for duplicates
        for section in &doc.sections {
            for item in &section.items {
                if let IniItem::Pair { key, .. } = item {
                    let k = key.to_lowercase();
                    if k.starts_with("global") {
                        for word in k.split_whitespace() {
                            if word.starts_with('$') {
                                let var = word.to_lowercase();
                                if !defined_vars.insert(var.clone()) {
                                    return Err(WeaverError::ValidationError(format!(
                                        "Duplicate global variable declaration: '{}'",
                                        var
                                    )));
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Pass 2: Check usage in commands and values
        for section in &doc.sections {
            for item in &section.items {
                match item {
                    IniItem::Command { command, args } => {
                        let cmd = command.to_lowercase();
                        if cmd == "run" {
                            continue;
                        } // Already handled by cycle detection

                        for arg in args {
                            // Check for $variables in the argument (splitting by operators)
                            for part in
                                arg.split(|c: char| !c.is_alphanumeric() && c != '$' && c != '_')
                            {
                                if part.starts_with('$')
                                    && !defined_vars.contains(&part.to_lowercase())
                                {
                                    return Err(WeaverError::ValidationError(format!(
                                        "Ghost variable detected: '{}' in section [{}]",
                                        part, section.name
                                    )));
                                }
                            }
                        }
                    }
                    IniItem::Pair { value, .. } => {
                        for word in value.split_whitespace() {
                            if word.starts_with('$') {
                                let clean_word = word.trim_matches(|c: char| {
                                    !c.is_alphanumeric() && c != '$' && c != '_'
                                });
                                if clean_word.starts_with('$')
                                    && !defined_vars.contains(&clean_word.to_lowercase())
                                {
                                    return Err(WeaverError::ValidationError(format!(
                                        "Ghost variable detected: '{}' in section [{}]",
                                        clean_word, section.name
                                    )));
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        Ok(())
    }
}
