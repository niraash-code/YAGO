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
} from "lucide-react";
import { SystemStats, Game, InstallStatus } from "../types";
import { cn } from "../lib/utils";
import { useAppStore } from "../store/gameStore";

interface SystemStatusCardProps {
  stats: SystemStats;
  game: Game;
  streamSafe: boolean;
}

import { InjectionMethod } from "../lib/api";

const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
  stats,
  game,
  streamSafe,
}) => {
  const [copied, setCopied] = useState(false);
  const { isDownloading: storeDownloading, downloadProgress } = useAppStore();

  const activeProfile = game.profiles.find(p => p.id === game.activeProfileId);
  const enabledModCount = activeProfile?.enabledModIds.length || 0;

  // Injection Status: Active if method != None
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

  // Mock UID based on game ID
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
      className="w-96 flex flex-col gap-4"
    >
      {/* SECTION 1: Game Status */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            Game Status
          </span>
          <div
            className={cn(
              "px-2.5 py-1 rounded text-xs font-bold border",
              isDownloading || game.status === InstallStatus.UPDATING
                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                : game.status === InstallStatus.PLAYING
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : game.status === InstallStatus.INSTALLED
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-slate-700/50 text-slate-400 border-slate-600"
            )}
          >
            {isDownloading ? "DOWNLOADING" : game.status}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Text & Progress */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-base text-white font-semibold">
                {statusText}
              </span>
              {isDownloading && (
                <span className="text-xs font-mono text-indigo-400">
                  {Math.round(displayProgress)}%
                </span>
              )}
            </div>

            {isDownloading && (
              <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProgress}%` }}
                  className="h-full rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                />
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 shadow-inner">
              <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Size on Disk
              </div>
              <div className="text-sm font-mono text-slate-200 flex items-center gap-2">
                <HardDrive size={16} className="text-slate-500" />
                {isDownloading
                  ? `${((parseFloat(game.size) * displayProgress) / 100).toFixed(1)} GB`
                  : game.size}
              </div>
            </div>
            <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 shadow-inner">
              <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Available Mods
              </div>
              <div className="text-sm font-mono text-slate-200 flex items-center gap-2">
                <Download size={16} className="text-slate-500" />
                {game.mods.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Active Profile */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <User size={16} className="text-indigo-400" />
            Active Profile
          </span>
          <div className="text-sm text-white font-semibold">
            {activeProfile?.name || "Default"}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Runner & Resolution */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-950/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 shadow-inner min-w-0">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <Cpu size={18} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Runner
                </div>
                <div
                  className="text-sm text-white truncate font-medium"
                  title={runnerName}
                >
                  {runnerName}
                </div>
              </div>
            </div>
            <div className="flex-1 bg-slate-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 shadow-inner min-w-0">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <Monitor size={18} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Res
                </div>
                <div className="text-sm text-white truncate font-medium">
                  {displayResolution}
                </div>
              </div>
            </div>
          </div>

          {/* Mod Status */}
          <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isInjectionActive
                    ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                    : "bg-red-500"
                )}
              />
              <span className="text-sm font-medium text-slate-300">
                Mod Engine
              </span>
            </div>
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded",
                isInjectionActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}
            >
              {isInjectionActive ? "ACTIVE" : "DISABLED"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-400 px-1 font-medium">
            <span>Active Mods Loaded</span>
            <span className="text-white font-mono text-base">
              {enabledModCount}
            </span>
          </div>

          {/* Gamer ID (Stream Safe) */}
          <div className="pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Hash size={14} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Gamer ID
                </span>
              </div>
              <div className="flex items-center gap-2">
                {streamSafe ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 italic font-medium">
                    <Shield size={12} />
                    <span>Hidden (Stream Mode)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/20 transition-colors group">
                    <span className="font-mono text-sm text-indigo-300">
                      {mockUid}
                    </span>
                    <button
                      onClick={handleCopyUid}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Copy ID"
                    >
                      {copied ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SystemStatusCard;
