import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Tauri's invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  transformCallback: vi.fn(),
}));

// Exhaustive API Mock
const mockApi = {
  listRunners: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue({}),
  getLibrary: vi.fn().mockResolvedValue({}),
  updateSettings: vi.fn().mockResolvedValue(undefined),
  syncGameAssets: vi.fn().mockResolvedValue(undefined),
  ensureGameResources: vi.fn().mockResolvedValue(undefined),
  getAppConfig: vi.fn().mockResolvedValue({}),
  syncTemplates: vi.fn().mockResolvedValue(undefined),
  getCommunityBackgrounds: vi.fn().mockResolvedValue([]),
  updateGameConfig: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
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
  deleteProfile: vi.fn(),
  deployMods: vi.fn(),
  fetchManifest: vi.fn(),
  downloadGame: vi.fn(),
  validateMod: vi.fn(),
  identifyGame: vi.fn(),
  scanForGames: vi.fn(),
  openPath: vi.fn(),
  getSkinInventory: vi.fn(),
  forceResetState: vi.fn(),
  checkSetup: vi.fn(),
  getSetupStatus: vi.fn(),
  detectSteamProtonPath: vi.fn(),
  removeRunner: vi.fn(),
  getModFiles: vi.fn(),
  readModFile: vi.fn(),
  writeModFile: vi.fn(),
};

vi.mock("../../lib/api", () => ({
  api: mockApi,
  InjectionMethod: {
    None: "None",
    Proxy: "Proxy",
    Loader: "Loader",
  },
}));

// Mock Tauri's event
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));

// Mock window.__TAURI__ if needed
(window as any).__TAURI__ = {
  invoke: vi.fn(),
};
