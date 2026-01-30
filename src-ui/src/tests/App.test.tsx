import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";
import { useAppStore } from "../store/gameStore";
import React from "react";

// Mock child components to simplify App testing
vi.mock("../components/TitleBar", () => ({
  default: () => <div data-testid="titlebar" />,
}));
vi.mock("../components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock("../components/SystemStatusCard", () => ({
  default: () => <div data-testid="status-card" />,
}));
vi.mock("../components/SettingsDrawer", () => ({
  default: () => <div data-testid="settings-drawer" />,
}));
vi.mock("../components/AddGameModal", () => ({
  default: () => <div data-testid="add-game-modal" />,
}));
vi.mock("../components/CoverManagerModal", () => ({
  default: () => <div data-testid="cover-manager-modal" />,
}));
vi.mock("../components/ModManager", () => ({
  default: () => <div data-testid="mod-manager" />,
}));
vi.mock("../components/PanicOverlay", () => ({
  PanicOverlay: () => <div data-testid="panic-overlay" />,
}));
vi.mock("../components/ConflictModal", () => ({
  ConflictModal: () => <div data-testid="conflict-modal" />,
}));
vi.mock("../components/ui/GlobalDialogs", () => ({
  GlobalDialogs: () => <div data-testid="global-dialogs" />,
}));

describe("App", () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      games: [],
      selectedGameId: "",
      isRunning: false,
      isInitialized: false as any, // Not in state but used in App
      initialize: vi.fn().mockResolvedValue(undefined),
      initializeEvents: vi.fn().mockResolvedValue(() => {}),
    });
  });

  it("renders loading state initially", () => {
    render(<App />);
    expect(screen.getByText(/Synchronizing/i)).toBeInTheDocument();
  });
});
