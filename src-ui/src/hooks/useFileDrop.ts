import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useFileDrop(
  onDrop: (paths: string[]) => void,
  onHover?: (isHovering: boolean) => void
) {
  useEffect(() => {
    let unlistenDrop: (() => void) | undefined;
    let unlistenHover: (() => void) | undefined;
    let unlistenCancel: (() => void) | undefined;

    const setup = async () => {
      unlistenDrop = await listen<string[]>("tauri://drag-drop", event => {
        onDrop(event.payload);
        if (onHover) onHover(false);
      });

      unlistenHover = await listen<void>("tauri://drag-over", () => {
        if (onHover) onHover(true);
      });

      unlistenCancel = await listen<void>("tauri://drag-leave", () => {
        if (onHover) onHover(false);
      });
    };

    setup();

    return () => {
      if (unlistenDrop) unlistenDrop();
      if (unlistenHover) unlistenHover();
      if (unlistenCancel) unlistenCancel();
    };
  }, [onDrop, onHover]);
}
