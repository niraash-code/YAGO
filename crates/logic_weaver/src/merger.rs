use crate::error::Result;
use ini_forge::ast::{IniDocument, IniItem, Section};

pub struct Merger;

impl Merger {
    /// Wraps a specific section in a logic gate.
    /// Used for [TextureOverride] blocks to ensure they only activate for a specific mod UUID.
    ///
    /// Logic:
    /// [TextureOverrideX]
    /// if $final_id == {uuid}
    ///     ... original content ...
    /// endif
    pub fn wrap_in_logic_gate(section: &mut Section, uuid: &str) -> Result<()> {
        if !section.name.to_lowercase().starts_with("textureoverride") {
            return Ok(()); // Only wrap texture overrides
        }

        let condition_arg = format!("$final_id == {}", uuid);
        let endif = "endif".to_string();

        let mut new_items = Vec::new();
        new_items.push(IniItem::Command {
            command: "if".to_string(),
            args: vec![condition_arg],
        });
        new_items.extend(section.items.clone()); // In a real implementation, we'd drain or consume
        new_items.push(IniItem::Command {
            command: endif,
            args: vec![],
        });

        section.items = new_items;
        Ok(())
    }

    /// Merges multiple INI documents into one Master Logic file.
    pub fn merge_documents(
        docs: Vec<IniDocument>,
        _active_uuids: &[String],
    ) -> Result<IniDocument> {
        // Placeholder for the main merging loop.
        // In MVP, we might just concatenation sections, but specialized handling is needed for
        // [Constants] and [Resource] blocks.

        let mut master = IniDocument {
            sections: Vec::new(),
        };

        for doc in docs {
            for section in doc.sections {
                // If it's a texture override, we might want to wrap it if not already wrapped
                // (though usually we wrap at the Mod level before merging).
                master.sections.push(section);
            }
        }

        Ok(master)
    }
}
