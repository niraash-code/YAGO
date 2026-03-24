import { GlobalRegistrator } from "@happy-dom/global-registrator";

// 1. Initialize the High-Fidelity Simulation IMMEDIATELY
GlobalRegistrator.register();

import { mock, afterEach } from "bun:test";

// 2. High-Fidelity LocalStorage Mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// 3. Automated Cleanup Ritual
afterEach(() => {
  document.body.innerHTML = "";
  document.body.className = "";
  localStorage.clear();
});

// 2. Mock Tauri Core
mock.module("@tauri-apps/api/core", () => ({
  invoke: async () => ({}),
  transformCallback: () => ({}),
}));

// 3. Mock High-Fidelity API
const mockApi = {
  listRunners: async () => [],
  getSettings: async () => ({}),
  getLibrary: async () => ({}),
  updateSettings: async () => {},
  syncGameAssets: async () => {},
  ensureGameResources: async () => {},
  getAppConfig: async () => ({}),
  syncTemplates: async () => {},
  getCommunityBackgrounds: async () => [],
  updateGameConfig: async () => {},
  updateProfile: async () => {},
  addGame: async () => {},
  removeGame: async () => {},
  launchGame: async () => {},
  killGame: async () => {},
  importMod: async () => {},
  deleteMod: async () => {},
  toggleMod: async () => {},
  setLoadOrder: async () => {},
  updateModTags: async () => {},
  switchProfile: async () => {},
  deleteProfile: async () => {},
  deployMods: async () => {},
  redeployMods: async () => {},
  fetchManifest: async () => {},
  downloadGame: async () => {},
  validateMod: async () => {},
  identifyGame: async () => {},
  scanForGames: async () => {},
  scanModDirectory: async () => {},
  openPath: async () => {},
  getSkinInventory: async () => ({}),
  forceResetState: async () => {},
  checkSetup: async () => {},
  getSetupStatus: async () => ({}),
  detectSteamProtonPath: async () => "",
  removeRunner: async () => {},
  getModFiles: async () => [],
  readModFile: async () => "",
  writeModFile: async () => {},
};

mock.module("../../lib/api", () => ({
  api: mockApi,
  InjectionMethod: {
    None: "None",
    Proxy: "Proxy",
    Loader: "Loader",
  },
}));

// 4. Mock Tauri Events
mock.module("@tauri-apps/api/event", () => ({
  listen: async () => () => {},
  emit: async () => {},
}));

// 5. Store Resetter (Blueprint logic)
export const resetStores = () => {
  // We will call this before each test once the specific stores are defined
};
