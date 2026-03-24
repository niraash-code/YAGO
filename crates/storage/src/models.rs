use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FpsConfig {
    pub enabled: bool,
    pub target_fps: u32,
    pub search_pattern: String, // Hex string: "7F 0F 8B ..."
    pub offset: usize,          // Offset from pattern match
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Copy, Default)]
pub enum InjectionMethod {
    #[default]
    None,
    Proxy,
    Loader,
    RemoteThread,
    ManualMap,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SandboxConfig {
    pub registry_keys: Vec<String>, // e.g., "HKCU\Software\miHoYo\Genshin Impact"
    pub files: Vec<String>,         // Relative paths to backup (e.g., "GameUserSettings.ini")
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Copy, Default)]
pub enum InstallStatus {
    #[default]
    Remote, // Not installed, only exists in catalog
    Queued, // Waiting for download slot
    Downloading,
    Updating,
    Installed,
    Corrupted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub manifest_url: String,
    pub chunk_base_url: String,
    pub total_size: u64,
    pub version: String,
    // Sophon-specific IDs for re-fetching
    pub branch: String,
    pub package_id: String,
    pub password: String,
    pub plat_app: String,
    pub game_biz: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    pub id: String, // The exe_name or normalized template ID
    pub name: String,
    pub short_name: String,
    pub developer: String,
    pub description: String,
    pub install_path: PathBuf,
    pub exe_path: PathBuf,
    pub exe_name: String,
    pub version: String,
    #[serde(default)]
    pub remote_version: Option<String>,
    #[serde(default)]
    pub installed_components: Vec<String>,
    pub size: String,
    pub color: String,
    pub accent_color: String,
    pub cover_image: String,
    pub icon: String,
    pub logo_initial: String,
    pub enabled: bool,
    pub added_at: DateTime<Utc>,
    #[serde(default)]
    pub launch_args: Vec<String>,
    #[serde(default)]
    pub gamescope_args: Vec<String>,
    pub active_profile_id: String,
    #[serde(default)]
    pub fps_config: Option<FpsConfig>,
    #[serde(default)]
    pub injection_method: InjectionMethod,
    #[serde(default)]
    pub install_status: InstallStatus,
    #[serde(default)]
    pub auto_update: bool,
    #[serde(default)]
    pub active_runner_id: Option<String>,
    #[serde(default)]
    pub prefix_path: Option<PathBuf>,
    #[serde(default)]
    pub modloader_enabled: bool,
    #[serde(default)]
    pub sandbox: SandboxConfig,
    // External Resources
    #[serde(default)]
    pub loader_repo: Option<String>,
    #[serde(default)]
    pub hash_db_url: Option<String>,
    #[serde(default)]
    pub patch_logic: Option<HashMap<String, String>>,
    #[serde(default = "default_true")]
    pub enable_linux_shield: bool,
    #[serde(default)]
    pub supported_injection_methods: Vec<InjectionMethod>,
    #[serde(default)]
    pub remote_info: Option<RemoteInfo>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModMetadata {
    pub name: String,
    pub version: String,
    pub author: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub preview_image: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModCompatibility {
    pub game: String,
    pub character: String,
    #[serde(default)]
    pub hashes: Vec<String>,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModConfig {
    #[serde(default)]
    pub mod_type: Option<String>, // "character", "ui", "global", etc.
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub keybinds: HashMap<String, Keybind>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keybind {
    pub label: String,
    pub key: String,
    pub variable: String,
    pub values: Vec<String>,
    #[serde(default)]
    pub condition: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModRecord {
    pub id: Uuid,
    pub owner_game_id: String, // Explicit association (e.g., "genshin")
    pub path: PathBuf,
    #[serde(default)]
    pub size: String,
    pub meta: ModMetadata,
    pub compatibility: ModCompatibility,
    pub config: ModConfig,
    pub enabled: bool,
    pub added_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: Uuid,
    pub name: String,
    #[serde(default)]
    pub description: String,
    // Mod State
    #[serde(default)]
    pub enabled_mod_ids: Vec<Uuid>,
    #[serde(default)]
    pub load_order: Vec<Uuid>,
    // Game Settings
    #[serde(default)]
    pub use_gamescope: bool,
    #[serde(default)]
    pub use_gamemode: bool,
    #[serde(default)]
    pub use_mangohud: bool,
    #[serde(default)]
    pub use_reshade: bool,
    #[serde(default)]
    pub resolution: Option<(u32, u32)>,
    #[serde(default)]
    pub launch_args: Vec<String>,
    #[serde(default)]
    pub gamescope_args: Vec<String>,
    #[serde(default)]
    pub save_data_path: Option<PathBuf>,
    pub added_at: DateTime<Utc>,
}

impl Default for Profile {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4(),
            name: "Default".to_string(),
            description: "Default loadout".to_string(),
            enabled_mod_ids: vec![],
            load_order: vec![],
            use_gamescope: false,
            use_gamemode: false,
            use_mangohud: false,
            use_reshade: false,
            resolution: Some((1920, 1080)),
            launch_args: vec![],
            gamescope_args: vec![],
            save_data_path: None,
            added_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryDatabase {
    pub version: String,
    #[serde(default)]
    pub games: HashMap<String, GameConfig>,
    #[serde(default)]
    pub mods: HashMap<Uuid, ModRecord>,
    #[serde(default)]
    pub profiles: HashMap<Uuid, Profile>,
    #[serde(default)]
    pub last_sync: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportCandidate {
    pub original_path: PathBuf,
    pub suggested_name: String,
    pub identified_character: Option<String>,
    pub detected_topology: String, // "Standard", "Merged", "Legacy"
    pub preview_image: Option<String>,
    pub initial_state: bool, // Based on DISABLED prefix
    pub warnings: Vec<ImportWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportWarning {
    pub level: String, // "Critical", "Warning", "Info"
    pub message: String,
}
