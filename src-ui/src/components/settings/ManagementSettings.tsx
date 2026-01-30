import React, { useState } from "react";
import { 
  Trash2, 
  RotateCcw, 
  Eraser, 
  Database, 
  AlertTriangle,
  FolderX
} from "lucide-react";
import { Game } from "../../types";
import { api } from "../../lib/api";
import { useUiStore } from "../../store/uiStore";
import { useAppStore } from "../../store/gameStore";

interface ManagementSettingsProps {
  game: Game;
  onClose: () => void;
  onUninstall: (gameId: string) => void;
}

export const ManagementSettings: React.FC<ManagementSettingsProps> = ({
  game,
  onClose,
  onUninstall,
}) => {
  const { showConfirm, showAlert } = useUiStore();
  const { uninstallGame } = useAppStore();
  const [isWipingMods, setIsWipingMods] = useState(false);
  const [isResettingProfiles, setIsResettingProfiles] = useState(false);
  const [isRemovingPrefix, setIsRemovingPrefix] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const handleDeleteEntry = async () => {
    const confirmed = await showConfirm(
      `Remove "${game.name}" from YAGO library? 

This will NOT delete game files or mods from your disk. You can re-add them later.`, 
      "Delete Entry"
    );
    if (confirmed) {
      await uninstallGame(game.id);
      onClose();
    }
  };

  const handleWipeMods = async () => {
    const confirmed = await showConfirm(
      `Wipe ALL mods for "${game.name}"? 

This will permanently delete all mod files from your disk. This cannot be undone.`, 
      "Wipe Mods Library"
    );
    if (confirmed) {
      setIsWipingMods(true);
      try {
        await api.wipeGameMods(game.id);
        showAlert("Mod library wiped successfully.", "Success");
      } catch (e) {
        showAlert("Failed to wipe mods: " + e, "Error");
      } finally {
        setIsWipingMods(false);
      }
    }
  };

  const handleResetProfiles = async () => {
    const confirmed = await showConfirm(
      `Reset all profiles for "${game.name}"? 

This will clear all custom profiles, mod load orders, and enabled states. Game and mods will remain on disk.`, 
      "Reset Profiles"
    );
    if (confirmed) {
      setIsResettingProfiles(true);
      try {
        await api.resetGameProfiles(game.id);
        showAlert("Profiles reset to default.", "Success");
      } catch (e) {
        showAlert("Failed to reset profiles: " + e, "Error");
      } finally {
        setIsResettingProfiles(false);
      }
    }
  };

  const handleRemovePrefix = async () => {
    const confirmed = await showConfirm(
      `Remove Wine/Proton prefix for "${game.name}"? 

Use this to fix launch issues or "corrupt" prefixes. A new one will be created on next launch.`, 
      "Remove Prefix"
    );
    if (confirmed) {
      setIsRemovingPrefix(true);
      try {
        await api.removeGamePrefix(game.id);
        showAlert("Prefix removed. It will be recreated on next launch.", "Success");
      } catch (e) {
        showAlert("Failed to remove prefix: " + e, "Error");
      } finally {
        setIsRemovingPrefix(false);
      }
    }
  };

  const handleFullUninstall = async () => {
    const step1 = await showConfirm(
      `UNINSTALL "${game.name}" entirely? \n\nThis will permanently DELETE all game files and mods from your disk. This action is IRREVERSIBLE.`,
      "Uninstall Game (Step 1/2)"
    );
    
    if (step1) {
      const step2 = await showConfirm(
        `FINAL WARNING: Are you absolutely sure? \n\nEvery byte of "${game.name}" and all your installed mods will be purged from this system forever.`,
        "DESTRUCTIVE ACTION: Confirm Wipe (Step 2/2)"
      );

      if (step2) {
        setIsUninstalling(true);
        try {
          await api.uninstallGameFiles(game.id);
          onClose();
        } catch (e) {
          showAlert("Failed to uninstall game: " + e, "Error");
        } finally {
          setIsUninstalling(false);
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Warning Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">
            Critical Actions Zone
          </p>
          <p className="text-[11px] text-amber-500/80 leading-relaxed">
            These operations modify your file system and library structure. Use with caution.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Delete Entry */}
        <div className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                <Eraser size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Remove from YAGO</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Keeps files on disk, removes library entry.</p>
              </div>
            </div>
            <button 
              onClick={handleDeleteEntry}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Delete Entry
            </button>
          </div>
        </div>

        {/* Remove Prefix */}
        <div className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                <FolderX size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Purge Prefix</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Delete Wine/Proton prefix (fixed launch issues).</p>
              </div>
            </div>
            <button 
              onClick={handleRemovePrefix}
              disabled={isRemovingPrefix}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {isRemovingPrefix ? "Removing..." : "Remove Prefix"}
            </button>
          </div>
        </div>

        {/* Reset Profiles */}
        <div className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                <RotateCcw size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Reset Profiles</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Clear all loadouts and enabled mod states.</p>
              </div>
            </div>
            <button 
              onClick={handleResetProfiles}
              disabled={isResettingProfiles}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {isResettingProfiles ? "Resetting..." : "Reset Data"}
            </button>
          </div>
        </div>

        <div className="h-px bg-white/5 mx-2" />

        {/* Wipe Mods */}
        <div className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/20 transition-all">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                <Database size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-200 uppercase tracking-tight text-glow-red">Wipe Mod Library</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 italic">Permanently delete all downloaded mods.</p>
              </div>
            </div>
            <button 
              onClick={handleWipeMods}
              disabled={isWipingMods}
              className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {isWipingMods ? "Wiping..." : "Wipe Mods"}
            </button>
          </div>
        </div>

        {/* Full Uninstall */}
        <div className="group p-6 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Full Uninstall</h4>
                <p className="text-[10px] text-red-500/70 mt-0.5 font-bold">Wipes EVERYTHING from disk.</p>
              </div>
            </div>
            <button 
              onClick={handleFullUninstall}
              disabled={isUninstalling}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {isUninstalling ? "Uninstalling..." : "Uninstall"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
