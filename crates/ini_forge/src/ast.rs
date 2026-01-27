#[derive(Debug, Clone, PartialEq, Default)]
pub struct IniDocument {
    pub sections: Vec<Section>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Section {
    pub name: String,
    pub items: Vec<IniItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum IniItem {
    Pair { key: String, value: String },
    Command { command: String, args: Vec<String> },
    Comment(String),
}
