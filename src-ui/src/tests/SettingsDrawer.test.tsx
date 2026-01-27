import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsDrawer from "../components/SettingsDrawer";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import React from "react";

// Mock Lucide icons
vi.mock("lucide-react", async importOriginal => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    X: () => <div data-testid="icon-x" />,
    Edit2: () => <div data-testid="icon-edit" />,
    Check: () => <div data-testid="icon-check" />,
  };
});

describe("SettingsDrawer", () => {
  const mockGame = {
    id: "game-123",
    name: "Original Name",
    developer: "Original Dev",
    description: "Original Desc",
    icon: "icon.png",
    coverImage: "cover.jpg",
    installPath: "/path/to/game",
    exeName: "game.exe",
    launchArgs: ["-global"],
    autoUpdate: true,
    activeProfileId: "p1",
    injectionMethod: "Proxy",
    profiles: [
      {
        id: "p1",
        name: "Default Profile",
        description: "Default Desc",
        launchArgs: ["-profile"],
        saveDataPath: "/saves",
        useGamescope: false,
        useGamemode: false,
        useMangohud: true,
        resolution: [1920, 1080],
      },
    ],
    mods: [],
    fpsConfig: {
      enabled: true,
      target_fps: 60,
      search_pattern: "7F 0F",
      offset: 0,
    },
  };

  const mockUpdateGameConfig = vi.fn();
  const mockUpdateProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      updateGameConfig: mockUpdateGameConfig,
      updateProfile: mockUpdateProfile,
      availableRunners: [],
      refreshRunners: vi.fn(),
    });
    useUiStore.setState({
      showAlert: vi.fn(),
      showConfirm: vi.fn(),
    });
  });

  it("renders all general settings correctly", () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );

    // Use getAllByText for name because it appears in header and in the setting field
    expect(screen.getAllByText("Original Name")[0]).toBeInTheDocument();
    expect(screen.getByText("Original Dev")).toBeInTheDocument();
    // Match the description paragraph
    expect(
      screen.getByText("Original Desc", { selector: "p" })
    ).toBeInTheDocument();
  });

  it("updates game name setting", async () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );

    // 1. Click edit on Display Name (the first one)
    const editButtons = screen.getAllByTestId("icon-edit");
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    // 2. Type new name
    const input = screen.getByDisplayValue("Original Name");
    await act(async () => {
      fireEvent.change(input, { target: { value: "New Game Name" } });
    });

    // 3. Click save
    const saveButton = screen.getByText("Save");
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(mockUpdateGameConfig).toHaveBeenCalledWith(
      "game-123",
      expect.objectContaining({
        name: "New Game Name",
      })
    );
  });

  it("navigates to installation tab and verifies fields", () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );

    fireEvent.click(screen.getByText("installation"));

    // Check by mono span
    expect(
      screen.getByText("/path/to/game", { selector: "span" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("game.exe", { selector: "span" })
    ).toBeInTheDocument();
    // Use substring match for args
    expect(
      screen.getByText(content => content.includes("-global"))
    ).toBeInTheDocument();
  });

  it("updates developer setting", async () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );
    const editButtons = screen.getAllByTestId("icon-edit");
    await act(async () => {
      fireEvent.click(editButtons[1]); // Developer is second
    });
    const input = screen.getByDisplayValue("Original Dev");
    await act(async () => {
      fireEvent.change(input, { target: { value: "New Dev" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(mockUpdateGameConfig).toHaveBeenCalledWith(
      "game-123",
      expect.objectContaining({ developer: "New Dev" })
    );
  });

  it("updates global launch arguments", async () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("installation"));
    });
    const editButtons = screen.getAllByTestId("icon-edit");
    await act(async () => {
      fireEvent.click(editButtons[2]); // Global Launch Args is 3rd in Installation tab
    });
    const input = screen.getByDisplayValue("-global");
    await act(async () => {
      fireEvent.change(input, { target: { value: "-global -new" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(mockUpdateGameConfig).toHaveBeenCalledWith(
      "game-123",
      expect.objectContaining({ launchArgs: ["-global", "-new"] })
    );
  });

  it("updates prefix path on Linux", async () => {
    // Mock Linux environment
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Linux",
      configurable: true,
    });

    const gameWithPrefix = { ...mockGame, prefixPath: "/old/prefix" };
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={gameWithPrefix as any}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("installation"));
    });

    // Find Prefix Path input by label
    const editButtons = screen.getAllByTestId("icon-edit");
    await act(async () => {
      fireEvent.click(editButtons[5]);
    });

    const input = screen.getByDisplayValue("/old/prefix");
    await act(async () => {
      fireEvent.change(input, { target: { value: "/new/prefix" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });

    expect(mockUpdateGameConfig).toHaveBeenCalledWith(
      "game-123",
      expect.objectContaining({
        prefixPath: "/new/prefix",
      })
    );
  });

  it("updates profile specific setting (Save Path)", async () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("installation"));
    });
    const editButtons = screen.getAllByTestId("icon-edit");
    await act(async () => {
      fireEvent.click(editButtons[4]); // Save Data Path is 5th
    });
    const input = screen.getByDisplayValue("/saves");
    await act(async () => {
      fireEvent.change(input, { target: { value: "/new/saves" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      "game-123",
      "p1",
      expect.objectContaining({ saveDataPath: "/new/saves" })
    );
  });

  it("toggles Linux features (Gamemode)", async () => {
    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );
    fireEvent.click(screen.getByText("advanced"));

    // The toggle is a button in a div next to the label
    const gamemodeLabel = screen.getByText("Gamemode");
    // Find all buttons in the document and click the one that follows Gamemode text
    const buttons = screen.getAllByRole("button");
    // We can filter by class or just find the one after the label in the DOM
    const toggleButton = buttons.find(
      b =>
        b.previousElementSibling?.contains(gamemodeLabel) ||
        b.parentElement?.contains(gamemodeLabel)
    );

    if (toggleButton) fireEvent.click(toggleButton);
    else {
      // Fallback: look for the button by finding the parent container
      const container = screen
        .getByText("Gamemode")
        .closest("div")?.parentElement;
      const btn = container?.querySelector("button");
      if (btn) fireEvent.click(btn);
    }

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      "game-123",
      "p1",
      expect.objectContaining({ useGamemode: true })
    );
  });

  it("selects a compatibility runner on Linux", async () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Linux",
      configurable: true,
    });

    useAppStore.setState({ availableRunners: ["Proton-GE-1", "Proton-GE-2"] });

    render(
      <SettingsDrawer
        isOpen={true}
        onClose={() => {}}
        onUninstall={() => {}}
        game={mockGame as any}
      />
    );
    fireEvent.click(screen.getByText("advanced"));

    // The runner selection is a <select> element
    const runnerSelect = screen.getByDisplayValue("System Default");
    fireEvent.change(runnerSelect, { target: { value: "Proton-GE-1" } });

    expect(mockUpdateGameConfig).toHaveBeenCalledWith(
      "game-123",
      expect.objectContaining({
        activeRunnerId: "Proton-GE-1",
      })
    );
  });
});
