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
  onOpenSettings: () => void;
}

export const GameOverview: React.FC<GameOverviewProps> = ({
  selectedGame,
  isRunning,
  isDeploying,
  isLaunching,
  launchStatus,
  handleLaunch,
  onOpenSettings,
}) => {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col justify-center p-10 pb-16 max-w-5xl"
    >
      <div className="mb-4">
        <motion.h1
          key={selectedGame.id + "title"}
          className="text-5xl font-bold tracking-tight text-white drop-shadow-2xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {selectedGame.name}
        </motion.h1>
      </div>

      <div className="flex items-center gap-6 mb-10 text-base text-slate-300 font-medium">
        <div className="flex items-center gap-2 bg-slate-900/40 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm shadow-sm">
          <Globe size={18} className="text-slate-400" />
          <span>{selectedGame.regions} Regions</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/40 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm shadow-sm">
          <Clock size={18} className="text-slate-400" />
          <span>v{selectedGame.version}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/40 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-sm shadow-sm">
          <Circle
            size={12}
            className={
              selectedGame.status === InstallStatus.NOT_INSTALLED
                ? "text-slate-500"
                : selectedGame.status === InstallStatus.PLAYING
                  ? "text-indigo-400 fill-indigo-400"
                  : "text-emerald-400 fill-emerald-400"
            }
          />
          <span>{selectedGame.status}</span>
        </div>
      </div>

      <p className="text-xl text-slate-200/90 leading-relaxed max-w-3xl mb-12 drop-shadow-md font-light tracking-wide">
        {selectedGame.description}
      </p>

      <div className="flex items-center gap-5">
        {selectedGame.status === InstallStatus.NOT_INSTALLED ? (
          <button className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl flex items-center gap-3 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 outline-none">
            <Download size={24} />
            Install Game
          </button>
        ) : (
          <button
            onClick={handleLaunch}
            disabled={isDeploying || isLaunching}
            className={cn(
              "h-16 px-12 rounded-2xl font-bold text-xl flex items-center gap-3 shadow-[0_0_40px_-10px] transition-all hover:scale-105 active:scale-95 text-white focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 outline-none",
              isRunning ? "bg-red-600 hover:bg-red-500 shadow-red-600/40" : "",
              isDeploying || isLaunching ? "opacity-80 cursor-wait" : ""
            )}
            style={
              !isRunning && !isDeploying && !isLaunching
                ? {
                    backgroundColor: selectedGame.accentColor,
                    boxShadow: `0 0 30px -5px ${selectedGame.accentColor}60`,
                  }
                : isDeploying || isLaunching
                  ? {
                      backgroundColor: "#6366f1",
                      boxShadow: `0 0 30px -5px #6366f160`,
                    }
                  : {}
            }
          >
            {isRunning ? (
              <>
                <Circle size={28} className="fill-white" />
                <span>Stop Game</span>
              </>
            ) : isDeploying ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                <span>Deploying...</span>
              </>
            ) : isLaunching ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                <span>{launchStatus || "Launching..."}</span>
              </>
            ) : (
              <>
                <Play size={28} fill="currentColor" />
                <span>Launch Game</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="h-16 w-16 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 outline-none"
        >
          <Settings size={24} />
        </button>

        {selectedGame.status !== InstallStatus.NOT_INSTALLED && (
          <button className="h-16 px-8 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/10 flex items-center gap-3 text-white font-semibold text-lg transition-all hover:scale-105 active:scale-95 outline-none">
            <Wrench size={22} className="text-amber-400" />
            <span>Repair</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
