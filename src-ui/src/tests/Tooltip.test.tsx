import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Tooltip } from "../components/ui/Tooltip";
import React from "react";

describe("Tooltip Component", () => {
  it("renders children and shows tooltip on hover", async () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Tooltip Label" delay={0.1}>
        <button>Hover Me</button>
      </Tooltip>
    );

    const trigger = screen.getByText("Hover Me");

    // Initial state: not visible
    expect(screen.queryByText("Tooltip Label")).not.toBeInTheDocument();

    // Hover
    fireEvent.mouseEnter(trigger);

    // Fast-forward delay
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should be in portal
    expect(screen.getByText("Tooltip Label")).toBeInTheDocument();

    // Un-hover
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("Tooltip Label")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("applies custom className to wrapper", () => {
    const { container } = render(
      <Tooltip content="Test" className="custom-class">
        <div>Child</div>
      </Tooltip>
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
