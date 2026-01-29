pub mod catalog;
pub mod cloud;
pub mod discovery;
pub mod error;
pub mod gamedata;
pub mod import;
pub mod models;
pub mod queries;
pub mod scanner;
pub mod settings;
pub mod storage;
pub mod template;

pub use catalog::{CatalogManager, RemoteCatalogEntry};
pub use discovery::Discovery;
pub use error::{LibrarianError, Result};
pub use import::Importer;
pub use models::{
    FpsConfig, GameConfig, InjectionMethod, InstallStatus, LibraryDatabase, ModCompatibility,
    ModConfig, ModMetadata, ModRecord, Profile, SandboxConfig,
};
pub use scanner::DiscoveredGame;
pub use settings::{GlobalSettings, SettingsManager};
pub use storage::{Librarian, TemplateRegistry};
pub use template::GameTemplate;
