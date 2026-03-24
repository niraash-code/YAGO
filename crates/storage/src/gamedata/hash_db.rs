use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HashIndex {
    pub characters: HashMap<String, String>, // hash -> Character Name
}

impl HashIndex {
    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let content = std::fs::read_to_string(path)?;
        let index: HashIndex = serde_json::from_str(&content)?;
        Ok(index)
    }

    pub fn identify(&self, hash: &str) -> Option<String> {
        let name = self.characters.get(hash).cloned()?;
        // Canonical remapping for runtime safety
        match name.as_str() {
            "TravellerBoy" => Some("Aether".to_string()),
            "TravellerGirl" => Some("Lumine".to_string()),
            _ => Some(name),
        }
    }
}
