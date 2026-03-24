import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Game } from "../types";
import { Archive, ArrowUpDown, Filter } from "lucide-react";
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
import { ImportStagingModal } from "./mod-manager/ImportStagingModal";
import { ImportCandidate } from "../lib/api";

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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [devMode, setDevMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "name" | "size" | "updated">(
    "default"
  );
  const [sortDirection] = useState<"asc" | "desc">("asc");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>(
    []
  );
  const [isStagingOpen, setIsStagingOpen] = useState(false);
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
        const allCandidates: ImportCandidate[] = [];
        const directImports: string[] = [];

        for (const path of paths) {
          try {
            // Check if it's a directory with mods
            const candidates = await api.scanModDirectory(path, game.id);
            if (candidates && candidates.length > 0) {
              allCandidates.push(...candidates);
            } else {
              // Might be a zip or a folder that scan_directory didn't like (but import_mod might)
              directImports.push(path);
            }
          } catch {
            directImports.push(path);
          }
        }

        if (allCandidates.length > 0) {
          setImportCandidates(prev => [...prev, ...allCandidates]);
          setIsStagingOpen(true);
        }

        for (const path of directImports) {
          await importMod(game.id, path);
        }
      } catch (e) {
        showAlert("Failed to import dropped mod: " + e, "Import Error");
      } finally {
        setIsImporting(false);
      }
    },
    [game.id, importMod, showAlert]
  );

  useFileDrop(handleNativeDrop, setIsDraggingFile);

  const processedMods = useMemo(() => {
    let mods = game.mods.filter(mod => {
      const matchesSearch =
        mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = true;
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

  const handleImportFromFolder = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Mods Folder",
    });
    if (selected && typeof selected === "string") {
      setIsImporting(true);
      try {
        const candidates = await api.scanModDirectory(selected, game.id);
        if (candidates && candidates.length > 0) {
          setImportCandidates(candidates);
          setIsStagingOpen(true);
        } else {
          showAlert(
            "No valid mods found in the selected folder.",
            "Import Info"
          );
        }
      } catch (e) {
        showAlert("Failed to scan directory: " + e, "Scan Error");
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleCommitImport = async (finalCandidates: ImportCandidate[]) => {
    setIsStagingOpen(false);
    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    // Alchemy Fix: Deduplicate candidates by original_path to prevent triple-importing the same mod
    const uniquePaths = new Set<string>();
    const deduplicatedCandidates = finalCandidates.filter(c => {
      if (uniquePaths.has(c.original_path)) return false;
      uniquePaths.add(c.original_path);
      return true;
    });

    try {
      for (const candidate of deduplicatedCandidates) {
        try {
          await api.importMod(game.id, candidate.original_path);
          successCount++;
        } catch (e) {
          console.error("Failed to import " + candidate.suggested_name, e);
          failCount++;
        }
      }
      showAlert(
        `Successfully imported ${successCount} mods.${failCount > 0 ? ` ${failCount} failed.` : ""}`,
        "Import Complete"
      );
    } finally {
      setIsImporting(false);
      setImportCandidates([]);
    }
  };

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

  const handleRedeploy = async () => {
    setIsRedeploying(true);
    try {
      await api.redeployMods(game.installPath || "");
    } catch (e) {
      showAlert("Failed to reload mods: " + e, "Reload Error");
    } finally {
      setIsRedeploying(false);
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
    <div className="flex-1 flex flex-col h-full max-h-[calc(100vh-5rem)] bg-background">
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div className="absolute inset-0 z-[100] bg-primary flex flex-col items-center justify-center text-primary-foreground pointer-events-none">
            <Archive size={64} className="animate-bounce" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">
              Drop to Install
            </h2>
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
        isRedeploying={isRedeploying}
        onImport={handleImport}
        onImportFolder={handleImportFromFolder}
        onRedeploy={handleRedeploy}
        onClose={onClose}
      />

      <div className="flex-1 flex overflow-hidden bg-card">
        {viewMode === "list" ? (
          <>
            <div
              ref={parentRef}
              className={cn(
                "overflow-y-auto border-r custom-scrollbar transition-all duration-300",
                devMode
                  ? "w-[400px] bg-background border-r-border"
                  : "w-[450px] bg-background border-r-border"
              )}
            >
              <div className="sticky top-0 z-20 px-3 py-2 bg-background border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setSortBy(sortBy === "name" ? "default" : "name")
                    }
                    className={cn(
                      "p-1.5 rounded",
                      sortBy === "name"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <ArrowUpDown size={14} />
                  </button>
                  <button
                    onClick={() => setShowEnabledOnly(!showEnabledOnly)}
                    className={cn(
                      "px-2 py-1.5 rounded-md border text-[10px] font-black uppercase tracking-widest transition-all",
                      showEnabledOnly
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    Active
                  </button>
                </div>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    isFilterOpen
                      ? "text-primary bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                          onToggle={(id: any) =>
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
                          onToggle={(id: any) =>
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
            <div className="flex-1 flex flex-col min-w-0 bg-card">
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
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-background">
            {processedMods.map(mod => (
              <GridModItem
                key={mod.id}
                mod={mod}
                isSelected={selectedModId === mod.id}
                onSelect={() => setSelectedModId(mod.id)}
                onToggle={(id: any) =>
                  toggleModInStore(game.id, id, !mod.enabled)
                }
                streamSafe={streamSafe}
                nsfwBehavior={nsfwBehavior}
              />
            ))}
          </div>
        )}
      </div>

      <ImportStagingModal
        isOpen={isStagingOpen}
        onClose={() => setIsStagingOpen(false)}
        candidates={importCandidates}
        onConfirm={handleCommitImport}
      />
    </div>
  );
};

export default ModManager;
