import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Tauri's invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  transformCallback: vi.fn(),
}));

// Mock API
vi.mock("../../lib/api", () => ({
  api: {
    listRunners: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn(),
    getLibrary: vi.fn(),
    updateSettings: vi.fn(),
  },
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
