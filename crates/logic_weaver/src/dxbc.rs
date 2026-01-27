use crate::error::Result;
use regex::Regex;
use std::path::Path;

pub struct DxbcPatcher;

#[derive(Debug)]
pub struct InputLayout {
    pub slot: u32, // vb0, vb1, etc.
    pub offset: u32,
    pub format: String,
}

impl DxbcPatcher {
    /// Parses a Shader Assembly file (.asm) to find input layout registers.
    /// Looks for lines like: dcl_input_sgv v0.x, vertex_id
    pub fn parse_asm(path: &Path) -> Result<Vec<InputLayout>> {
        let content = std::fs::read_to_string(path)?;
        let mut layouts = Vec::new();

        // Regex to find input declarations
        // e.g. dcl_input v0.xy
        // e.g. dcl_input_sf v1.xy
        let re = Regex::new(r"dcl_input(?:_[a-z]+)? v(\d+)\.").unwrap();

        for line in content.lines() {
            if let Some(captures) = re.captures(line) {
                if let Some(slot_match) = captures.get(1) {
                    if let Ok(slot) = slot_match.as_str().parse::<u32>() {
                        layouts.push(InputLayout {
                            slot,
                            offset: 0, // Placeholder, usually derived from context or .fmt
                            format: "Unknown".to_string(),
                        });
                    }
                }
            }
        }

        Ok(layouts)
    }

    /// Rewrites a mod's logic to use a different vertex buffer slot.
    /// e.g. Changing `vb0` to `vb1` because `vb0` is used by the body.
    pub fn reindex_buffer(ini_content: &str, old_slot: u32, new_slot: u32) -> String {
        let old = format!("vb{}", old_slot);
        let new = format!("vb{}", new_slot);
        ini_content.replace(&old, &new)
    }
}
