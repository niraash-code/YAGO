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
  Cloud,
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
    <div className="w-72 h-full flex flex-col bg-sidebar border-r border-border relative z-20 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-6 flex items-center gap-3 shrink-0 bg-sidebar border-b border-border">
        <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
          Y
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground leading-tight">
            Yet Another
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary leading-tight">
            Game Organizer
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-6 space-y-1.5 shrink-0 bg-sidebar">
        <Tooltip content="Dashboard" position="right" className="w-full">
          <button
            onClick={() => onChangeView("overview")}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-3 rounded text-[10px] font-black uppercase tracking-widest transition-all outline-none",
              currentView === "overview"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
        </Tooltip>
        <Tooltip content="Mod Manager" position="right" className="w-full">
          <button
            onClick={() => onChangeView("mods")}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-3 rounded text-[10px] font-black uppercase tracking-widest transition-all outline-none",
              currentView === "mods"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Package size={16} />
            <span>Mod Manager</span>
          </button>
        </Tooltip>
        <Tooltip content="Skin Manager" position="right" className="w-full">
          <button
            onClick={() => onChangeView("skins")}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-3 rounded text-[10px] font-black uppercase tracking-widest transition-all outline-none",
              currentView === "skins"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Ghost size={16} />
            <span>Wardrobe</span>
          </button>
        </Tooltip>
      </div>

      {/* Game List */}
      <div className="flex-1 flex flex-col min-h-0 bg-sidebar">
        <div className="px-6 py-2 flex items-center justify-between shrink-0 mb-2 border-t border-border pt-4">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">
            Library
          </h2>
        </div>

        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar"
        >
          {games.length > 0 ? (
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
                      <Tooltip
                        content={game.name}
                        position="right"
                        className="w-full h-full"
                      >
                        <button
                          onClick={() => selectGame(game.id)}
                          className={cn(
                            "w-full h-full group relative flex items-center px-4 rounded transition-all outline-none overflow-hidden border border-transparent",
                            isSelected
                              ? "bg-card border-border shadow-xl"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className="relative z-10 flex items-center gap-4 w-full">
                            <div
                              className={cn(
                                "relative w-20 h-10 rounded overflow-hidden bg-background border transition-all duration-500 shrink-0 flex items-center justify-center p-1",
                                isSelected
                                  ? "border-primary"
                                  : "border-border group-hover:border-primary/50"
                              )}
                            >
                              {game.icon && game.icon.trim() !== "" ? (
                                <img
                                  src={game.icon}
                                  alt={game.name}
                                  className={cn(
                                    "w-full h-full object-contain",
                                    isSelected
                                      ? "opacity-100 scale-105"
                                      : "opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all"
                                  )}
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center font-black text-sm text-muted-foreground italic"
                                  style={
                                    isSelected
                                      ? { color: game.accentColor }
                                      : {}
                                  }
                                >
                                  {game.logoInitial}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 text-left min-w-0">
                              <div
                                className={cn(
                                  "font-black text-[11px] truncate transition-colors uppercase tracking-widest",
                                  isSelected
                                    ? "text-foreground"
                                    : "text-muted-foreground group-hover:text-foreground"
                                )}
                              >
                                {game.name}
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                {game.status === InstallStatus.PLAYING ? (
                                  <span className="flex items-center gap-1.5 text-[9px] text-primary font-black uppercase tracking-widest">
                                    <Play size={8} fill="currentColor" /> Active
                                  </span>
                                ) : game.status === InstallStatus.UPDATING ||
                                  game.status === InstallStatus.DOWNLOADING ? (
                                  <span className="flex items-center gap-1.5 text-[9px] text-primary font-black uppercase tracking-widest animate-pulse">
                                    <RefreshCw
                                      size={8}
                                      className="animate-spin"
                                    />{" "}
                                    Sync
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                                    Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <motion.div
                              layoutId="activeBar"
                              className="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-primary shadow-[0_0_10px_var(--primary)]"
                            />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </LayoutGroup>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-3 text-muted-foreground border border-dashed border-border rounded bg-muted/20 p-4 text-center">
              <Ghost size={24} />
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">
                Vault Empty
              </p>
            </div>
          )}

          {/* Add Game Button */}
          <div className="pt-4 border-t border-border">
            <Tooltip content="Add New Game" position="right" className="w-full">
              <button
                onClick={onOpenAddGame}
                className="w-full group relative flex items-center justify-center gap-3 py-4 rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-muted transition-all outline-none"
              >
                <Plus size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Import Title
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-sidebar shrink-0">
        <Tooltip
          content="Manage Global Settings"
          position="right"
          className="w-full"
        >
          <button
            onClick={onOpenAppSettings}
            className="w-full flex items-center justify-between px-5 py-4 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all outline-none group"
          >
            <div className="flex items-center gap-3">
              <Settings
                size={18}
                className="group-hover:rotate-90 transition-transform duration-500"
              />
              <span className="text-[10px] font-black uppercase tracking-widest">
                System Hub
              </span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Sidebar;
