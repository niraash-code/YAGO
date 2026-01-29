export enum InstallStatus {
  REMOTE = "Remote",
  QUEUED = "Queued",
  DOWNLOADING = "Downloading",
  UPDATING = "Updating",
  INSTALLED = "Installed",
  CORRUPTED = "Corrupted",
  PLAYING = "Playing",
}

export enum InjectionMethod {
  None = "None",
  Proxy = "Proxy",
  Loader = "Loader",
  RemoteThread = "RemoteThread",
  ManualMap = "ManualMap",
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  type: "default" | "custom";
  created: string;
  enabledModIds: string[];
  loadOrder: string[];
  // Settings
  useGamescope?: boolean;
  useGamemode?: boolean;
  useMangohud?: boolean;
  useReshade?: boolean;
  resolution?: [number, number];
  launchArgs?: string[];
  saveDataPath?: string | null;
}

export interface ModCompatibility {
  game: string;
  character: string;
  hashes: string[];
  fingerprint: string;
}

export interface Mod {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  imageUrl: string;
  enabled: boolean;
  size: string;
  updated: string;
  url?: string;
  compatibility: ModCompatibility;
  isValidated?: boolean;
}

export interface FpsConfig {
  enabled: boolean;
  target_fps: number;
  search_pattern: string;
  offset: number;
}

export interface Game {
  id: string;
  name: string;
  shortName: string;
  developer: string;
  description: string;
  status: InstallStatus;
  version: string;
  regions: number;
  color: string; // Tailwind color class snippet (e.g., 'cyan-400')
  accentColor: string; // Hex for inline styles
  coverImage: string; // Wide 16:9 Image URL
  icon: string; // Square Icon URL
  logoInitial: string;
  size: string;
  profiles: Profile[];
  activeProfileId: string;
  installPath?: string;
  exeName?: string;
  launchArgs?: string[];
  mods: Mod[];
  // Advanced settings
  useGamescope?: boolean;
  useGamemode?: boolean;
  useMangohud?: boolean;
  injectionMethod: InjectionMethod;
  modloaderEnabled: boolean;
  supportedInjectionMethods?: InjectionMethod[];
  resolution?: [number, number];
  fpsConfig?: FpsConfig;
  autoUpdate: boolean;
  activeRunnerId?: string;
  prefixPath?: string;
  enableLinuxShield?: boolean;
  remoteInfo?: {
    manifestUrl: String;
    chunkBaseUrl: String;
    totalSize: number;
    version: String;
  };
}

export interface SystemStats {
  downloadProgress: number;
  modsEnabled: boolean;
  statusText: string;
  performance: "Good" | "Average" | "Poor";
  runner: string;
}

export interface AppConfig {
  commonLoaderRepo: string;
  reshadeUrl: string;
  protonRepo: string;
  defaultCoverImage: string;
  defaultIconImage: string;
  presetCovers: string[];
  yagoUpdateUrl: string;
}
