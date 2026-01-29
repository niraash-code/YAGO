import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CoverManagerModal from "../components/CoverManagerModal";
import { useAppStore } from "../store/gameStore";
import React from "react";

// Mock API locally to ensure it is a vitest mock
vi.mock("../lib/api", () => ({
  api: {
    getCommunityBackgrounds: vi.fn().mockResolvedValue([]),
    updateGameConfig: vi.fn().mockResolvedValue(undefined),
  }
}));

import { api } from "../lib/api";

describe("CoverManagerModal", () => {
  const mockGame = {
    id: "genshin",
    name: "Genshin Impact",
    coverImage: "old-cover.jpg",
    profiles: [],
    mods: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      updateGameConfig: vi.fn(),
      appConfig: { presetCovers: ["preset1.jpg"] } as any,
    });
  });

  it("fetches and displays community backgrounds", async () => {
    const mockImages = ["official1.jpg", "official2.jpg"];
    (api.getCommunityBackgrounds as any).mockResolvedValue(mockImages);

    render(
      <CoverManagerModal
        isOpen={true}
        onClose={() => {}}
        game={mockGame as any}
      />
    );

    expect(screen.getByText("Official Gallery")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(api.getCommunityBackgrounds).toHaveBeenCalledWith("genshin");
    });

    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(3);
  });

  it("updates preview when an image is clicked", async () => {
    const mockImages = ["official1.jpg"];
    (api.getCommunityBackgrounds as any).mockResolvedValue(mockImages);

    render(
      <CoverManagerModal
        isOpen={true}
        onClose={() => {}}
        game={mockGame as any}
      />
    );

    // Wait for the gallery image to appear by its src
    let galleryImg: HTMLImageElement | null = null;
    await waitFor(() => {
      const imgs = screen.getAllByRole("img") as HTMLImageElement[];
      galleryImg = imgs.find(img => img.src.includes("official1.jpg")) || null;
      expect(galleryImg).not.toBeNull();
    });
    
    const galleryItem = galleryImg!.closest("button");
    if (galleryItem) {
      fireEvent.click(galleryItem);
    }

    // Preview image src should change
    const preview = screen.getByAltText("Preview") as HTMLImageElement;
    expect(preview.src).toContain("official1.jpg");
  });
});
