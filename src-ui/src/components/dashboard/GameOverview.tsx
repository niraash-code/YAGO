import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Clock,
  Circle,
  Download,
  RefreshCw,
  Play,
  Settings,
  Wrench,
  ChevronRight,
  Pause,
  PlayCircle,
  HardDrive,
  Package,
  Cpu,
  User,
  CheckCircle2,
} from "lucide-react";
import { Game, InstallStatus, SystemStats } from "../../types";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../store/gameStore";
import { InjectionMethod } from "../../lib/api";

interface GameOverviewProps {
  selectedGame: Game;
  isRunning: boolean;
  isDeploying: boolean;
  isLaunching: boolean;
  launchStatus: string;
  stats: SystemStats | null;
  handleLaunch: () => void;
  handleInstall: () => void;
  onOpenSettings: () => void;
}

export const GameOverview: React.FC<GameOverviewProps> = ({
  selectedGame,
  isRunning,
  isDeploying,
  isLaunching,
  launchStatus,
  stats,
  handleLaunch,
  handleInstall,
  onOpenSettings,
}) => {
  const { pauseDownload, resumeDownload, repairGame, trustGameInstallation } =
    useAppStore();

  const isDownloading =
    selectedGame.status === InstallStatus.DOWNLOADING ||
    selectedGame.status === InstallStatus.UPDATING;

  const showProgress =
    isDownloading || selectedGame.status === InstallStatus.QUEUED;

  const progress = stats?.downloadProgress || 0;
  const statusText =
    stats?.statusText ||
    (selectedGame.status === InstallStatus.QUEUED
      ? "Paused"
      : "Initializing...");

  const activeProfile = selectedGame.profiles.find(
    p => p.id === selectedGame.activeProfileId
  );
  const enabledModCount = activeProfile?.enabledModIds.length || 0;
  const isInjectionActive =
    selectedGame.injectionMethod !== InjectionMethod.None;
  const runnerName = selectedGame.activeRunnerId || "System Default";

  return (
    <div className="h-full flex flex-col p-6 relative overflow-hidden bg-background">
      {/* Background Card */}
      <div className="absolute inset-6 z-0 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGame.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-3xl overflow-hidden border border-border shadow-2xl"
          >
            {selectedGame.coverImage && (
              <img
                src={selectedGame.coverImage}
                alt=""
                className="w-full h-full object-cover opacity-40 grayscale-[0.2]"
              />
            )}
            {/* Semantic Gradient Overlays - Tailored for the card look */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-10">
        {/* Top Section: Title & High-level Status */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-1.5 h-12 rounded-full shadow-[0_0_15px_var(--primary)]"
                  style={{ backgroundColor: selectedGame.accentColor }}
                />
                <h1 className="text-7xl font-black tracking-tighter text-foreground uppercase italic leading-none">
                  {selectedGame.name}
                </h1>
              </div>

              <div className="flex items-center gap-3 pl-4">
                <span className="flex items-center gap-1.5 bg-card/80 px-3 py-1.5 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm">
                  <Clock size={12} className="text-primary" />
                  {selectedGame.version === "Unknown"
                    ? "Unknown"
                    : `v${selectedGame.version}`}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 bg-card/80 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm",
                    selectedGame.status === InstallStatus.PLAYING
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <Circle
                    size={8}
                    className={cn(
                      selectedGame.status === InstallStatus.PLAYING
                        ? "fill-primary"
                        : "fill-muted-foreground/30"
                    )}
                  />
                  {selectedGame.status}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xl text-muted-foreground leading-relaxed pl-4 border-l-2 border-border italic font-medium max-w-xl animate-in fade-in slide-in-from-left-4 duration-700">
            {selectedGame.description}
          </p>
        </div>

        {/* Bottom Section: Integrated Status & Actions */}
        <div className="space-y-8">
          {/* Progress Section (Overlays actions when active) */}
          {showProgress && (
            <div className="pl-4 space-y-3 max-w-md animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                  {statusText}
                </span>
                <span className="text-lg font-black text-foreground font-mono">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary rounded-full shadow-[0_0_10px_var(--primary)]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6 pl-4">
            {/* Compact Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { icon: HardDrive, label: "Storage", value: selectedGame.size },
                {
                  icon: Package,
                  label: "Mods",
                  value: `${enabledModCount} Active`,
                  color: isInjectionActive
                    ? "text-primary"
                    : "text-muted-foreground",
                },
                {
                  icon: User,
                  label: "Loadout",
                  value: activeProfile?.name || "Default",
                },
                { icon: Cpu, label: "Runner", value: runnerName },
              ].map((badge, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border rounded-xl transition-all hover:bg-card hover:border-primary/30 group"
                >
                  <badge.icon
                    size={14}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                  />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter leading-none mb-0.5">
                      {badge.label}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-tight leading-none truncate max-w-[100px]",
                        badge.color || "text-foreground"
                      )}
                    >
                      {badge.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Actions */}
            <div className="flex items-center gap-4">
              {selectedGame.status === InstallStatus.REMOTE ? (
                <button
                  onClick={handleInstall}
                  className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 group shadow-xl shadow-primary/20"
                >
                  <Download size={24} />
                  <span>Initialize</span>
                  <ChevronRight
                    size={20}
                    className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                  />
                </button>
              ) : isDownloading ? (
                <button
                  onClick={() => pauseDownload(selectedGame.id)}
                  className="h-16 px-12 rounded-2xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-black text-xl flex items-center gap-4 border border-border transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Pause size={24} />
                  <span>Pause Sync</span>
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleLaunch}
                    disabled={isDeploying || isLaunching}
                    className={cn(
                      "h-16 px-12 rounded-2xl font-black text-xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 text-primary-foreground outline-none group shadow-2xl",
                      isRunning
                        ? "bg-destructive shadow-destructive/20"
                        : "shadow-primary/20",
                      (isDeploying || isLaunching) &&
                        "opacity-80 cursor-wait bg-primary",
                      (selectedGame.version === "Unknown" ||
                        selectedGame.status === InstallStatus.CORRUPTED) &&
                        "bg-amber-600 shadow-amber-500/20"
                    )}
                    style={
                      !isRunning &&
                      !isDeploying &&
                      !isLaunching &&
                      selectedGame.version !== "Unknown" &&
                      selectedGame.status !== InstallStatus.CORRUPTED
                        ? { backgroundColor: selectedGame.accentColor }
                        : {}
                    }
                  >
                    {isRunning ? (
                      <>
                        <Circle size={24} className="fill-primary-foreground" />
                        <span>Terminate</span>
                      </>
                    ) : isDeploying ? (
                      <>
                        <RefreshCw size={24} className="animate-spin" />
                        <span>Deploying</span>
                      </>
                    ) : isLaunching ? (
                      <>
                        <RefreshCw size={24} className="animate-spin" />
                        <span>Launching</span>
                      </>
                    ) : (
                      <>
                        <Play
                          size={24}
                          fill="currentColor"
                          className="group-hover:scale-110 transition-transform"
                        />
                        <span>
                          {selectedGame.version === "Unknown" ||
                          selectedGame.status === InstallStatus.CORRUPTED
                            ? "Force Start"
                            : "Launch Now"}
                        </span>
                      </>
                    )}
                  </button>
                  {(selectedGame.version === "Unknown" ||
                    selectedGame.status === InstallStatus.CORRUPTED) && (
                    <button
                      onClick={() => {
                        trustGameInstallation(selectedGame.id);
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-[10px] font-black uppercase tracking-widest text-primary transition-all border border-primary/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={12} />
                      Trust Installation
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenSettings}
                  className="h-16 w-16 rounded-2xl bg-card hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 shadow-lg"
                  title="Configurations"
                >
                  <Settings size={24} />
                </button>

                {(selectedGame.status === InstallStatus.INSTALLED ||
                  selectedGame.status === InstallStatus.CORRUPTED) && (
                  <button
                    onClick={() => repairGame(selectedGame.id)}
                    className="h-16 px-8 rounded-2xl bg-card hover:bg-muted border border-border flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 text-sm font-black uppercase tracking-widest shadow-lg"
                  >
                    <Wrench size={20} className="text-amber-500" />
                    <span>Fix</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
