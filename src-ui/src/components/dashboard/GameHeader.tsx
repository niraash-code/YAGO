import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Check,
  Plus,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { Game } from "../../types";
import { cn } from "../../lib/utils";

interface GameHeaderProps {
  selectedGame: Game;
  streamSafe: boolean;
  nsfwBehavior: "blur" | "hide";
  isProfileDropdownOpen: boolean;
  setIsProfileDropdownOpen: (v: boolean) => void;
  handleSwitchProfile: (id: string) => void;
  handleAddProfile: () => void;
  setNsfwBehavior: (v: "blur" | "hide") => void;
  toggleStreamSafe: () => void;
  onOpenCoverManager: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  selectedGame,
  streamSafe,
  nsfwBehavior,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  handleSwitchProfile,
  handleAddProfile,
  setNsfwBehavior,
  toggleStreamSafe,
  onOpenCoverManager,
}) => {
  return (
    <header className="h-24 px-10 flex items-center justify-end gap-6 border-b border-white/5 bg-gradient-to-b from-slate-950/50 to-transparent">
      {/* Profile Selector */}
      <div className="relative z-50">
        <button
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className="flex items-center gap-3 px-4 py-2 bg-slate-900/60 backdrop-blur-md border border-white/10 hover:bg-white/10 rounded-full transition-all shadow-lg group"
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Profile
            </span>
            <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
              {selectedGame.profiles.find(
                p => p.id === selectedGame.activeProfileId
              )?.name || "Default"}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-inner">
            <User size={16} />
          </div>
        </button>

        <AnimatePresence>
          {isProfileDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-3 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 ring-1 ring-white/10"
            >
              <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Select Loadout
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                {selectedGame.profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProfile(p.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors group",
                      selectedGame.activeProfileId === p.id
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span>{p.name}</span>
                    {selectedGame.activeProfileId === p.id && (
                      <Check size={16} />
                    )}
                  </button>
                ))}
              </div>
              <div className="h-px bg-white/10 my-2 mx-2" />
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  handleAddProfile();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 transition-colors"
              >
                <Plus size={16} /> New Profile
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-8 w-px bg-white/10 mx-2" />

      <div className="flex items-center gap-4">
        <AnimatePresence>
          {streamSafe && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center bg-slate-900/60 backdrop-blur-md rounded-full border border-white/5 p-1 shadow-lg"
            >
              <button
                onClick={() => setNsfwBehavior("blur")}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all outline-none",
                  nsfwBehavior === "blur"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Blur
              </button>
              <button
                onClick={() => setNsfwBehavior("hide")}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all outline-none",
                  nsfwBehavior === "hide"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Hide
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/5 shadow-lg">
          <span className="text-sm text-slate-300 font-medium">
            Stream Safe
          </span>
          <button
            onClick={toggleStreamSafe}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-300 outline-none",
              streamSafe ? "bg-indigo-500" : "bg-slate-600"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300",
                streamSafe ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
          {streamSafe ? (
            <Eye size={16} className="text-indigo-300" />
          ) : (
            <EyeOff size={16} className="text-slate-500" />
          )}
        </div>
      </div>

      <button
        onClick={onOpenCoverManager}
        className="p-3 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 duration-200 outline-none shadow-lg"
      >
        <ImageIcon size={22} />
      </button>
    </header>
  );
};
