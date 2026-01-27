use crate::error::Result;
use ini_forge::ast::{IniDocument, IniItem};
use regex::Regex;

pub struct Namespacer;

impl Namespacer {
    /// Renames all local variables in an INI document to be unique.
    /// Variables starting with `$` are local in GIMI.
    pub fn namespace_variables(doc: &mut IniDocument, uuid: &str) -> Result<()> {
        let re = Regex::new(r"(\$[a-zA-Z0-9_]+)").unwrap();
        let replacement = format!("${{1}}_{}", uuid);

        for section in &mut doc.sections {
            for item in &mut section.items {
                match item {
                    IniItem::Pair { key, value } => {
                        // Rename variable definitions (e.g. $var = 1 or global $var = 1)
                        if key.contains('$') {
                            *key = re.replace_all(key, &replacement).to_string();
                        }

                        // Rename variable usage in values (e.g. x = $var)
                        if value.contains('$') {
                            *value = re.replace_all(value, &replacement).to_string();
                        }
                    }
                    IniItem::Command { command: _, args } => {
                        // Rename in commands (e.g. if $var == 1)
                        for arg in args {
                            if arg.contains('$') {
                                *arg = re.replace_all(arg, &replacement).to_string();
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        Ok(())
    }

    /// Rewrites file paths in the INI to point to the new deployed location.
    ///
    /// # Arguments
    /// * `doc` - The INI document to modify.
    /// * `prefix` - The path prefix to prepend (e.g., "YAGO/UUID/").
    pub fn rewrite_paths(doc: &mut IniDocument, prefix: &str) -> Result<()> {
        // Keys that usually contain paths in GIMI/3DMigoto
        let path_keys = ["filename", "model", "vb0", "vb1", "vb2", "ib"];

        for section in &mut doc.sections {
            for item in &mut section.items {
                if let IniItem::Pair { key, value } = item {
                    let k = key.to_lowercase();
                    // Check if it's a known path key OR a texture/buffer assignment (ps-t0, vs-t1, etc.)
                    // BUT texture assignments can refer to [Resource] sections, so we shouldn't blindly rewrite them unless they look like paths.
                    // For now, let's stick to 'filename' and friends which are almost always paths.
                    // If a user puts a path directly in ps-t0 = Textures/..., we might miss it if we're too careful,
                    // but usually that's rare in complex mods. Simple mods might do it.

                    let is_path_key = path_keys.contains(&k.as_str());
                    // Heuristic: If it has extension .dds, .buf, .txt, .ini, it's likely a path.
                    let looks_like_path =
                        value.contains('.') && (value.contains('/') || value.contains('\\'));

                    if is_path_key || (k.contains("-t") && looks_like_path) {
                        // Prepend prefix, normalizing separators if needed?
                        // GIMI handles / and \ fine.
                        // We assume 'value' is currently relative to the mod root.
                        // We want it relative to the Game/Mods root.

                        // Avoid double rewriting if run multiple times (though we shouldn't)
                        if !value.starts_with(prefix) {
                            *value = format!("{}{}", prefix, value);
                        }
                    }
                }
            }
        }
        Ok(())
    }
}
