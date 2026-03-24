import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, User, RefreshCw, Plus, Archive } from "lucide-react";
import { api, CharacterGroup } from "../lib/api";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { useFileDrop } from "../hooks/useFileDrop";
import { CharacterCard } from "./skins/CharacterCard";
import { CycleEditor } from "./skins/CycleEditor";
import { ModImportModal } from "./ModImportModal";
import { cn } from "../lib/utils";
import { ImportCandidate } from "../lib/api";

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

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRedeploying, setIsRedeploying] = useState(false);
  
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { games, importMod } = useAppStore();
  const { showAlert } = useUiStore();
  const currentGame = games.find(g => g.id === gameId);


  const handleNativeDrop = useCallback(
    async (paths: string[]) => {
      setIsImporting(true);
      try {
        let allCandidates: ImportCandidate[] = [];
        for (const path of paths) {
          const candidates = await api.scanModDirectory(path, gameId);
          allCandidates = [...allCandidates, ...candidates];
        }
        
        if (allCandidates.length > 0) {
          setImportCandidates(allCandidates);
          setIsImportModalOpen(true);
        } else {
          showAlert("No valid mod assets identified in the dropped files.", "Empty Essence");
        }
      } catch (e) {
        showAlert("Failed to scan dropped assets: " + e, "Alchemy Error");
      } finally {
        setIsImporting(false);
      }
    },
    [gameId, showAlert]
  );

  useFileDrop(handleNativeDrop, setIsDraggingFile);

  const handleImport = async (path?: string) => {
    let targetPath = path;

    if (!targetPath) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: false,
        multiple: false,
        title:
          "Select Asset Archive (.zip, .7z) or Folder to Transmute",
        filters: [
          { name: "Archives", extensions: ["zip", "7z", "rar"] },
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
        const candidates = await api.scanModDirectory(targetPath, gameId);
        if (candidates.length > 0) {
          setImportCandidates(candidates);
          setIsImportModalOpen(true);
        } else {
          showAlert("No valid mod assets identified in the selected target.", "Empty Essence");
        }
      } catch (e) {
        showAlert("Failed to scan assets: " + e, "Alchemy Error");
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleConfirmImport = async (selected: ImportCandidate[]) => {
    setIsImporting(true);
    try {
      for (const candidate of selected) {
        await importMod(gameId, candidate.original_path);
      }
      setIsImportModalOpen(false);
      await fetchRoster();
    } catch (e) {
      showAlert("Transmutation failed: " + e, "Alchemy Failure");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRedeploy = async () => {
    if (!currentGame) return;
    setIsRedeploying(true);
    try {
      await api.redeployMods(currentGame.installPath || "");
    } catch (e) {
      showAlert("Failed to reload mods: " + e, "Reload Error");
    } finally {
      setIsRedeploying(false);
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
  }, [gameId, games]);

  const filteredRoster = useMemo(() => {
    return Object.entries(roster).filter(([name]) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roster, searchTerm]);

  const getThumbnailForCharacter = (name: string, group: CharacterGroup) => {
    const enabledModId = group.active_cycle[0];
    if (enabledModId && currentGame) {
      const mod = currentGame.mods.find(m => m.id === enabledModId);
      if (mod?.imageUrl) return mod.imageUrl;
    }
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      {/* Drop Zone Overlay */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-primary flex flex-col items-center justify-center text-primary-foreground pointer-events-none"
          >
            <Archive size={64} className="mb-4 animate-bounce" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">
              Drop to Install
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-10 py-8 shrink-0 flex items-center justify-between border-b border-border bg-muted/20 backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground tracking-tighter flex items-center gap-3 uppercase italic leading-none drop-shadow-lg">
            <Sparkles className="text-primary animate-pulse" size={28} />
            Gallery of Sovereigns
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] pl-10">
            Exclusive Wardrobe // v0.1.0 Beta
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-card border border-border rounded-full pl-10 pr-6 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 w-72 transition-all font-bold placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            onClick={() => handleImport()}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-primary/40 disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {isImporting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            <span>{isImporting ? "Processing..." : "Import Asset"}</span>
          </button>

          <button
            onClick={handleRedeploy}
            disabled={isRedeploying}
            className="p-2.5 bg-card text-foreground border border-border rounded-full transition-all flex items-center gap-2 group disabled:opacity-50 hover:border-primary/50"
            title="Reload Environment (F10)"
          >
            <RefreshCw
              size={18}
              className={cn(
                "text-primary transition-transform group-hover:rotate-180 duration-700",
                isRedeploying && "animate-spin"
              )}
            />
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto px-10 pt-10 pb-20 custom-scrollbar bg-transparent">
        {loading && Object.keys(roster).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <Sparkles className="absolute inset-0 m-auto text-primary animate-pulse" size={24} />
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
                Synchronizing Wardrobe...
              </p>
            </div>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8"
          >
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
          </motion.div>
        )}

        {!loading && filteredRoster.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4">
            <User size={64} />
            <p className="text-lg font-black uppercase tracking-widest italic">
              No results found
            </p>
          </div>
        )}
      </div>

      <CycleEditor
        isOpen={selectedCharacter !== null}
        onClose={() => setSelectedCharacter(null)}
        characterName={selectedCharacter || ""}
        group={
          roster[selectedCharacter || ""] || {
            skins: [],
            active_cycle: [],
          }
        }
        gameId={gameId}
        streamSafe={streamSafe}
      />

      <ModImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        candidates={importCandidates}
        onConfirm={handleConfirmImport}
        isProcessing={isImporting}
      />
    </div>
  );
};
