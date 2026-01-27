import React from "react";
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
    <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Mod Loader</h3>
          <p className="text-xs text-zinc-400">
            Required for character skins and shaders.
          </p>
        </div>

        {status === "idle" && (
          <button
            onClick={() => installGameLoader(gameId)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-lg transition-colors border border-cyan-500/20"
          >
            <Download size={14} />
            Install/Update Loader
          </button>
        )}

        {status === "done" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
              <CheckCircle2 size={14} />
              Installed
            </div>
            <button
              onClick={() => installGameLoader(gameId)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Force Update"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {status === "working" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-2">
              <Loader2 size={10} className="animate-spin" />
              Downloading assets...
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] text-red-400 font-medium">
              Installation Failed
            </p>
            <p className="text-[10px] text-red-400/70 line-clamp-1">{error}</p>
          </div>
          <button
            onClick={() => installGameLoader(gameId)}
            className="text-[10px] text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ReShade Card */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">ReShade Core</h3>
          <p className="text-xs text-zinc-400">
            Post-processing injector (Bundled).
          </p>
        </div>

        {status === "idle" && (
          <button
            onClick={() => installGameLoader(gameId)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 text-xs font-medium rounded-lg transition-colors border border-zinc-500/20"
          >
            <Download size={14} />
            Update
          </button>
        )}

        {status === "done" && (
          <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
            <CheckCircle2 size={14} />
            Ready
          </div>
        )}
      </div>
    </div>
  );
};
