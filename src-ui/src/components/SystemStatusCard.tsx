import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  HardDrive,
  Cpu,
  Download,
  User,
  Monitor,
  Hash,
  Copy,
  Check,
  Shield,
  Zap,
} from "lucide-react";
import { SystemStats, Game, InstallStatus } from "../types";
import { cn } from "../lib/utils";
import { useAppStore } from "../store/gameStore";
import { InjectionMethod } from "../lib/api";

interface SystemStatusCardProps {
  stats: SystemStats;
  game: Game;
  streamSafe: boolean;
}

const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
  stats,
  game,
  streamSafe,
}) => {
  const [copied, setCopied] = useState(false);
  const { isDownloading: storeDownloading, downloadProgress } = useAppStore();

  const activeProfile = game.profiles.find(p => p.id === game.activeProfileId);
  const enabledModCount = activeProfile?.enabledModIds.length || 0;
  const isInjectionActive = game.injectionMethod !== InjectionMethod.None;

  const isDownloading =
    storeDownloading ||
    (stats.downloadProgress > 0 && stats.downloadProgress < 100);
  const displayProgress = storeDownloading
    ? downloadProgress
    : stats.downloadProgress;
  const statusText = storeDownloading ? "Downloading..." : stats.statusText;

  const displayResolution = activeProfile?.resolution
    ? `${activeProfile.resolution[0]}x${activeProfile.resolution[1]}`
    : "Default";

  const runnerName = game.activeRunnerId || "System Default";

  const mockUid =
    game.id === "genshin"
      ? "800123456"
      : game.id === "hsr"
        ? "700987654"
        : game.id === "zzz"
          ? "100456789"
          : "---";

  const handleCopyUid = () => {
    navigator.clipboard.writeText(mockUid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="w-72 flex flex-col gap-3"
    >
      <div className="bg-slate-950/30 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col divide-y divide-white/5">
        {/* Header / Game Status */}
        <div className="p-4 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Status
            </span>
          </div>
          <div
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold border",
              isDownloading || game.status === InstallStatus.UPDATING
                ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                : game.status === InstallStatus.PLAYING
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
            )}
          >
            {isDownloading ? "SYNC" : game.status.toUpperCase()}
          </div>
        </div>

        {/* Core Stats */}
        <div className="p-4 space-y-4">
          {isDownloading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>{statusText}</span>
                <span>{Math.round(displayProgress)}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProgress}%` }}
                  className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-slate-400">
                <HardDrive size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Disk
                </span>
              </div>
              <span className="text-xs font-mono text-slate-200">
                {game.size}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-slate-400">
                <User size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Profile
                </span>
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[100px]">
                {activeProfile?.name || "Default"}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-slate-400">
                <Download size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Mods
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isInjectionActive
                      ? "bg-emerald-500 shadow-[0_0_5px_#10b981]"
                      : "bg-red-500"
                  )}
                />
                <span className="text-xs font-mono text-white">
                  {enabledModCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Runtime Environment */}
        <div className="p-4 bg-black/20 space-y-3">
          <div className="flex items-center gap-3 opacity-80">
            <Cpu size={14} className="text-slate-500" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                Runner
              </div>
              <div className="text-xs text-slate-300 truncate">
                {runnerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 opacity-80">
            <Monitor size={14} className="text-slate-500" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                Display
              </div>
              <div className="text-xs text-slate-300">{displayResolution}</div>
            </div>
          </div>
        </div>

        {/* Identity Footer */}
        <div className="p-4 bg-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Gamer ID
            </span>
            {streamSafe ? (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic">
                <Shield size={10} />
                <span>Encrypted</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="font-mono text-xs text-indigo-300/80">
                  {mockUid}
                </span>
                <button
                  onClick={handleCopyUid}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SystemStatusCard;
