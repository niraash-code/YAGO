import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "../store/gameStore";
import { api } from "../lib/api";
import { InstallStatus } from "../types";

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
  },
  InjectionMethod: {
    None: "None",
    Proxy: "Proxy",
    Loader: "Loader",
  },
}));

describe("Frontend Workflow Simulations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      games: [],
      selectedGameId: "",
      isRunning: false,
      isInitialized: true,
      globalSettings: { stream_safe: true, nsfw_behavior: "blur" },
    });
  });

  it("completes a full game lifecycle: add -> edit -> launch -> remove", async () => {
    const store = useAppStore.getState();
    const fakePath = "/home/user/Games/FakeGame/game.exe";
    const gameId = "game.exe";

    // 1. Add Game
    vi.mocked(api.addGame).mockResolvedValue(gameId);
    await store.addGame({
      installPath: "/home/user/Games/FakeGame",
      exeName: "game.exe",
    } as any);

    expect(api.addGame).toHaveBeenCalledWith(fakePath);
    expect(useAppStore.getState().selectedGameId).toBe(gameId);

    // Simulate backend emitting library-updated (we'll manually update state for the test)
    const mockGame = {
      id: gameId,
      name: "Fake Game",
      installPath: "/home/user/Games/FakeGame",
      exeName: "game.exe",
      status: InstallStatus.INSTALLED,
      profiles: [{ id: "p1", name: "Default", enabledModIds: [] }],
      mods: [],
      activeProfileId: "p1",
    };
    useAppStore.setState({ games: [mockGame as any] });

    // 2. Edit Game Settings
    await store.updateGameConfig(gameId, { name: "Renamed Fake Game" });
    expect(api.updateGameConfig).toHaveBeenCalledWith(gameId, {
      name: "Renamed Fake Game",
    });

    // 3. Launch Game
    vi.mocked(api.deployMods).mockResolvedValue({ overwritten_hashes: {} });

    // In our implementation, deployment is a separate step usually called before launch or manually
    await store.deployCurrentMods();
    const separator = mockGame.installPath.includes("\\") ? "\\" : "/";
    const fullPath = `${mockGame.installPath}${separator}${mockGame.exeName}`;
    expect(api.deployMods).toHaveBeenCalledWith(fullPath);

    await store.launchCurrentGame();
    expect(api.launchGame).toHaveBeenCalled();

    // 4. Uninstall Game
    await store.uninstallGame(gameId);
    expect(api.removeGame).toHaveBeenCalledWith(gameId);
    expect(useAppStore.getState().selectedGameId).toBe("");
  });

  it("manages profiles: create -> switch -> delete", async () => {
    const store = useAppStore.getState();
    const gameId = "test.exe";
    const initialProfiles = [{ id: "p1", name: "Default" }];

    useAppStore.setState({
      games: [
        {
          id: gameId,
          activeProfileId: "p1",
          profiles: initialProfiles,
          mods: [],
        } as any,
      ],
      selectedGameId: gameId,
    });

    // 1. Create (Update acting as Upsert)
    const newProfile = { id: "p2", name: "Modded" };
    await store.updateProfile(gameId, "p2", newProfile);
    expect(api.updateProfile).toHaveBeenCalledWith(gameId, "p2", newProfile);

    // 2. Switch
    await store.switchProfile(gameId, "p2");
    expect(api.switchProfile).toHaveBeenCalledWith(gameId, "p2");

    // 3. Delete
    await store.deleteProfile(gameId, "p1");
    expect(api.deleteProfile).toHaveBeenCalledWith(gameId, "p1");
  });

  it("manages mods: import -> toggle", async () => {
    const store = useAppStore.getState();
    const gameId = "test.exe";
    const modId = "mod-123";

    useAppStore.setState({
      games: [
        {
          id: gameId,
          activeProfileId: "p1",
          profiles: [{ id: "p1", enabledModIds: [] }],
          mods: [{ id: modId, enabled: false }],
        } as any,
      ],
      selectedGameId: gameId,
    });

    // 1. Import
    await store.importMod(gameId, "/path/to/mod.zip");
    expect(api.importMod).toHaveBeenCalledWith(gameId, "/path/to/mod.zip");

    // 2. Toggle ON
    await store.toggleMod(gameId, modId, true);
    expect(api.toggleMod).toHaveBeenCalledWith(gameId, modId, true);

    const updatedGame = useAppStore.getState().games[0];
    expect(updatedGame.mods[0].enabled).toBe(true);
    expect(updatedGame.profiles[0].enabledModIds).toContain(modId);

    // 3. Toggle OFF
    await store.toggleMod(gameId, modId, false);
    expect(updatedGame.mods[0].enabled).toBe(true); // Wait, need to re-fetch state from get() in next step
    expect(useAppStore.getState().games[0].mods[0].enabled).toBe(false);
  });
});
