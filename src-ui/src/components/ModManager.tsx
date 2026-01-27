import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Game } from "../types";
import {
  Archive,
  FileBox,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  HardDrive,
  Calendar,
  X,
  Check,
} from "lucide-react";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { useFileDrop } from "../hooks/useFileDrop";
import { cn } from "../lib/utils";
import { api } from "../lib/api";

// Modular Components
import { ModManagerHeader } from "./mod-manager/ModManagerHeader";
import { ModInspector } from "./mod-manager/ModInspector";
import { ModItem, CompactModItem, GridModItem } from "./mod-manager/ModItems";
import { parseSize, isModNSFW } from "./mod-manager/types";

interface ModManagerProps {
  game: Game;
  onUpdateGame: (game: Game) => void;
  streamSafe: boolean;
  nsfwBehavior: "blur" | "hide";
  onClose: () => void;
}

const ModManager: React.FC<ModManagerProps> = ({
  game,
  onUpdateGame,
  streamSafe,
  nsfwBehavior,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | "All">("All");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [devMode, setDevMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "name" | "size" | "updated">(
    "default"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"info" | "files" | "editor">(
    "info"
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const {
    importMod,
    deleteMod: deleteModFromStore,
    toggleMod: toggleModInStore,
    setLoadOrder: updateLoadOrder,
    updateModTags,
  } = useAppStore();
  const { showAlert, showConfirm, showPrompt } = useUiStore();

  const selectedMod = game.mods.find(m => m.id === selectedModId) || null;
  const activeProfile =
    game.profiles.find(p => p.id === game.activeProfileId) || game.profiles[0];

  const handleNativeDrop = React.useCallback(
    async (paths: string[]) => {
      setIsImporting(true);
      try {
        for (const path of paths) await importMod(game.id, path);
      } catch (e) {
        showAlert("Failed to import dropped mod: " + e, "Import Error");
      } finally {
        setIsImporting(false);
      }
    },
    [game.id, importMod, showAlert]
  );

  useFileDrop(handleNativeDrop, setIsDraggingFile);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    game.mods.forEach(mod => mod.tags.forEach(t => tags.add(t)));
    return ["All", ...Array.from(tags)];
  }, [game.mods]);

  const processedMods = useMemo(() => {
    let mods = game.mods.filter(mod => {
      const matchesSearch =
        mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag =
        selectedTag === "All" || mod.tags.includes(selectedTag);
      if (streamSafe && nsfwBehavior === "hide" && isModNSFW(mod)) return false;
      if (showEnabledOnly && !mod.enabled) return false;
      return matchesSearch && matchesTag;
    });

    if (sortBy !== "default") {
      mods = [...mods].sort((a, b) => {
        let res = 0;
        if (sortBy === "name") res = a.name.localeCompare(b.name);
        if (sortBy === "size") res = parseSize(a.size) - parseSize(b.size);
        if (sortBy === "updated")
          res = new Date(a.updated).getTime() - new Date(b.updated).getTime();
        return sortDirection === "asc" ? res : -res;
      });
    } else if (activeProfile?.loadOrder) {
      mods = [...mods].sort(
        (a, b) =>
          (activeProfile.loadOrder.indexOf(a.id) === -1
            ? 999
            : activeProfile.loadOrder.indexOf(a.id)) -
          (activeProfile.loadOrder.indexOf(b.id) === -1
            ? 999
            : activeProfile.loadOrder.indexOf(b.id))
      );
    }
    return mods;
  }, [
    game.mods,
    activeProfile,
    searchTerm,
    selectedTag,
    streamSafe,
    nsfwBehavior,
    showEnabledOnly,
    sortBy,
    sortDirection,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: processedMods.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === "list" ? (devMode ? 60 : 88) : 300),
    overscan: 5,
  });

  const handleImport = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: false,
      multiple: false,
      title: "Select Mod",
      filters: [{ name: "Archives", extensions: ["zip", "7z"] }],
    });
    if (selected && typeof selected === "string") {
      setIsImporting(true);
      try {
        await importMod(game.id, selected);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleMoveMod = async (
    id: string,
    direction: "up" | "down" | "top" | "bottom"
  ) => {
    const currentOrder = activeProfile.loadOrder || game.mods.map(m => m.id);
    const currentIndex = currentOrder.indexOf(id);
    if (currentIndex === -1) return;
    const newOrder = [...currentOrder];
    const [movedId] = newOrder.splice(currentIndex, 1);
    let newIndex = currentIndex;
    if (direction === "top") newIndex = 0;
    else if (direction === "bottom") newIndex = newOrder.length;
    else if (direction === "up") newIndex = Math.max(0, currentIndex - 1);
    else if (direction === "down")
      newIndex = Math.min(newOrder.length, currentIndex + 1);
    newOrder.splice(newIndex, 0, movedId);
    try {
      await updateLoadOrder(game.id, newOrder);
    } catch (e) {
      showAlert(e as string);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full max-h-[calc(100vh-5rem)]"
    >
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div className="absolute inset-0 z-50 bg-indigo-500/90 flex flex-col items-center justify-center text-white pointer-events-none">
            <Archive size={64} className="animate-bounce" />
            <h2 className="text-3xl font-bold">Drop to Install</h2>
          </motion.div>
        )}
      </AnimatePresence>

      <ModManagerHeader
        modCount={game.mods.length}
        devMode={devMode}
        setDevMode={setDevMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isImporting={isImporting}
        onImport={handleImport}
        onClose={onClose}
      />

      <div className="flex-1 flex overflow-hidden">
        {viewMode === "list" ? (
          <>
            <div
              ref={parentRef}
              className={cn(
                "overflow-y-auto border-r custom-scrollbar transition-all duration-300",
                devMode
                  ? "w-[400px] bg-slate-950 border-r-white/10"
                  : "w-[450px] bg-slate-950/20 border-r-white/5"
              )}
            >
              <div className="sticky top-0 z-20 px-3 py-2 bg-slate-900/80 border-b border-white/5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setSortBy(sortBy === "name" ? "default" : "name")
                    }
                    className={cn(
                      "p-1.5 rounded",
                      sortBy === "name"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400"
                    )}
                  >
                    <ArrowUpDown size={14} />
                  </button>
                  <button
                    onClick={() => setShowEnabledOnly(!showEnabledOnly)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase",
                      showEnabledOnly
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : "bg-black/30 text-slate-500 border-white/5"
                    )}
                  >
                    Active
                  </button>
                </div>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={cn(
                    "p-1.5 rounded",
                    isFilterOpen ? "text-indigo-400" : "text-slate-400"
                  )}
                >
                  <Filter size={16} />
                </button>
              </div>

              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const mod = processedMods[virtualRow.index];
                  return (
                    <div
                      key={mod.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        padding: "4px 8px",
                      }}
                    >
                      {devMode ? (
                        <CompactModItem
                          mod={mod}
                          isSelected={selectedModId === mod.id}
                          canMoveUp={virtualRow.index > 0}
                          canMoveDown={
                            virtualRow.index < processedMods.length - 1
                          }
                          onSelect={() => setSelectedModId(mod.id)}
                          onToggle={(id: any, e: any) =>
                            toggleModInStore(game.id, id, !mod.enabled)
                          }
                          onMoveUp={() => handleMoveMod(mod.id, "up")}
                          onMoveDown={() => handleMoveMod(mod.id, "down")}
                          isReorderEnabled={sortBy === "default"}
                          streamSafe={streamSafe}
                          nsfwBehavior={nsfwBehavior}
                        />
                      ) : (
                        <ModItem
                          mod={mod}
                          isSelected={selectedModId === mod.id}
                          canMoveUp={virtualRow.index > 0}
                          canMoveDown={
                            virtualRow.index < processedMods.length - 1
                          }
                          onSelect={() => setSelectedModId(mod.id)}
                          onToggle={(id: any, e: any) =>
                            toggleModInStore(game.id, id, !mod.enabled)
                          }
                          onMoveUp={() => handleMoveMod(mod.id, "up")}
                          onMoveDown={() => handleMoveMod(mod.id, "down")}
                          isReorderEnabled={sortBy === "default"}
                          streamSafe={streamSafe}
                          nsfwBehavior={nsfwBehavior}
                          onRename={(id: any, name: any) =>
                            onUpdateGame({
                              ...game,
                              mods: game.mods.map(m =>
                                m.id === id ? { ...m, name } : m
                              ),
                            })
                          }
                          onDelete={async (id: any) => {
                            if (await showConfirm("Uninstall?"))
                              deleteModFromStore(id);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <ModInspector
                selectedMod={selectedMod}
                tab={inspectorTab}
                setTab={setInspectorTab}
                streamSafe={streamSafe}
                nsfwBehavior={nsfwBehavior}
                deleteMod={(id: any) => deleteModFromStore(id)}
                updateTags={(id: any, tags: any) =>
                  updateModTags(game.id, id, tags)
                }
                devMode={devMode}
                onMove={handleMoveMod}
                isSorted={sortBy !== "default"}
                game={game}
                onValidate={async (id: any) => {
                  const v = await api.validateMod(id);
                  onUpdateGame({
                    ...game,
                    mods: game.mods.map(m =>
                      m.id === id ? { ...m, isValidated: v } : m
                    ),
                  });
                }}
                showConfirm={showConfirm}
                showPrompt={showPrompt}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-black/20">
            {processedMods.map(mod => (
              <GridModItem
                key={mod.id}
                mod={mod}
                isSelected={selectedModId === mod.id}
                onSelect={() => setSelectedModId(mod.id)}
                onToggle={(id: any, e: any) =>
                  toggleModInStore(game.id, id, !mod.enabled)
                }
                streamSafe={streamSafe}
                nsfwBehavior={nsfwBehavior}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ModManager;
