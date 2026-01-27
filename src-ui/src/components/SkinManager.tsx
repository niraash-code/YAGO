import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  User,
  Folder,
  RefreshCw,
  Layers,
  Plus,
  Archive,
} from "lucide-react";
import { api, CharacterGroup } from "../lib/api";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { useFileDrop } from "../hooks/useFileDrop";
import { CharacterCard } from "./skins/CharacterCard";
import { CycleEditor } from "./skins/CycleEditor";
import { cn } from "../lib/utils";

interface SkinManagerProps {
  gameId: string;
  streamSafe: boolean;
}

export const SkinManager: React.FC<SkinManagerProps> = ({
  gameId,
  streamSafe,
}) => {
  const [roster, setRoster] = useState<Record<string, CharacterGroup>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

  // Import State
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Hook into global library updates
  const { games, importMod } = useAppStore();
  const { showAlert } = useUiStore();
  const currentGame = games.find(g => g.id === gameId);

  const handleNativeDrop = useCallback(
    async (paths: string[]) => {
      setIsImporting(true);
      try {
        for (const path of paths) {
          await importMod(gameId, path);
        }
      } catch (e) {
        showAlert("Failed to import dropped mod: " + e, "Import Error");
      } finally {
        setIsImporting(false);
      }
    },
    [gameId, importMod, showAlert]
  );

  useFileDrop(handleNativeDrop, setIsDraggingFile);

  const handleImport = async (path?: string) => {
    let targetPath = path;

    if (!targetPath) {
      // Open native file picker via Tauri
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: false,
        multiple: false,
        title:
          "Select Character Mod Directory or Archive (.zip, .7z) to Import",
        filters: [
          { name: "Archives", extensions: ["zip", "7z"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected && typeof selected === "string") {
        targetPath = selected;
      }
    }

    if (targetPath) {
      setIsImporting(true);
      try {
        await importMod(gameId, targetPath);
      } catch (e) {
        showAlert("Failed to import mod: " + e, "Import Error");
      } finally {
        setIsImporting(false);
      }
    }
  };

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const data = await api.getSkinInventory(gameId);
      setRoster(data);
    } catch (e) {
      console.error("Failed to fetch roster:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [gameId, games]); // Refetch when library changes

  const filteredRoster = useMemo(() => {
    return Object.entries(roster).filter(([name]) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roster, searchTerm]);

  const getThumbnailForCharacter = (name: string, group: CharacterGroup) => {
    // 1. Try first enabled mod
    const enabledModId = group.active_cycle[0];
    if (enabledModId && currentGame) {
      const mod = currentGame.mods.find(m => m.id === enabledModId);
      if (mod?.imageUrl) return mod.imageUrl;
    }
    // 2. Fallback to first mod
    if (group.skins.length > 0 && currentGame) {
      const mod = currentGame.mods.find(m => m.id === group.skins[0].id);
      if (mod?.imageUrl) return mod.imageUrl;
    }
    return undefined;
  };

  const isCharacterNSFW = (group: CharacterGroup) => {
    return group.skins.some(s => s.tags.some(t => t.toLowerCase() === "nsfw"));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/20 relative">
      {/* Drop Zone Overlay */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-indigo-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none rounded-3xl"
          >
            <Archive size={64} className="mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-center px-6">
              Drop Character Mods Here
            </h2>
            <p className="text-indigo-100 mt-2">ZIP, 7z, or Folder</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-10 py-8 shrink-0 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-indigo-400" size={28} />
            Character Wardrobe
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">
            Manage skins, outfits, and automated cycle sequences.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Search characters..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
            />
          </div>

          <button
            onClick={() => handleImport()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {isImporting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span>{isImporting ? "Importing..." : "Add Mod"}</span>
          </button>

          <button
            onClick={fetchRoster}
            className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors border border-white/5"
          >
            <RefreshCw size={20} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
        {loading && Object.keys(roster).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                Cataloging Wardrobe...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRoster.map(([name, group]) => (
                <CharacterCard
                  key={name}
                  name={name}
                  activeCount={group.active_cycle.length}
                  totalCount={group.skins.length}
                  thumbnailUrl={getThumbnailForCharacter(name, group)}
                  isNSFW={isCharacterNSFW(group)}
                  streamSafe={streamSafe}
                  onClick={() => setSelectedCharacter(name)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredRoster.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
            <User size={64} />
            <p className="text-xl font-bold">
              No characters found matching your search
            </p>
          </div>
        )}
      </div>

      {/* Character Editor Drawer */}
      <CycleEditor
        isOpen={selectedCharacter !== null}
        onClose={() => setSelectedCharacter(null)}
        characterName={selectedCharacter || ""}
        group={
          roster[selectedCharacter || ""] || { skins: [], active_cycle: [] }
        }
        gameId={gameId}
        streamSafe={streamSafe}
      />
    </div>
  );
};
