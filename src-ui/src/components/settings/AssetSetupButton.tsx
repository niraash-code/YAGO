import React, { useState, useCallback } from "react";
import {
  Download,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api, events } from "../../lib/api";
import { cn } from "../../lib/utils";

interface AssetSetupButtonProps {
  gameId: string;
  assetType: "loader" | "reshade";
  label: string;
}

export const AssetSetupButton: React.FC<AssetSetupButtonProps> = ({
  gameId,
  assetType,
  label,
}) => {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = useCallback(async () => {
    setStatus("working");
    setProgress(0);
    setError(null);

    let unlisten: (() => void) | undefined;

    try {
      unlisten = await events.onLoaderProgress(payload => {
        if (payload.game_id === gameId || payload.game_id === "common") {
          setProgress(payload.progress);
        }
      });

      if (assetType === "loader") {
        await api.downloadLoader(gameId);
      } else {
        await api.installReshade(gameId);
      }

      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error(`${assetType} setup failed:`, err);
      setError(String(err));
      setStatus("error");
    } finally {
      if (unlisten) unlisten();
    }
  }, [gameId, assetType]);

  return (
    <div className="space-y-3 mt-4">
      {status === "idle" && (
        <button
          onClick={handleSetup}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-primary/20 active:scale-95 shadow-lg shadow-primary/5"
        >
          <Download size={14} />
          {label}
        </button>
      )}

      {status === "working" && (
        <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
            <span className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Initializing {assetType}...
            </span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1 w-full bg-muted/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95">
          <CheckCircle2 size={12} />
          Setup Complete
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 animate-in">
          <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-destructive font-black uppercase tracking-widest">
              Setup Error
            </p>
            <p className="text-[9px] text-destructive/60 truncate font-mono mt-0.5">
              {error}
            </p>
          </div>
          <button
            onClick={handleSetup}
            className="text-[10px] text-destructive font-black uppercase tracking-widest hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
