import { invoke } from "@tauri-apps/api/core";
import { InjectionMethod, AppConfig } from "../types";
export { InjectionMethod };

export interface FpsConfig {
  enabled: boolean;
  target_fps: number;
  search_pattern: string;
  offset: number;
}

export interface GameConfig {
  id: string;
  name: string;
  short_name: string;
  developer: string;
  description: string;
  install_path: string;
  exe_path: string;
  exe_name: string;
  version: string;
  remote_version?: string;
  installed_components: string[];
  size: string;
  regions: number;
  color: string;
  accent_color: string;
  cover_image: string;
  icon: string;
  logo_initial: string;
  enabled: boolean;
  added_at: string;
  launch_args: string[];
  active_profile_id: string;
  fps_config?: FpsConfig;
  injection_method: InjectionMethod;
  modloader_enabled: boolean;
  supported_injection_methods?: InjectionMethod[];
  auto_update: boolean;
  active_runner_id?: string;
  prefix_path?: string;
  enable_linux_shield: boolean;
  install_status: string;
  remote_info?: {
    manifest_url: string;
    chunk_base_url: string;
    total_size: number;
    version: string;
    branch: string;
    package_id: string;
    password: string;
    plat_app: string;
    game_biz: string;
  };
  // Advanced settings (legacy or flattened from profile in some views)
  use_gamescope?: boolean;
  use_gamemode?: boolean;
  use_mangohud?: boolean;
  resolution?: [number, number];
}

export interface ModMetadata {
  name: string;
  version: string;
  author: string;
  url: string | null;
  preview_image: string | null;
}

export interface ModCompatibility {
  game: string;
  character: string;
  hashes: string[];
  fingerprint: string;
}

export interface Keybind {
  label: string;
  variable: string;
}

export interface ModConfig {
  tags: string[];
  keybinds: Record<string, Keybind>;
}

export interface ModRecord {
  id: string;
  path: string;
  size: string;
  meta: ModMetadata;
  compatibility: ModCompatibility;
  config: ModConfig;
  enabled: boolean;
  added_at: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  enabled_mod_ids: string[];
  load_order: string[];
  added_at: string;
  launch_args: string[];
  save_data_path?: string;
  use_gamescope: boolean;
  use_gamemode: boolean;
  use_mangohud: boolean;
  use_reshade: boolean;
  resolution?: [number, number];
}

export interface LibraryDatabase {
  version: string;
  games: Record<string, GameConfig>;
  mods: Record<string, ModRecord>;
  profiles: Record<string, Profile>;
  active_profile_id?: string;
  last_sync: string | null;
}

export interface SophonManifest {
  version: string;
  game_id: string;
  chunks: ChunkInfo[];
}

export interface ChunkInfo {
  id: string;
  path: string;
  size: number;
  md5: string;
  is_optional: boolean;
}

export interface DownloadProgress {
  chunk_id: string;
  bytes_downloaded: number;
  total_bytes: number;
  overall_progress: number;
}

export interface LoaderProgress {
  game_id: string;
  status: string;
  progress: number; // 0.0 to 1.0
}

export interface ProtonProgress {
  version: string;
  status: string;
  progress: number; // 0.0 to 1.0
}

export interface SetupStatus {
  has_runners: boolean;
  has_common_loaders: boolean;
  detected_steam_path: string | null;
}

export interface IdentifiedGame {
  id: string;
  name: string;
  short_name: string;
  developer: string;
  description: string;
  version: string;
  size: string;
  color: string;
  accent_color: string;
  cover_image: string;
  icon: string;
  logo_initial: string;
  install_path: string;
  exe_name: string;
  supported_injection_methods: InjectionMethod[];
  injection_method: InjectionMethod;
  modloader_enabled: boolean;
}

export interface ManifestCategory {
  id: string;
  name: string;
  size: number;
  is_required: boolean;
}

export interface RemoteCatalogEntry {
  template: any;
  remote_info?: any;
}

export interface DiscoveredGame {
  template_id: string;
  path: string;
}

export interface ConflictReport {
  overwritten_hashes: Record<string, string[]>;
}

export interface GlobalSettings {
  language: string;
  steam_compat_tools_path: string; // PathBuf string
  wine_prefix_path: string;
  yago_storage_path: string;
  default_games_path: string;
  mods_path: string;
  runners_path: string;
  prefixes_path: string;
  cache_path: string;
  default_runner_id: string | null;
  stream_safe: boolean;
  nsfw_behavior: "blur" | "hide";
  close_on_launch: boolean;
}

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  children?: FileNode[];
}

export interface GameConfigUpdate {
  name?: string;
  coverImage?: string;
  icon?: string;
  developer?: string;
  description?: string;
  installPath?: string;
  exeName?: string;
  launchArgs?: string[];
  fpsConfig?: FpsConfig;
  shortName?: string;
  regions?: number;
  color?: string;
  accentColor?: string;
  logoInitial?: string;
  injectionMethod?: InjectionMethod;
  modloaderEnabled?: boolean;
  autoUpdate?: boolean;
  activeProfileId?: string;
  activeRunnerId?: string;
  prefixPath?: string;
  enableLinuxShield?: boolean;
}

export interface ProfileUpdate {
  name?: string;
  description?: string;
  useGamescope?: boolean;
  useGamemode?: boolean;
  useMangohud?: boolean;
  useReshade?: boolean;
  resolution?: [number, number];
  launchArgs?: string[];
  saveDataPath?: string;
  enabledModIds?: string[];
  loadOrder?: string[];
}

export interface CharacterGroup {
  skins: ModSnippet[];
  active_cycle: string[];
}

export interface ModSnippet {
  id: string;
  name: string;
  tags: string[];
  enabled: boolean;
}

export const api = {
  resolveAsset: (url: string) => invoke<string>("resolve_asset", { url }),
  syncGameAssets: (gameId: string) =>
    invoke<void>("sync_game_assets", { gameId }),
  getCommunityBackgrounds: (gameId: string) =>
    invoke<string[]>("get_community_backgrounds", { gameId }),
  getLibrary: () => invoke<Record<string, LibraryDatabase>>("get_library"),
  getSkinInventory: (gameId: string): Promise<Record<string, CharacterGroup>> =>
    invoke("get_skin_inventory", { gameId }),
  identifyGame: (path: string): Promise<IdentifiedGame> =>
    invoke("identify_game", { path }),
  scanForGames: (): Promise<DiscoveredGame[]> => invoke("scan_for_games"),
  recursiveScanPath: (path: string): Promise<DiscoveredGame[]> =>
    invoke("recursive_scan_path", { path }),
  syncTemplates: (): Promise<void> => invoke("sync_templates"),
  addGame: (path: string): Promise<string> => invoke("add_game", { path }),
  removeGame: (gameId: string): Promise<void> =>
    invoke("remove_game", { gameId }),
  launchGame: (gameId: string): Promise<void> =>
    invoke("launch_game", { gameId }),
  killGame: (): Promise<void> => invoke("kill_game"),
  importMod: (gameId: string, path: string): Promise<ModRecord> =>
    invoke("import_mod", { gameId, path }),
  addMod: (gameId: string, path: string): Promise<ModRecord> =>
    invoke("add_mod", { gameId, path }),
  deleteMod: (modId: string): Promise<void> => invoke("delete_mod", { modId }),
  toggleMod: (gameId: string, modId: string, enabled: boolean): Promise<void> =>
    invoke("toggle_mod", { gameId, modId, enabled }),
  deployMods: (gamePath: string): Promise<ConflictReport> =>
    invoke("deploy_mods", { gamePath }),
  validateMod: (modId: string): Promise<boolean> =>
    invoke("validate_mod", { modId }),
  fetchManifest: (url: string): Promise<SophonManifest> =>
    invoke("fetch_manifest", { url }),
  downloadGame: (gameId: string, installPath: string): Promise<void> =>
    invoke("download_game", { gameId, installPath }),
  getSettings: (): Promise<GlobalSettings> => invoke("get_settings"),
  updateSettings: (settings: GlobalSettings): Promise<void> =>
    invoke("update_settings", { settings }),
  setLoadOrder: (gameId: string, order: string[]): Promise<void> =>
    invoke("set_load_order", { gameId, order }),
  updateModTags: (
    gameId: string,
    modId: string,
    tags: string[]
  ): Promise<void> => invoke("update_mod_tags", { gameId, modId, tags }),
  switchProfile: (gameId: string, profileId: string): Promise<void> =>
    invoke("switch_profile", { gameId, profileId }),
  createProfile: (gameId: string, name: string): Promise<Profile> =>
    invoke("create_profile", { gameId, name }),
  duplicateProfile: (
    gameId: string,
    profileId: string,
    name: string
  ): Promise<Profile> =>
    invoke("duplicate_profile", { gameId, profileId, name }),
  updateProfile: (
    gameId: string,
    profileId: string,
    update: ProfileUpdate
  ): Promise<void> => invoke("update_profile", { gameId, profileId, update }),
  deleteProfile: (gameId: string, profileId: string): Promise<void> =>
    invoke("delete_profile", { gameId, profileId }),
  renameProfile: (
    gameId: string,
    profileId: string,
    newName: string
  ): Promise<void> => invoke("rename_profile", { gameId, profileId, newName }),
  updateGameConfig: (gameId: string, update: GameConfigUpdate): Promise<void> =>
    invoke("update_game_config", { gameId, update }),
  listRunners: (): Promise<string[]> => invoke("list_runners"),
  installCommonLibs: (): Promise<void> => invoke("install_common_libs"),
  downloadLoader: (gameId: string) => invoke("download_loader", { gameId }),
  ensureGameResources: (gameId: string) =>
    invoke("ensure_game_resources", { gameId }),
  downloadProton: () => invoke("download_proton"),
  getAppConfig: (): Promise<AppConfig> => invoke("get_app_config"),
  updateAppConfig: (config: AppConfig): Promise<void> =>
    invoke("update_app_config", { config }),
  forceResetState: (): Promise<void> => invoke("force_reset_state"),
  checkSetup: (): Promise<boolean> => invoke("check_setup"),
  getSetupStatus: (): Promise<SetupStatus> => invoke("get_setup_status"),
  detectSteamProtonPath: (): Promise<string | null> =>
    invoke("detect_steam_proton_path"),
  removeRunner: (runnerId: string): Promise<void> =>
    invoke("remove_runner", { runnerId }),
  openPath: (path: string): Promise<void> => invoke("open_path", { path }),

  // File System
  getModFiles: (modId: string): Promise<FileNode[]> =>
    invoke("get_mod_files", { modId }),
  readModFile: (modId: string, filePath: string): Promise<string> =>
    invoke("read_mod_file", { modId, filePath }),
  writeModFile: (
    modId: string,
    filePath: string,
    content: string
  ): Promise<void> => invoke("write_mod_file", { modId, filePath, content }),

  // New Sophon Commands
  getRemoteCatalog: (): Promise<any[]> => invoke("get_remote_catalog"),
  initializeRemoteGame: (templateId: string): Promise<string> =>
    invoke("initialize_remote_game", { templateId }),
  getInstallOptions: (gameId: string): Promise<any[]> =>
    invoke("get_install_options", { gameId }),
  startGameDownload: (
    gameId: string,
    selectedCategoryIds: string[]
  ): Promise<void> =>
    invoke("start_game_download", { gameId, selectedCategoryIds }),
  pauseGameDownload: (gameId: string): Promise<void> =>
    invoke("pause_game_download", { gameId }),
  resumeGameDownload: (gameId: string): Promise<void> =>
    invoke("resume_game_download", { gameId }),
  repairGame: (gameId: string): Promise<void> =>
    invoke("repair_game", { gameId }),
  wipeGameMods: (gameId: string): Promise<void> =>
    invoke("wipe_game_mods", { gameId }),
  resetGameProfiles: (gameId: string): Promise<void> =>
    invoke("reset_game_profiles", { gameId }),
  removeGamePrefix: (gameId: string): Promise<void> =>
    invoke("remove_game_prefix", { gameId }),
  uninstallGameFiles: (gameId: string): Promise<void> =>
    invoke("uninstall_game_files", { gameId }),
};
// Event Listeners
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export const events = {
  onGameDownloadProgress: (
    handler: (payload: any) => void
  ): Promise<UnlistenFn> =>
    listen("game-download-progress", event => handler(event.payload)),

  onGameDownloadComplete: (
    handler: (payload: string) => void
  ): Promise<UnlistenFn> =>
    listen<string>("game-download-complete", event => handler(event.payload)),

  onGameDownloadError: (
    handler: (payload: string) => void
  ): Promise<UnlistenFn> =>
    listen<string>("game-download-error", event => handler(event.payload)),

  onLoaderProgress: (
    handler: (payload: LoaderProgress) => void
  ): Promise<UnlistenFn> =>
    listen<LoaderProgress>("loader-progress", event => handler(event.payload)),

  onProtonProgress: (
    handler: (payload: ProtonProgress) => void
  ): Promise<UnlistenFn> =>
    listen<ProtonProgress>("proton-progress", event => handler(event.payload)),

  onLibraryUpdated: (
    handler: (payload: Record<string, LibraryDatabase>) => void
  ): Promise<UnlistenFn> =>
    listen<Record<string, LibraryDatabase>>("library-updated", event =>
      handler(event.payload)
    ),
};
