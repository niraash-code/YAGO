use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct IniDocument {
    pub sections: Vec<Section>,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct Section {
    pub name: String,
    pub items: Vec<IniItem>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum IniItem {
    Pair { key: String, value: String },
    Command { command: String, args: Vec<String> },
    Comment(String),
}
