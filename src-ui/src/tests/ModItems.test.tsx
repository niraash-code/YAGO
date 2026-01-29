import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModItem, CompactModItem } from "../components/mod-manager/ModItems";
import React from "react";

describe("Mod Items Components", () => {
  const mockMod = {
    id: "1",
    name: "Test Mod",
    author: "Author",
    version: "1.0.0",
    description: "Description",
    tags: ["Tag1"],
    imageUrl: "",
    enabled: true,
    size: "1MB",
    updated: "2023-01-01",
    compatibility: {
      game: "Test Game",
      character: "Test Character",
      hashes: [],
      fingerprint: "test-fp",
    },
  };

  it("ModItem renders and handles toggle", () => {
    const onToggle = vi.fn();
    render(
      <ModItem
        mod={mockMod}
        isSelected={false}
        canMoveUp={false}
        canMoveDown={false}
        onSelect={() => {}}
        onToggle={onToggle}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        isReorderEnabled={false}
        streamSafe={false}
        nsfwBehavior="blur"
        onRename={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText("Test Mod")).toBeInTheDocument();

    // Use the new data-testid
    const toggle = screen.getByTestId("mod-toggle");
    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalled();
  });

  it("CompactModItem renders and handles move", () => {
    const onMoveUp = vi.fn();
    render(
      <CompactModItem
        mod={mockMod}
        isSelected={false}
        canMoveUp={true}
        canMoveDown={false}
        onSelect={() => {}}
        onToggle={() => {}}
        onMoveUp={onMoveUp}
        onMoveDown={() => {}}
        isReorderEnabled={true}
        streamSafe={false}
        nsfwBehavior="blur"
      />
    );

    const upBtn = screen.getByTestId("mod-move-up");
    fireEvent.click(upBtn);

    expect(onMoveUp).toHaveBeenCalled();
  });
});
