import React from "react";
import { motion } from "framer-motion";
import { useAssetInstaller } from "../../hooks/useAssetInstaller";
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface LoaderManagerProps {
  gameId: string;
}

export const LoaderManager: React.FC<LoaderManagerProps> = ({ gameId }) => {
  const { installState, installGameLoader } = useAssetInstaller();
  const { status, progress, error } = installState;

  return (
    <div className="p-5 rounded-2xl border border-border bg-muted/10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">
            Mod Loader
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Essential engine for character skins & shaders.
          </p>
        </div>

        {status === "idle" && (
          <button
            onClick={() => installGameLoader(gameId)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-primary/20 active:scale-95 shadow-lg shadow-primary/5"
          >
            <Download size={14} />
            Install
          </button>
        )}

        {status === "done" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
              <CheckCircle2 size={12} />
              Ready
            </div>
            <button
              onClick={() => installGameLoader(gameId)}
              className="p-2 hover:bg-muted/10 rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-90"
              title="Force Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {status === "working" && (
        <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
            <span className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Fetching Assets
            </span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1 w-full bg-muted/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              className="h-full bg-primary"
            />
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-destructive font-black uppercase tracking-widest">
              Engine Failure
            </p>
            <p className="text-[10px] text-destructive/60 truncate font-mono mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={() => installGameLoader(gameId)}
            className="text-[10px] text-destructive font-black uppercase tracking-widest hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ReShade Card */}
      <div className="pt-6 border-t border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">
            ReShade Core
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Advanced post-processing (Bundled).
          </p>
        </div>

        {status === "idle" && (
          <button
            onClick={() => installGameLoader(gameId)}
            className="flex items-center gap-2 px-4 py-2 bg-muted/10 hover:bg-muted/20 text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-border"
          >
            <Download size={14} />
            Update
          </button>
        )}

        {status === "done" && (
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
            <CheckCircle2 size={12} />
            Active
          </div>
        )}
      </div>
    </div>
  );
};
