import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Layers,
  Trash2,
  CheckCircle2,
  Circle,
  Search,
  ChevronUp,
  ChevronDown,
  Box,
} from "lucide-react";
import { CharacterGroup, ModSnippet } from "../../lib/api";
import { useAppStore } from "../../store/gameStore";
import { useUiStore } from "../../store/uiStore";
import { cn } from "../../lib/utils";

interface CycleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  group: CharacterGroup;
  gameId: string;
  streamSafe: boolean;
}

export const CycleEditor: React.FC<CycleEditorProps> = ({
  isOpen,
  onClose,
  characterName,
  group,
  gameId,
  streamSafe,
}) => {
  const { toggleMod, deleteMod, setLoadOrder, games } = useAppStore();
  const { showConfirm } = useUiStore();

  const game = games.find(g => g.id === gameId);
  const activeProfile = game?.profiles.find(p => p.id === game.activeProfileId) || game?.profiles[0];

  const handleToggle = async (modId: string, enabled: boolean) => {
    await toggleMod(gameId, modId, enabled);
  };

  const handleDelete = async (mod: ModSnippet) => {
    if (await showConfirm(`Permanently delete ${mod.name}?`, "Uninstall Mod")) {
      await deleteMod(mod.id);
    }
  };

  const handleMove = async (modId: string, direction: "up" | "down") => {
    if (!activeProfile) return;
    const currentOrder = [...activeProfile.loadOrder];
    const idx = currentOrder.indexOf(modId);
    if (idx === -1) return;

    // We want to move it relative to OTHER skins of the same character in the list
    const characterModIds = group.skins.map(s => s.id);
    const charIdx = characterModIds.indexOf(modId);

    if (direction === "up" && charIdx > 0) {
      const targetModId = characterModIds[charIdx - 1];
      const targetIdx = currentOrder.indexOf(targetModId);
      [currentOrder[idx], currentOrder[targetIdx]] = [currentOrder[targetIdx], currentOrder[idx]];
    } else if (direction === "down" && charIdx < characterModIds.length - 1) {
      const targetModId = characterModIds[charIdx + 1];
      const targetIdx = currentOrder.indexOf(targetModId);
      [currentOrder[idx], currentOrder[targetIdx]] = [currentOrder[targetIdx], currentOrder[idx]];
    }

    await setLoadOrder(gameId, currentOrder);
  };

  const isNSFW = (mod: ModSnippet) =>
    mod.tags.some(t => t.toLowerCase() === "nsfw");

  const [searchTerm, setSearchTerm] = useState("");

  // Sort skins by their current position in the load order
  const sortedSkins = [...group.skins].sort((a, b) => {
    const order = activeProfile?.loadOrder || [];
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
  });

  const filteredSkins = sortedSkins.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/90 z-[60] flex items-center justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-[450px] h-full bg-card border-l border-border shadow-2xl flex flex-col relative z-[61]"
            >
              {/* Header */}
              <div className="p-8 border-b border-border flex items-center justify-between bg-background">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
                    <Layers size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic leading-none">
                      {characterName}
                    </h2>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mt-1.5">
                      Cycle Sequence & Variants
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search & Bulk Actions */}
              <div className="px-8 py-4 bg-background/50 border-b border-border flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                    <CheckCircle2 size={10} className="fill-primary" />
                    Slot 0: Vanilla
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        for (const mod of group.skins) {
                          if (!mod.enabled) await handleToggle(mod.id, true);
                        }
                      }}
                      className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest"
                    >
                      Enable All
                    </button>
                    <button
                      onClick={async () => {
                        for (const mod of group.skins) {
                          if (mod.enabled) await handleToggle(mod.id, false);
                        }
                      }}
                      className="text-[9px] font-black text-destructive hover:underline uppercase tracking-widest"
                    >
                      Disable All
                    </button>
                  </div>
                </div>
                <div className="relative group">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Filter variants..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              {/* Unified Scrollable List */}
              <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-3 custom-scrollbar bg-card/30">
                {filteredSkins.map((mod, idx) => {
                  const nsfw = isNSFW(mod);
                  const shouldBlur = nsfw && streamSafe;
                  const cyclePos = group.active_cycle.indexOf(mod.id);

                  return (
                    <motion.div
                      key={mod.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "group p-4 rounded-2xl border transition-all flex items-center gap-4",
                        mod.enabled
                          ? "bg-background border-primary shadow-lg shadow-primary/5"
                          : "bg-background/50 border-border opacity-60"
                      )}
                    >
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMove(mod.id, "up")}
                          disabled={idx === 0}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary disabled:opacity-20"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMove(mod.id, "down")}
                          disabled={idx === sortedSkins.length - 1}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary disabled:opacity-20"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleToggle(mod.id, !mod.enabled)}
                        className="shrink-0"
                      >
                        {mod.enabled ? (
                          <div className="relative">
                            <CheckCircle2 className="text-primary" size={28} />
                            {cyclePos !== -1 && (
                              <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">
                                {cyclePos + 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Circle className="text-muted-foreground/30" size={28} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "text-sm font-black text-foreground truncate mb-0.5 uppercase tracking-tight italic",
                            shouldBlur && "blur-sm select-none opacity-50"
                          )}
                        >
                          {mod.name}
                        </div>
                        {nsfw && (
                          <span className="text-[8px] bg-destructive text-primary-foreground px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                            Sovereign
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(mod)}
                          className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          title="Uninstall"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredSkins.length === 0 && (
                  <div className="py-20 text-center opacity-20">
                    <Box size={48} className="mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                      No variants detected
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-border bg-background flex flex-col gap-4">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-primary/20 active:scale-95 text-sm"
                >
                  Return to Gallery
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
