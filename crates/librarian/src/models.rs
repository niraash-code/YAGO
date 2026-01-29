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
    pub size: String,
    pub regions: u32,
    pub color: String,
    pub accent_color: String,
    pub cover_image: String,
    pub icon: String,
    pub logo_initial: String,
    pub enabled: bool,
    pub added_at: DateTime<Utc>,
    pub launch_args: Vec<String>,
    pub active_profile_id: String,
    pub fps_config: Option<FpsConfig>,
    #[serde(default)]
    pub injection_method: InjectionMethod,
    #[serde(default)]
    pub install_status: InstallStatus,
    #[serde(default)]
    pub auto_update: bool,
    pub active_runner_id: Option<String>,
    pub prefix_path: Option<PathBuf>,
    #[serde(default)]
    pub modloader_enabled: bool,
    #[serde(default)]
    pub sandbox: SandboxConfig,
    // External Resources
    pub loader_repo: Option<String>,
    pub hash_db_url: Option<String>,
    pub patch_logic: Option<HashMap<String, String>>,
    #[serde(default = "default_true")]
    pub enable_linux_shield: bool,
    #[serde(default)]
    pub supported_injection_methods: Vec<InjectionMethod>,
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
    pub url: Option<String>,
    pub preview_image: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModCompatibility {
    pub game: String,
    pub character: String,
    pub hashes: Vec<String>,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModConfig {
    pub tags: Vec<String>,
    pub keybinds: HashMap<String, Keybind>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keybind {
    pub label: String,
    pub variable: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModRecord {
    pub id: Uuid,
    pub owner_game_id: String, // Explicit association (e.g., "genshin")
    pub path: PathBuf,
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
    pub description: String,
    // Mod State
    pub enabled_mod_ids: Vec<Uuid>,
    pub load_order: Vec<Uuid>,
    // Game Settings
    pub use_gamescope: bool,
    pub use_gamemode: bool,
    pub use_mangohud: bool,
    pub use_reshade: bool,
    pub resolution: Option<(u32, u32)>,
    pub launch_args: Vec<String>,
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
            save_data_path: None,
            added_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryDatabase {
    pub version: String,
    pub games: HashMap<String, GameConfig>,
    pub mods: HashMap<Uuid, ModRecord>,
    pub profiles: HashMap<Uuid, Profile>,
    pub last_sync: Option<DateTime<Utc>>,
}
