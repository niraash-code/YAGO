import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "../store/gameStore";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    listRunners: vi.fn().mockResolvedValue([]),
    getLibrary: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    addGame: vi.fn(),
    removeGame: vi.fn(),
    launchGame: vi.fn(),
    killGame: vi.fn(),
    importMod: vi.fn(),
    deleteMod: vi.fn(),
    toggleMod: vi.fn(),
    setLoadOrder: vi.fn(),
    updateModTags: vi.fn(),
    switchProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    updateGameConfig: vi.fn(),
    deployMods: vi.fn(),
    fetchManifest: vi.fn(),
    downloadGame: vi.fn(),
    checkSetup: vi.fn(),
    getSetupStatus: vi.fn(),
    getSkinInventory: vi.fn(),
    syncTemplates: vi.fn().mockResolvedValue(undefined),
    getAppConfig: vi.fn().mockResolvedValue({
      common_loader_repo: "",
      proton_repo: "",
      yago_update_url: "",
    }),
  },
  InjectionMethod: {
    None: "None",
    Proxy: "Proxy",
    Loader: "Loader",
  },
}));

describe("gameStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      games: [],
      selectedGameId: "",
      isRunning: false,
      globalSettings: null,
    });
  });

  it("initializes with settings and games", async () => {
    vi.mocked(api.checkSetup).mockResolvedValue(true);
    vi.mocked(api.getSetupStatus).mockResolvedValue({
      has_runners: true,
      has_common_loaders: true,
      detected_steam_path: null,
    });
    const mockSettings = {
      language: "en-US",
      steam_compat_tools_path: "",
      wine_prefix_path: "",
      yago_storage_path: "",
      default_runner_id: null,
      stream_safe: true,
      nsfw_behavior: "blur" as const,
      close_on_launch: false,
    };

    const mockLibrary = {
      "genshinimpact.exe": {
        version: "1.0",
        games: {
          "genshinimpact.exe": {
            id: "genshinimpact.exe",
            name: "Genshin Impact",
            install_path: "/path/to/game",
            exe_name: "genshinimpact.exe",
            active_profile_id: "p1",
            injection_method: "Proxy",
            auto_update: false,
          },
        },
        profiles: {
          p1: {
            id: "p1",
            name: "Default",
            added_at: new Date().toISOString(),
            enabled_mod_ids: [],
            load_order: [],
            use_gamescope: false,
            use_gamemode: false,
            use_mangohud: true,
            launch_args: [],
          },
        },
        mods: {},
        last_sync: null,
      },
    };

    vi.mocked(api.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(api.getLibrary).mockResolvedValue(mockLibrary as any);

    await useAppStore.getState().initialize();

    const state = useAppStore.getState();
    expect(state.globalSettings).toEqual(mockSettings);
    expect(state.games.length).toBe(1);
    expect(state.games[0].name).toBe("Genshin Impact");
    expect(state.selectedGameId).toBe("genshinimpact.exe");
  });

  it("toggles stream safe mode", async () => {
    const mockSettings = { stream_safe: true, nsfw_behavior: "blur" };
    useAppStore.setState({ globalSettings: mockSettings, streamSafe: true });

    await useAppStore.getState().toggleStreamSafe();

    expect(api.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        stream_safe: false,
      })
    );
    expect(useAppStore.getState().streamSafe).toBe(false);
  });
});
