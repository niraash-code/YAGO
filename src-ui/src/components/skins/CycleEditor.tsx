import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Layers,
  Trash2,
  CheckCircle2,
  Circle,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { CharacterGroup, ModSnippet, api } from "../../lib/api";
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
  const { toggleMod, deleteMod } = useAppStore();
  const { showConfirm } = useUiStore();

  const handleToggle = async (modId: string, enabled: boolean) => {
    await toggleMod(gameId, modId, enabled);
  };

  const handleDelete = async (mod: ModSnippet) => {
    if (await showConfirm(`Permanently delete ${mod.name}?`, "Uninstall Mod")) {
      await deleteMod(mod.id);
    }
  };

  const isNSFW = (mod: ModSnippet) =>
    mod.tags.some(t => t.toLowerCase() === "nsfw");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-[450px] h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col relative z-[61]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {characterName}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Character Wardrobe & Cycle
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Skin List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {group.skins.map((mod, index) => {
                  const nsfw = isNSFW(mod);
                  const shouldBlur = nsfw && streamSafe;

                  return (
                    <div
                      key={mod.id}
                      className={cn(
                        "group p-4 rounded-2xl border transition-all flex items-center gap-4",
                        mod.enabled
                          ? "bg-indigo-500/10 border-indigo-500/30"
                          : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                      )}
                    >
                      <button
                        onClick={() => handleToggle(mod.id, !mod.enabled)}
                        className="shrink-0"
                      >
                        {mod.enabled ? (
                          <CheckCircle2 className="text-indigo-400" size={24} />
                        ) : (
                          <Circle className="text-slate-600" size={24} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "text-sm font-bold text-white truncate mb-0.5",
                            shouldBlur && "blur-sm select-none opacity-50"
                          )}
                        >
                          {mod.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">
                            Skin {index + 1}
                          </span>
                          {nsfw && (
                            <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black border border-red-500/20">
                              NSFW
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(mod)}
                          className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Mod"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="p-2 text-slate-600 cursor-grab active:cursor-grabbing">
                          <GripVertical size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  <span>Cycle Sequence</span>
                  <span className="text-indigo-400">
                    {group.active_cycle.length} Enabled
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  Confirm Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
