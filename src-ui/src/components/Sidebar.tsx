import React, { useRef } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Game, InstallStatus } from "../types";
import {
  Box,
  Settings,
  Ghost,
  Plus,
  Play,
  Download,
  RefreshCw,
  Package,
} from "lucide-react";
import { useAppStore } from "../store/gameStore";
import { cn } from "../lib/utils";

interface SidebarProps {
  currentView: "overview" | "mods" | "skins";
  onChangeView: (view: "overview" | "mods" | "skins") => void;
  onOpenAddGame: () => void;
  onOpenAppSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  onOpenAddGame,
  onOpenAppSettings,
}) => {
  const { games, selectedGameId, selectGame } = useAppStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: games.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Approximate height of a game card (p-3 + h-12 + extra padding/border)
    overscan: 5,
  });

  return (
    <div className="w-80 h-full flex flex-col bg-slate-950/80 backdrop-blur-xl border-r border-white/5 relative z-20 shadow-2xl">
      {/* Header */}
      <div className="p-6 flex items-center gap-4 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
          Y
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight text-white drop-shadow-sm">
            YAGO
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Game Organizer
          </p>
        </div>
      </div>

      {/* Game List (Virtualized) */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">
          Library
        </h2>

        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            <LayoutGroup>
              {rowVirtualizer.getVirtualItems().map(virtualItem => {
                const game = games[virtualItem.index];
                const isSelected = selectedGameId === game.id;

                return (
                  <div
                    key={game.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: "8px", // Gap between items
                    }}
                  >
                    <button
                      onClick={() => {
                        selectGame(game.id);
                        // Removed onChangeView('overview') to allow staying in ModManager when switching games
                      }}
                      className={cn(
                        "w-full h-full group relative flex items-center p-3 rounded-xl transition-all duration-300 outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                        isSelected ? "bg-white/5" : "hover:bg-white/5"
                      )}
                    >
                      {/* Active Indicator Border/Glow */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeGameBorder"
                          className="absolute inset-0 rounded-xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] z-0 bg-gradient-to-r from-white/5 to-transparent"
                          initial={false}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}

                      {/* Content */}
                      <div className="relative z-10 flex items-center gap-4 w-full">
                        {/* Official Game Icon */}
                        <div
                          className={cn(
                            "relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shadow-md border transition-colors shrink-0",
                            isSelected
                              ? "border-white/20 shadow-indigo-500/10"
                              : "border-white/5"
                          )}
                        >
                          {game.icon ? (
                            <img
                              src={game.icon}
                              alt={game.name}
                              className={cn(
                                "w-full h-full object-cover transition-all duration-300",
                                isSelected
                                  ? "opacity-100 scale-100"
                                  : "opacity-80 scale-100 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-100"
                              )}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-bold text-lg text-white"
                              style={{ backgroundColor: game.accentColor }}
                            >
                              {game.logoInitial}
                            </div>
                          )}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div
                            className={cn(
                              "font-semibold text-[15px] truncate leading-tight transition-colors",
                              isSelected
                                ? "text-white"
                                : "text-slate-400 group-hover:text-slate-200"
                            )}
                          >
                            {game.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {game.status === InstallStatus.PLAYING ? (
                              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                                <Play size={12} fill="currentColor" /> Playing
                              </div>
                            ) : game.status === InstallStatus.UPDATING ? (
                              <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-medium animate-pulse">
                                <RefreshCw size={12} className="animate-spin" />{" "}
                                Updating
                              </div>
                            ) : game.status === InstallStatus.NOT_INSTALLED ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Download size={12} /> Not Installed
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_currentColor]" />{" "}
                                Ready
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selection Bar (Left) */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeBar"
                          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full shadow-[0_0_15px_currentColor]"
                          style={{ backgroundColor: game.accentColor }}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </LayoutGroup>
          </div>

          {/* Add Game Button (At bottom of list content) */}
          <div className="pt-2">
            <button
              onClick={onOpenAddGame}
              className="w-full group relative flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 outline-none"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Add Game</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5 space-y-1 bg-slate-950/50 shrink-0">
        <button
          onClick={() => onChangeView("mods")}
          className={cn(
            "w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none",
            currentView === "mods"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Package size={20} />
          <span>Mod Manager</span>
        </button>
        <button
          onClick={() => onChangeView("skins")}
          className={cn(
            "w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none",
            currentView === "skins"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Ghost size={20} />
          <span>Skin Manager</span>
        </button>
        <button
          onClick={onOpenAppSettings}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
        >
          <Settings size={20} />
          <span>App Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
