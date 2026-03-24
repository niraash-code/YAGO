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
    <header className="h-24 px-10 flex items-center justify-end gap-6 border-b border-border bg-background">
      {/* Profile Selector */}
      <div className="relative z-50">
        <button
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className="flex items-center gap-3 px-4 py-2 bg-card border border-border hover:bg-muted rounded-full transition-all group"
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">
              Profile
            </span>
            <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors uppercase italic">
              {selectedGame.profiles.find(
                p => p.id === selectedGame.activeProfileId
              )?.name || "Default"}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <User size={16} />
          </div>
        </button>

        <AnimatePresence>
          {isProfileDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-3 w-64 bg-card border border-border rounded-lg p-1.5 shadow-2xl overflow-hidden"
            >
              <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border mb-1.5 bg-muted/20">
                Select Loadout
              </div>
              <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar px-1">
                {selectedGame.profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProfile(p.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-xs font-bold flex items-center justify-between transition-all group uppercase tracking-tight",
                      selectedGame.activeProfileId === p.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{p.name}</span>
                    {selectedGame.activeProfileId === p.id && (
                      <Check size={14} strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
              <div className="h-px bg-border my-1.5 mx-1" />
              <div className="px-1">
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    handleAddProfile();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[10px] font-black text-primary hover:bg-primary/10 transition-all uppercase tracking-widest border border-dashed border-primary/30 hover:border-primary/50"
                >
                  <Plus size={14} /> New Profile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-8 w-px bg-border mx-2" />

      <div className="flex items-center gap-4">
        <AnimatePresence>
          {streamSafe && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center bg-card rounded-full border border-border p-1 shadow-sm"
            >
              <button
                onClick={() => setNsfwBehavior("blur")}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all outline-none",
                  nsfwBehavior === "blur"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Blur
              </button>
              <button
                onClick={() => setNsfwBehavior("hide")}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all outline-none",
                  nsfwBehavior === "hide"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Hide
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 bg-card px-5 py-2.5 rounded-full border border-border shadow-sm">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            Stream Safe
          </span>
          <button
            onClick={toggleStreamSafe}
            className={cn(
              "relative w-9 h-5 rounded-full transition-all duration-300 outline-none border border-border shadow-inner",
              streamSafe ? "bg-primary border-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-primary-foreground transition-transform duration-300 shadow-sm",
                streamSafe ? "right-0.5" : "left-0.5"
              )}
            />
          </button>
          {streamSafe ? (
            <Eye size={16} className="text-primary" />
          ) : (
            <EyeOff size={16} className="text-muted-foreground" />
          )}
        </div>
      </div>

      <button
        onClick={onOpenCoverManager}
        className="p-3 rounded-full bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 outline-none shadow-sm active:scale-95"
      >
        <ImageIcon size={22} />
      </button>
    </header>
  );
};
