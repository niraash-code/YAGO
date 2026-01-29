import React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Game, InstallStatus } from "../../types";
import { cn } from "../../lib/utils";

interface GameOverviewProps {
  selectedGame: Game;
  isRunning: boolean;
  isDeploying: boolean;
  isLaunching: boolean;
  launchStatus: string;
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
  handleLaunch,
  handleInstall,
  onOpenSettings,
}) => {
  return (
    <div className="h-full flex flex-col justify-end p-12 pb-20 relative overflow-hidden">
      {/* Background Accent Gradient - Subtle subtle lift */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none z-0" />

      <motion.div
        key={selectedGame.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 max-w-2xl"
      >
        {/* Game Title & Metadata */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-1.5 h-10 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              style={{ backgroundColor: selectedGame.accentColor }}
            />
            <h1 className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl uppercase">
              {selectedGame.name}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest pl-4">
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 backdrop-blur-sm">
              <Globe size={12} className="text-indigo-400" />
              {selectedGame.regions} Regions
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 backdrop-blur-sm">
              <Clock size={12} className="text-indigo-400" />v
              {selectedGame.version}
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 backdrop-blur-sm">
              <Circle
                size={8}
                className={cn(
                  selectedGame.status === InstallStatus.REMOTE
                    ? "text-slate-500"
                    : selectedGame.status === InstallStatus.PLAYING
                      ? "text-indigo-400 fill-indigo-400"
                      : selectedGame.status === InstallStatus.CORRUPTED
                        ? "text-red-500 fill-red-500"
                        : "text-emerald-400 fill-emerald-400"
                )}
              />
              {selectedGame.status}
            </span>
          </div>
        </div>

        {/* Description - More readable, less central */}
        <p className="text-lg text-slate-300/90 leading-relaxed mb-10 pl-4 border-l border-white/10 italic font-medium drop-shadow-md max-w-xl">
          {selectedGame.description}
        </p>

        {/* Unified Action Hub */}
        <div className="flex items-center gap-4 pl-4">
          {selectedGame.status === InstallStatus.REMOTE ? (
            <button
              onClick={handleInstall}
              className="h-14 px-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg flex items-center gap-3 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95 group"
            >
              <Download size={20} />
              <span>Install Content</span>
              <ChevronRight
                size={18}
                className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isDeploying || isLaunching}
              className={cn(
                "h-14 px-10 rounded-xl font-bold text-lg flex items-center gap-3 shadow-[0_0_30px_-10px] transition-all hover:scale-[1.02] active:scale-95 text-white focus-visible:ring-4 focus-visible:ring-white outline-none group",
                isRunning
                  ? "bg-red-600 hover:bg-red-500 shadow-red-600/40"
                  : "",
                isDeploying || isLaunching
                  ? "opacity-80 cursor-wait bg-indigo-600"
                  : ""
              )}
              style={
                !isRunning && !isDeploying && !isLaunching
                  ? {
                      backgroundColor: selectedGame.accentColor,
                      boxShadow: `0 0 25px -5px ${selectedGame.accentColor}50`,
                    }
                  : {}
              }
            >
              {isRunning ? (
                <>
                  <Circle size={24} className="fill-white" />
                  <span>Stop Game</span>
                </>
              ) : isDeploying ? (
                <>
                  <RefreshCw size={24} className="animate-spin" />
                  <span>Deploying...</span>
                </>
              ) : isLaunching ? (
                <>
                  <RefreshCw size={24} className="animate-spin" />
                  <span>{launchStatus || "Starting..."}</span>
                </>
              ) : (
                <>
                  <Play
                    size={24}
                    fill="currentColor"
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span>Launch Game</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="h-14 w-14 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
              title="Configurations"
            >
              <Settings size={20} />
            </button>

            {(selectedGame.status === InstallStatus.INSTALLED ||
              selectedGame.status === InstallStatus.CORRUPTED) && (
              <button className="h-14 px-6 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 text-sm font-bold">
                <Wrench size={18} className="text-amber-400" />
                <span>Fix</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
