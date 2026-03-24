import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  HardDrive,
  Cpu,
  Download,
  User,
  Monitor,
  Copy,
  Check,
  Shield,
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
      <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col divide-y divide-border shadow-xl">
        {/* Header / Game Status */}
        <div className="p-4 bg-background flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Status
            </span>
          </div>
          <div
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
              isDownloading || game.status === InstallStatus.UPDATING
                ? "bg-primary text-primary-foreground border-primary/50"
                : game.status === InstallStatus.PLAYING
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border"
            )}
          >
            {isDownloading ? "SYNC" : game.status}
          </div>
        </div>

        {/* Core Stats */}
        <div className="p-4 space-y-4 bg-card">
          {isDownloading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                <span>{statusText}</span>
                <span>{Math.round(displayProgress)}%</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProgress}%` }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center justify-between bg-background px-3 py-2 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HardDrive size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Disk
                </span>
              </div>
              <span className="text-xs font-black text-foreground font-mono uppercase">
                {game.size}
              </span>
            </div>

            <div className="flex items-center justify-between bg-background px-3 py-2 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Profile
                </span>
              </div>
              <span className="text-xs font-black text-foreground truncate max-w-[100px] uppercase italic">
                {activeProfile?.name || "Default"}
              </span>
            </div>

            <div className="flex items-center justify-between bg-background px-3 py-2 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Download size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Mods
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isInjectionActive ? "bg-primary" : "bg-destructive"
                  )}
                />
                <span className="text-xs font-black text-foreground font-mono">
                  {enabledModCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Runtime Environment */}
        <div className="p-4 bg-card space-y-3 border-t border-border">
          <div className="flex items-center gap-3">
            <Cpu size={14} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                Runner
              </div>
              <div className="text-xs text-foreground truncate font-bold">
                {runnerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Monitor size={14} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                Display
              </div>
              <div className="text-xs text-foreground font-bold">
                {displayResolution}
              </div>
            </div>
          </div>
        </div>

        {/* Identity Footer */}
        <div className="p-4 bg-background border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Gamer ID
            </span>
            {streamSafe ? (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic font-bold">
                <Shield size={10} />
                <span>HIDDEN</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="font-mono text-xs text-primary font-bold">
                  {mockUid}
                </span>
                <button
                  onClick={handleCopyUid}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <Check size={12} className="text-primary" />
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
