import { expect, test, describe } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Force immediate registration before store import
GlobalRegistrator.register();

import { useUiStore } from "../store/uiStore";

describe("The Glass Cage: State Sovereignty", () => {
  test("Theme Engine: Rose Pine Transition (The 16ms Rule)", () => {
    const { setTheme, theme } = useUiStore.getState();
    
    expect(theme).toBeDefined();
    
    // 1. Arm the Guillotine
    const start = performance.now();
    
    // 2. Trigger the Lunar Weave
    setTheme("rose-pine-moon");
    
    // 3. Drop the Blade
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(16); // Must finish in under 1 frame
    
    // 4. Capture the State Snapshot
    expect(useUiStore.getState().theme).toBe("rose-pine-moon");
  });
});