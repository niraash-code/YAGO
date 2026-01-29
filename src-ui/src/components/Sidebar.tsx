import React, { useRef } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Game, InstallStatus } from "../types";
import {
  Settings,
  Ghost,
  Plus,
  Play,
  Download,
  RefreshCw,
  Package,
  LayoutDashboard,
} from "lucide-react";
import { useAppStore } from "../store/gameStore";
import { cn } from "../lib/utils";
import { Tooltip } from "./ui/Tooltip";

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
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div className="w-72 h-full flex flex-col bg-slate-950/40 backdrop-blur-2xl border-r border-white/5 relative z-20 shadow-2xl overflow-hidden font-sans">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="p-6 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
          Y
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/90 leading-tight">
            Yet Another
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-400 leading-tight">
            Game Organizer
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 mb-8 space-y-1.5 shrink-0">
        <button
          onClick={() => onChangeView("overview")}
          className={cn(
            "w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 outline-none",
            currentView === "overview"
              ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => onChangeView("mods")}
          className={cn(
            "w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 outline-none",
            currentView === "mods"
              ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <Package size={18} />
          <span>Mods</span>
        </button>
        <button
          onClick={() => onChangeView("skins")}
          className={cn(
            "w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 outline-none",
            currentView === "skins"
              ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <Ghost size={18} />
          <span>Skins</span>
        </button>
      </div>

      {/* Game List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-2 flex items-center justify-between shrink-0 mb-2">
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
            Library
          </h2>
        </div>

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
                      paddingBottom: "8px",
                    }}
                  >
                    <button
                      onClick={() => selectGame(game.id)}
                      className={cn(
                        "w-full h-full group relative flex items-center px-4 rounded-2xl transition-all duration-300 outline-none overflow-hidden",
                        isSelected
                          ? "bg-indigo-500/10 ring-1 ring-white/10 shadow-lg"
                          : "hover:bg-white/5"
                      )}
                    >
                      <div className="relative z-10 flex items-center gap-4 w-full">
                        {/* Game Icon */}
                        <div
                          className={cn(
                            "relative w-20 h-10 rounded-lg overflow-hidden bg-slate-950/40 border transition-all duration-500 shrink-0 flex items-center justify-center p-1",
                            isSelected
                              ? "border-white/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                              : "border-white/5 group-hover:border-white/10"
                          )}
                        >
                          {game.icon ? (
                            <img
                              src={game.icon}
                              alt={game.name}
                              className={cn(
                                "w-full h-full object-contain transition-all duration-500",
                                isSelected
                                  ? "opacity-100 scale-105"
                                  : "opacity-40 grayscale group-hover:opacity-80 group-hover:grayscale-0 group-hover:scale-110"
                              )}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-black text-sm text-white/40 italic"
                              style={{ color: game.accentColor }}
                            >
                              {game.logoInitial}
                            </div>
                          )}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div
                            className={cn(
                              "font-black text-[13px] truncate transition-colors uppercase tracking-tight",
                              isSelected
                                ? "text-white"
                                : "text-slate-500 group-hover:text-slate-300"
                            )}
                          >
                            {game.name}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {game.status === InstallStatus.PLAYING ? (
                              <span className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-black uppercase tracking-tighter">
                                <Play size={10} fill="currentColor" /> Live
                              </span>
                            ) : game.status === InstallStatus.UPDATING || game.status === InstallStatus.DOWNLOADING ? (
                              <span className="flex items-center gap-1.5 text-[10px] text-yellow-500 font-black uppercase tracking-tighter animate-pulse">
                                <RefreshCw size={10} className="animate-spin" />{" "}
                                Sync
                              </span>
                            ) : game.status === InstallStatus.REMOTE ? (
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                <Cloud size={10} /> Cloud
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-tighter",
                                  isSelected
                                    ? "text-slate-400"
                                    : "text-slate-600"
                                )}
                              >
                                {game.regions} Regions
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Active Indicator Bar */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeBar"
                          className="absolute right-0 top-4 bottom-4 w-1 rounded-l-full shadow-[0_0_15px_currentColor]"
                          style={{ backgroundColor: game.accentColor }}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </LayoutGroup>
          </div>

          {/* Add Game Button - Restored & Enlarged */}
          <div className="pt-2">
            <Tooltip content="Add New Game" position="right" className="w-full">
              <button
                onClick={onOpenAddGame}
                className="w-full group relative flex items-center justify-center gap-3 py-4 rounded-2xl border border-dashed border-white/10 text-slate-500 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 shadow-sm outline-none"
              >
                <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                  <Plus size={20} />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">
                  Add Game
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
        <Tooltip
          content="Manage Global Settings"
          position="right"
          className="w-full"
        >
          <button
            onClick={onOpenAppSettings}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 outline-none group"
          >
            <div className="flex items-center gap-3">
              <Settings
                size={20}
                className="group-hover:rotate-90 transition-transform duration-500"
              />
              <span className="text-xs font-bold uppercase tracking-widest">
                App Settings
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 transition-colors shadow-[0_0_10px_rgba(99,102,241,0)] group-hover:shadow-indigo-500/50" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Sidebar;
