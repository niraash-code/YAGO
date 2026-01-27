import { useState, useCallback } from "react";
import { api, events } from "../lib/api";
import { useAppStore } from "../store/gameStore";

export interface InstallerState {
  status: "idle" | "working" | "done" | "error";
  progress: number;
  error?: string;
}

export function useAssetInstaller() {
  const { refreshRunners } = useAppStore();
  const [installState, setInstallState] = useState<InstallerState>({
    status: "idle",
    progress: 0,
  });

  const installGameLoader = useCallback(async (gameId: string) => {
    setInstallState({ status: "working", progress: 0 });

    let unlisten: (() => void) | undefined;

    try {
      const unlistenFn = await events.onLoaderProgress(payload => {
        if (payload.game_id === gameId) {
          setInstallState(prev => ({ ...prev, progress: payload.progress }));
        }
      });
      unlisten = unlistenFn;

      if (gameId === "common") {
        await api.installCommonLibs();
      } else {
        await api.downloadLoader(gameId);
      }

      setInstallState({ status: "done", progress: 1 });
    } catch (err) {
      setInstallState({
        status: "error",
        progress: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (unlisten) unlisten();
    }
  }, []);

  const installProton = useCallback(async () => {
    setInstallState({ status: "working", progress: 0 });

    let unlisten: (() => void) | undefined;

    try {
      const unlistenFn = await events.onProtonProgress(payload => {
        setInstallState(prev => ({ ...prev, progress: payload.progress }));
      });
      unlisten = unlistenFn;

      await api.downloadProton();
      await refreshRunners(); // Ensure store knows about new runner
      setInstallState({ status: "done", progress: 1 });
    } catch (err) {
      setInstallState({
        status: "error",
        progress: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (unlisten) unlisten();
    }
  }, [refreshRunners]);

  return { installState, installGameLoader, installProton };
}
