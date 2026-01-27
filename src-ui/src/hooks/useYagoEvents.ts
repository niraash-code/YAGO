import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../store/gameStore";
import { DownloadProgress } from "../types/backend";

export const useYagoEvents = () => {
  const { toggleStreamSafe, setIsRunning } = useAppStore();

  useEffect(() => {
    let unlistenPanic: () => void;
    let unlistenDownload: () => void;
    let unlistenGameStatus: () => void;

    const setupListeners = async () => {
      // Panic Switch
      unlistenPanic = await listen("PANIC_TRIGGERED", () => {
        console.log("PANIC TRIGGERED: Engaging Safety Protocols");
        // Force blur immediately
        useAppStore.setState({ nsfwBehavior: "blur" });
        // We might want a dedicated "Panic Mode" state in store
        // For now, toggle stream safe might not be enough if it just hides UI
        // We will add a dedicated panic flag to store later or use what we have.
        // Assuming we update the store to handle a global "panic" state.
        useAppStore.setState({ streamSafe: true }); // Ensure safe mode is ON

        // Dispatch a custom event for the overlay if not using store
        window.dispatchEvent(new Event("YAGO_PANIC"));
      });

      // Download Progress
      unlistenDownload = await listen<DownloadProgress>(
        "DOWNLOAD_PROGRESS",
        event => {
          useAppStore.setState({
            downloadProgress: event.payload.progress,
            isDownloading: true,
          });
        }
      );

      // Task Completed Feedback
      const unlistenTask = await listen<string>("task-completed", event => {
        console.log(`Backend Task Completed: ${event.payload}`);
        // Could trigger a toast notification here if available
      });
    };

    setupListeners();

    return () => {
      if (unlistenPanic) unlistenPanic();
      if (unlistenDownload) unlistenDownload();
    };
  }, []);
};
