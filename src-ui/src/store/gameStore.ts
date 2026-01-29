import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";
import {
  Game,
  InstallStatus,
  SystemStats,
  FpsConfig,
  AppConfig,
} from "../types";
import {
  api,
  LibraryDatabase,
  GameConfig as BackendGameConfig,
  InjectionMethod,
  DownloadProgress,
  SetupStatus,
} from "../lib/api";
import { ConflictReport } from "../types/backend";

interface AppState {
  games: Game[];
  selectedGameId: string;
  isRunning: boolean;
  isLaunching: boolean;
  launchStatus: string;
  isInitialized: boolean;
  isSetupRequired: boolean;
  setupStatus: SetupStatus | null;
  appConfig: AppConfig | null;
  isDeploying: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  streamSafe: boolean;
  nsfwBehavior: "blur" | "hide";
  closeOnLaunch: boolean;
  globalSettings: any | null;
  statsMap: Record<string, SystemStats>;
  conflictReport: ConflictReport | null;
  availableRunners: string[];

  // Actions
  setGames: (games: Game[]) => void;
  selectGame: (id: string) => void;
  setIsRunning: (running: boolean) => void;
  refreshRunners: () => Promise<void>;
  toggleStreamSafe: () => void;
  setNsfwBehavior: (behavior: "blur" | "hide") => void;
  setConflictReport: (report: ConflictReport | null) => void;
  addGame: (game: Game) => Promise<void>;
  uninstallGame: (id: string) => Promise<void>;
  initialize: () => Promise<void>;
  initializeEvents: () => Promise<() => void>;
  launchCurrentGame: () => Promise<void>;
  killCurrentGame: () => Promise<void>;
  importMod: (gameId: string, path: string) => Promise<void>;
  deleteMod: (modId: string) => Promise<void>;
  toggleMod: (gameId: string, modId: string, enabled: boolean) => Promise<void>;
  setLoadOrder: (gameId: string, order: string[]) => Promise<void>;
  updateModTags: (
    gameId: string,
    modId: string,
    tags: string[]
  ) => Promise<void>;
  switchProfile: (gameId: string, profileId: string) => Promise<void>;
  updateProfile: (
    gameId: string,
    profileId: string,
    update: any
  ) => Promise<void>;
  deleteProfile: (gameId: string, profileId: string) => Promise<void>;
  updateGameConfig: (gameId: string, update: any) => Promise<void>;
  updateGame: (game: Game) => void;
  updateGlobalSettings: (settings: any) => Promise<void>;
  refreshSetupStatus: () => Promise<void>;
  forceResetAppState: () => Promise<void>;
  fetchAppConfig: () => Promise<void>;
  updateAppConfig: (config: AppConfig) => Promise<void>;
  removeRunner: (id: string) => Promise<void>;
  deployCurrentMods: () => Promise<void>;
  startDownload: (manifestUrl: string, installPath: string) => Promise<void>;
  startGameDownload: (
    gameId: string,
    selectedCategoryIds: string[]
  ) => Promise<void>;
  pauseDownload: (gameId: string) => Promise<void>;
  resumeDownload: (gameId: string) => Promise<void>;
}

export interface ProgressDetailed {
  game_id: string;
  percentage: number;
  speed_bps: number;
  eta_secs: number;
  downloaded_bytes: number;
  total_bytes: number;
}

const mapBackendGameToFrontend = (
  bg: BackendGameConfig,
  profiles: any[],
  mods: any[]
): Game => {
  const activeProfile =
    profiles.find(p => p.id === bg.active_profile_id) || profiles[0];

  return {
    id: bg.id,
    name: bg.name,
    shortName: bg.short_name || bg.name,
    developer: bg.developer || "Unknown",
    description: bg.description || "No description provided.",
    status: bg.install_status as unknown as InstallStatus,
    version: bg.version,
    regions: bg.regions,
    color: bg.color || "slate-400",
    accentColor: bg.accent_color || "#94a3b8",
    coverImage: bg.cover_image || "",
    icon: bg.icon || "",
    logoInitial: bg.logo_initial || bg.name.charAt(0),
    size: bg.size || "Unknown",
    activeProfileId: bg.active_profile_id,
    profiles,
    mods,
    installPath: bg.install_path,
    exeName: bg.exe_name,
    launchArgs: bg.launch_args || [],
    injectionMethod: bg.injection_method,
    modloaderEnabled: bg.modloader_enabled,
    autoUpdate: bg.auto_update,
    activeRunnerId: bg.active_runner_id,
    prefixPath: bg.prefix_path,
    enableLinuxShield: bg.enable_linux_shield,
    supportedInjectionMethods: bg.supported_injection_methods,
    remoteInfo: bg.remote_info
      ? {
          manifestUrl: bg.remote_info.manifest_url,
          chunkBaseUrl: bg.remote_info.chunk_base_url,
          totalSize: bg.remote_info.total_size,
          version: bg.remote_info.version,
        }
      : undefined,
    // Get settings from active profile
    useGamescope: activeProfile?.useGamescope,
    useGamemode: activeProfile?.useGamemode,
    useMangohud: activeProfile?.useMangohud,
    resolution: activeProfile?.resolution,
    fpsConfig: bg.fps_config,
  };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      games: [],
      selectedGameId: "",
      isRunning: false,
      isLaunching: false,
      launchStatus: "",
      isInitialized: false,
      isSetupRequired: false,
      setupStatus: null,
      appConfig: null,
      isDeploying: false,
      isDownloading: false,
      downloadProgress: 0,
      streamSafe: true,
      nsfwBehavior: "blur",
      closeOnLaunch: false,
      globalSettings: null,
      statsMap: {},
      conflictReport: null,
      availableRunners: [],

      setGames: games => set({ games }),
      selectGame: id => set({ selectedGameId: id }),
      setIsRunning: running => set({ isRunning: running }),

      refreshRunners: async () => {
        try {
          const runners = await api.listRunners();
          set({ availableRunners: runners });
        } catch (e) {
          console.error("Failed to list runners:", e);
        }
      },

      toggleStreamSafe: async () => {
        const current = get().streamSafe;
        const settings = get().globalSettings;
        if (settings) {
          await get().updateGlobalSettings({
            ...settings,
            stream_safe: !current,
          });
        }
        set({ streamSafe: !current });
      },

      setNsfwBehavior: async behavior => {
        const settings = get().globalSettings;
        if (settings) {
          await get().updateGlobalSettings({
            ...settings,
            nsfw_behavior: behavior,
          });
        }
        set({ nsfwBehavior: behavior });
      },

      setConflictReport: report => set({ conflictReport: report }),

      updateGlobalSettings: async settings => {
        try {
          await api.updateSettings(settings);
          set({
            globalSettings: settings,
            streamSafe: settings.stream_safe,
            nsfwBehavior: settings.nsfw_behavior,
            closeOnLaunch: settings.close_on_launch,
          });
        } catch (e) {
          console.error("Failed to update settings:", e);
        }
      },

      refreshSetupStatus: async () => {
        const isSetupDone = await api.checkSetup();
        const status = await api.getSetupStatus();
        set({
          setupStatus: status,
          isSetupRequired: !isSetupDone,
        });
      },

      forceResetAppState: async () => {
        try {
          await api.forceResetState();
          set({
            isRunning: false,
            isLaunching: false,
            launchStatus: "",
            isDeploying: false,
          });
        } catch (e) {
          console.error("Failed to reset app state:", e);
        }
      },

      fetchAppConfig: async () => {
        try {
          const config: any = await api.getAppConfig();
          // Map snake_case to camelCase for frontend consistency
          const mappedConfig: AppConfig = {
            commonLoaderRepo: config.common_loader_repo,
            reshadeUrl: config.reshade_url,
            protonRepo: config.proton_repo,
            defaultCoverImage: config.default_cover_image,
            defaultIconImage: config.default_icon_image,
            presetCovers: config.preset_covers,
            yagoUpdateUrl: config.yago_update_url,
          };
          set({ appConfig: mappedConfig });
        } catch (e) {
          console.error("Failed to fetch app config:", e);
        }
      },
      updateAppConfig: async (config: any) => {
        try {
          // Map back to snake_case for backend
          const backendConfig: any = {
            common_loader_repo: config.commonLoaderRepo,
            reshade_url: config.reshadeUrl,
            proton_repo: config.protonRepo,
            default_cover_image: config.defaultCoverImage,
            default_icon_image: config.defaultIconImage,
            preset_covers: config.presetCovers,
            yago_update_url: config.yagoUpdateUrl,
          };
          await api.updateAppConfig(backendConfig);
          set({ appConfig: config });
        } catch (e) {
          throw e;
        }
      },

      removeRunner: async id => {
        try {
          await api.removeRunner(id);
          await get().refreshRunners();
        } catch (e) {
          console.error("Failed to remove runner:", e);
          throw e;
        }
      },

      startDownload: async (manifestUrl, installPath) => {
        set({ isDownloading: true, downloadProgress: 0 });
        try {
          const manifest = await api.fetchManifest(manifestUrl);
          await api.downloadGame(manifest.game_id, installPath);
        } catch (e) {
          console.error("Download failed:", e);
          throw e;
        } finally {
          set({ isDownloading: false });
        }
      },

      startGameDownload: async (gameId, selectedCategoryIds) => {
        try {
          await api.startGameDownload(gameId, selectedCategoryIds);
          set({ isDownloading: true, selectedGameId: gameId });
        } catch (e) {
          console.error("Failed to start Sophon download:", e);
          throw e;
        }
      },

      pauseDownload: async gameId => {
        try {
          await api.pauseGameDownload(gameId);
        } catch (e) {
          console.error("Failed to pause download:", e);
        }
      },

      resumeDownload: async gameId => {
        try {
          await api.resumeGameDownload(gameId);
        } catch (e) {
          console.error("Failed to resume download:", e);
        }
      },

      deployCurrentMods: async () => {
        const game = get().games.find(g => g.id === get().selectedGameId);
        if (!game || !game.installPath || !game.exeName) return;

        set({ isDeploying: true, conflictReport: null });
        try {
          const separator = game.installPath.includes("\\") ? "\\" : "/";
          const fullPath = `${game.installPath}${separator}${game.exeName}`;
          const report = await api.deployMods(fullPath);
          if (Object.keys(report.overwritten_hashes).length > 0) {
            set({ conflictReport: report });
          }
        } catch (e) {
          console.error("Deployment failed:", e);
          throw e;
        } finally {
          set({ isDeploying: false });
        }
      },

      killCurrentGame: async () => {
        try {
          await api.killGame();
        } catch (e) {
          console.error("Kill failed:", e);
        }
      },

      deleteMod: async modId => {
        try {
          await api.deleteMod(modId);
          // No manual state update to avoid conflicts with library-updated event
        } catch (e) {
          console.error("Failed to delete mod:", e);
          throw e;
        }
      },

      launchCurrentGame: async () => {
        const game = get().games.find(g => g.id === get().selectedGameId);
        if (!game || !game.installPath || !game.exeName) return;

        set({ isLaunching: true, launchStatus: "Verifying resources..." });

        try {
          // 1. Ensure Loaders / ReShade
          await api.ensureGameResources(game.id);

          // 2. Deploy Mods (if injection enabled)
          if (game.injectionMethod !== InjectionMethod.None) {
            set({ launchStatus: "Deploying mods..." });
            const separator = game.installPath.includes("\\") ? "\\" : "/";
            const fullPath = `${game.installPath}${separator}${game.exeName}`;
            await api.deployMods(fullPath);
          }

          set({ launchStatus: "Starting process..." });
          await api.launchGame(game.id);
        } catch (e) {
          console.error("Launch failed:", e);
          set({ isLaunching: false, launchStatus: "" });
          throw e;
        } finally {
          set({ isLaunching: false });
        }
      },

      importMod: async (gameId, path) => {
        try {
          await api.importMod(gameId, path);
          // No manual state update to avoid duplicates with library-updated event
        } catch (e) {
          console.error("Mod import failed:", e);
          throw e;
        }
      },

      toggleMod: async (gameId, modId, enabled) => {
        try {
          await api.toggleMod(gameId, modId, enabled);
          set(state => {
            const updatedGames = state.games.map(game => {
              if (game.id !== gameId) return game;

              const updatedMods = game.mods.map(m =>
                m.id === modId ? { ...m, enabled } : m
              );

              // Update active profile too
              const newProfiles = game.profiles.map(p => {
                if (p.id !== game.activeProfileId) return p;
                const currentIds = p.enabledModIds || [];
                const newIds = enabled
                  ? [...new Set([...currentIds, modId])]
                  : currentIds.filter(id => id !== modId);
                return { ...p, enabledModIds: newIds };
              });

              return { ...game, mods: updatedMods, profiles: newProfiles };
            });
            return { games: updatedGames };
          });
        } catch (e) {
          console.error("Toggle mod failed:", e);
          throw e;
        }
      },

      setLoadOrder: async (gameId, order) => {
        try {
          await api.setLoadOrder(gameId, order);
          set(state => {
            const updatedGames = state.games.map(game => {
              if (game.id === gameId) {
                return { ...game, load_order: order };
              }
              return game;
            });
            return { games: updatedGames };
          });
        } catch (e) {
          console.error("Failed to set load order:", e);
          throw e;
        }
      },

      updateModTags: async (gameId, modId, tags) => {
        try {
          await api.updateModTags(gameId, modId, tags);
          set(state => {
            const updatedGames = state.games.map(game => {
              if (game.id === gameId) {
                const updatedMods = game.mods.map(m =>
                  m.id === modId ? { ...m, tags } : m
                );
                return { ...game, mods: updatedMods };
              }
              return game;
            });
            return { games: updatedGames };
          });
        } catch (e) {
          console.error("Failed to update mod tags:", e);
          throw e;
        }
      },

      switchProfile: async (gameId, profileId) => {
        try {
          await api.switchProfile(gameId, profileId);
          // State will be updated via 'library-updated' event
        } catch (e) {
          console.error("Failed to switch profile:", e);
          throw e;
        }
      },

      updateProfile: async (gameId, profileId, update) => {
        try {
          await api.updateProfile(gameId, profileId, update);
          // State will be updated via 'library-updated' event
        } catch (e) {
          console.error("Failed to update profile:", e);
          throw e;
        }
      },

      deleteProfile: async (gameId, profileId) => {
        try {
          await api.deleteProfile(gameId, profileId);
          // State will be updated via 'library-updated' event
        } catch (e) {
          console.error("Failed to delete profile:", e);
          throw e;
        }
      },

      updateGameConfig: async (gameId, update) => {
        try {
          await api.updateGameConfig(gameId, update);
        } catch (e) {
          console.error("Failed to update game config:", e);
          throw e;
        }
      },

      initializeEvents: async () => {
        const unlistenStarted = await listen("game-started", () => {
          set({ isRunning: true });
        });

        const unlistenStopped = await listen("game-stopped", () => {
          set({ isRunning: false, isLaunching: false, launchStatus: "" });
        });

        const unlistenLaunchStatus = await listen<string>(
          "launch-status",
          event => {
            set({ launchStatus: event.payload });
          }
        );

        const unlistenDownload = await listen<ProgressDetailed>(
          "download-progress",
          event => {
            const p = event.payload;
            set(state => ({
              downloadProgress: p.percentage,
              statsMap: {
                ...state.statsMap,
                [p.game_id]: {
                  ...(state.statsMap[p.game_id] || {
                    modsEnabled: false,
                    performance: "Good",
                    runner: "Standard",
                  }),
                  downloadProgress: p.percentage,
                  statusText: `${(p.speed_bps / (1024 * 1024)).toFixed(1)} MB/s • ${Math.floor(p.eta_secs / 60)}m remaining`,
                },
              },
            }));
          }
        );

        const unlistenComplete = await listen<string>(
          "download-complete",
          event => {
            const gameId = event.payload;
            set(state => ({
              isDownloading: false,
              downloadProgress: 100,
              statsMap: {
                ...state.statsMap,
                [gameId]: {
                  ...state.statsMap[gameId],
                  downloadProgress: 100,
                  statusText: "Ready to Play",
                },
              },
            }));
          }
        );

        const unlistenLibrary = await listen<Record<string, LibraryDatabase>>(
          "library-updated",
          event => {
            const dbs = event.payload;
            const allLoadedGames: Game[] = [];

            for (const [gameId, db] of Object.entries(dbs)) {
              if (db.games[gameId]) {
                const bg = db.games[gameId];
                const backendMods = Object.values(db.mods || {});

                const profiles =
                  db.profiles && Object.keys(db.profiles).length > 0
                    ? Object.values(db.profiles).map(p => ({
                        id: p.id,
                        name: p.name,
                        type:
                          p.name === "Default"
                            ? ("default" as const)
                            : ("custom" as const),
                        description: p.description || "No description",
                        created: p.added_at,
                        enabledModIds: p.enabled_mod_ids,
                        loadOrder: p.load_order,
                        // Settings
                        useGamescope: p.use_gamescope,
                        useGamemode: p.use_gamemode,
                        useMangohud: p.use_mangohud,
                        useReshade: p.use_reshade,
                        resolution: p.resolution,
                        launchArgs: p.launch_args || [],
                        saveDataPath: p.save_data_path || null,
                      }))
                    : [];

                const gameMods = backendMods.map(m => ({
                  id: m.id,
                  name: m.meta.name,
                  author: m.meta.author,
                  version: m.meta.version,
                  description: "No description available",
                  tags: m.config.tags,
                  imageUrl: m.meta.preview_image || "",
                  enabled: m.enabled,
                  size: m.size || "Unknown",
                  updated: m.added_at,
                }));

                allLoadedGames.push(
                  mapBackendGameToFrontend(bg, profiles, gameMods)
                );
              }
            }
            
            const currentSelected = get().selectedGameId;
            set({ 
              games: allLoadedGames,
              selectedGameId: currentSelected || (allLoadedGames.length > 0 ? allLoadedGames[0].id : "")
            });
          }
        );

        return () => {
          unlistenStarted();
          unlistenStopped();
          unlistenDownload();
          unlistenComplete();
          unlistenLibrary();
        };
      },

      initialize: async () => {
        try {
          await api.syncTemplates();
          const isSetupDone = await api.checkSetup();
          const settings = await api.getSettings();
          const dbs: Record<string, LibraryDatabase> = await api.getLibrary();
          const appConfig = await api.getAppConfig();

          // Fetch runners
          let runners: string[] = [];
          try {
            runners = await api.listRunners();
          } catch (e) {
            console.error("Failed to fetch runners during init", e);
          }

          const allLoadedGames: Game[] = [];

          for (const [gameId, db] of Object.entries(dbs)) {
            if (db.games[gameId]) {
              const bg = db.games[gameId];
              const backendMods = Object.values(db.mods || {});

              const profiles =
                db.profiles && Object.keys(db.profiles).length > 0
                  ? Object.values(db.profiles).map(p => ({
                      id: p.id,
                      name: p.name,
                      type:
                        p.name === "Default"
                          ? ("default" as const)
                          : ("custom" as const),
                      description: p.description || "No description",
                      created: p.added_at,
                      enabledModIds: p.enabled_mod_ids,
                      loadOrder: p.load_order,
                      // Settings
                      useGamescope: p.use_gamescope,
                      useGamemode: p.use_gamemode,
                      useMangohud: p.use_mangohud,
                      useReshade: p.use_reshade,
                      resolution: p.resolution,
                      launchArgs: p.launch_args || [],
                      saveDataPath: p.save_data_path || null,
                    }))
                  : [];

              const gameMods = backendMods.map(m => ({
                id: m.id,
                name: m.meta.name,
                author: m.meta.author,
                version: m.meta.version,
                description: "No description available",
                tags: m.config.tags,
                imageUrl: m.meta.preview_image || "",
                enabled: m.enabled,
                size: m.size || "Unknown",
                updated: m.added_at,
              }));

              allLoadedGames.push(
                mapBackendGameToFrontend(bg, profiles, gameMods)
              );
            }
          }

          set({
            games: allLoadedGames,
            globalSettings: settings,
            streamSafe: settings.stream_safe,
            nsfwBehavior: settings.nsfw_behavior,
            closeOnLaunch: settings.close_on_launch || false,
            isInitialized: true,
            isSetupRequired: !isSetupDone,
            availableRunners: runners,
            appConfig,
            isRunning: false,
            isLaunching: false,
            launchStatus: "",
            selectedGameId:
              allLoadedGames.length > 0
                ? get().selectedGameId || allLoadedGames[0].id
                : "",
          });

          // Perform background sync for assets to update old placeholders
          for (const game of allLoadedGames) {
            api.syncGameAssets(game.id).catch(console.error);
          }
        } catch (e) {
          console.error("Failed to initialize library", e);
        }
      },
      updateGame: updatedGame =>
        set(state => ({
          games: state.games.map(g =>
            g.id === updatedGame.id ? updatedGame : g
          ),
        })),

      uninstallGame: async id => {
        try {
          await api.removeGame(id);
          // State will be updated via 'library-updated' event
          // But we should select another game if the removed one was selected
          const currentGames = get().games;
          const newGames = currentGames.filter(g => g.id !== id);
          set({
            selectedGameId: newGames.length > 0 ? newGames[0].id : "",
          });
        } catch (e) {
          console.error("Failed to uninstall game:", e);
          throw e;
        }
      },

      addGame: async newGame => {
        try {
          // Backend expects the full path to the executable
          // Ensure we handle separators correctly or just join them
          const separator = newGame.installPath?.includes("\\") ? "\\" : "/";
          const fullPath =
            newGame.installPath && newGame.exeName
              ? `${newGame.installPath}${separator}${newGame.exeName}`
              : newGame.installPath || "";

          const gameId = await api.addGame(fullPath);

          // We do NOT manually update `games` because `addGame` emits 'library-updated'
          // which triggers the event listener to refresh the full list from backend.
          // This prevents race conditions and duplicates.

          set(state => ({
            selectedGameId: gameId,
            statsMap: {
              ...state.statsMap,
              [gameId]: {
                downloadProgress: 0,
                modsEnabled: false,
                statusText: "Ready to Play",
                performance: "Good",
                runner: "Standard",
              },
            },
          }));
        } catch (e) {
          console.error("Backend sync failed:", e);
          throw e; // Re-throw so UI can show error
        }
      },
    }),
    {
      name: "yago-storage",
    }
  )
);
