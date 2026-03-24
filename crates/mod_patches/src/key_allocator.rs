use ini::ast::IniItem;

pub const UNIVERSAL_KEYS: &[&str] = &["6", "7", "8", "9", "0"];
pub const EVACUATION_KEY: &str = "F11";

pub struct KeySlot {
    pub key: String,
    pub modifiers: Vec<String>,
}

pub struct KeyAllocator;

impl KeyAllocator {
    /// Returns the standard 10 slots (6-0, Alt+6-0)
    pub fn get_universal_slots() -> Vec<KeySlot> {
        let mut slots = Vec::new();
        // Slots 1-5: 6, 7, 8, 9, 0
        for k in UNIVERSAL_KEYS {
            slots.push(KeySlot {
                key: k.to_string(),
                modifiers: vec![],
            });
        }
        // Slots 6-10: Alt+6, Alt+7, Alt+8, Alt+9, Alt+0
        for k in UNIVERSAL_KEYS {
            slots.push(KeySlot {
                key: k.to_string(),
                modifiers: vec!["alt".to_string()],
            });
        }
        slots
    }

    /// Formats a KeySlot into a GIMI-compatible string (e.g. "alt 6")
    pub fn format_slot(slot: &KeySlot) -> String {
        if slot.modifiers.is_empty() {
            slot.key.clone()
        } else {
            format!("{} {}", slot.modifiers.join(" "), slot.key)
        }
    }

    /// Checks if a given key string (e.g. "6" or "alt 6") is one of our protected keys
    pub fn is_protected(key_str: &str) -> bool {
        let normalized = key_str.to_lowercase();
        let slots = Self::get_universal_slots();
        slots.iter().any(|s| {
            let s_formatted = Self::format_slot(s).to_lowercase();
            normalized == s_formatted || normalized == s.key.to_lowercase() // Catch "6" even if slot is "6"
        })
    }

    /// Evicts conflicting keys from global mods
    pub fn sanitize_global_item(item: &mut IniItem) -> bool {
        if let IniItem::Pair { key, value } = item {
            if key.to_lowercase() == "key" && Self::is_protected(value) {
                println!(
                    "LogicWeaver: Evicting conflicting global keybind '{}' to {}",
                    value, EVACUATION_KEY
                );
                *value = EVACUATION_KEY.to_string();
                return true;
            }
        }
        false
    }
}
