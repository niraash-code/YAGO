use crate::ast::{IniDocument, IniItem, Section};
use crate::compiler::IniCompiler;
use crate::error::Result;
use std::collections::HashMap;
use std::path::Path;

pub trait IniPatcher {
    fn set_value(&mut self, section: &str, key: &str, value: &str);
    fn set_proxy_chain(&mut self, proxy_dll: &str);

    // File-based helpers moved from loader_ctl
    fn patch_file<P: AsRef<Path>>(path: P, section: &str, key: &str, value: &str) -> Result<()>;
    fn patch_config<P: AsRef<Path>>(path: P, patches: &HashMap<String, String>) -> Result<()>;
}

impl IniPatcher for IniDocument {
    fn set_value(&mut self, section_name: &str, key: &str, value: &str) {
        let section = self.sections.iter_mut().find(|s| s.name == section_name);

        if let Some(sec) = section {
            // Check if key exists
            let mut found = false;
            for item in &mut sec.items {
                if let IniItem::Pair { key: k, value: v } = item {
                    if k == key {
                        *v = value.to_string();
                        found = true;
                        break;
                    }
                }
            }
            if !found {
                sec.items.push(IniItem::Pair {
                    key: key.to_string(),
                    value: value.to_string(),
                });
            }
        } else {
            // Create section if missing
            self.sections.push(Section {
                name: section_name.to_string(),
                items: vec![IniItem::Pair {
                    key: key.to_string(),
                    value: value.to_string(),
                }],
            });
        }
    }

    fn set_proxy_chain(&mut self, proxy_dll: &str) {
        // Setup daisy chaining via [Import] section
        self.set_value("Import", "filename", proxy_dll);
        self.set_value("Import", "when", "Proxy");
    }

    fn patch_file<P: AsRef<Path>>(path: P, section: &str, key: &str, value: &str) -> Result<()> {
        let compiler = IniCompiler::default();
        let mut doc = compiler.compile(path.as_ref())?;
        doc.set_value(section, key, value);
        let output = compiler.serialize(&doc);
        std::fs::write(path, output)?;
        Ok(())
    }

    fn patch_config<P: AsRef<Path>>(path: P, patches: &HashMap<String, String>) -> Result<()> {
        let compiler = IniCompiler::default();
        let mut doc = compiler.compile(path.as_ref())?;
        for (p, value) in patches {
            let parts: Vec<&str> = p.split('/').collect();
            if parts.len() == 2 {
                doc.set_value(parts[0], parts[1], value);
            }
        }
        let output = compiler.serialize(&doc);
        std::fs::write(path, output)?;
        Ok(())
    }
}
