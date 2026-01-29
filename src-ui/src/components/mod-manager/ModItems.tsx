import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Check,
  Edit,
  Copy,
  Trash2,
  FileBox,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Mod } from "../../types";
import { cn } from "../../lib/utils";
import { isModNSFW, getTagStyle } from "./types";
import { useUiStore } from "../../store/uiStore";

interface ModItemProps {
  mod: Mod;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: (id: string, e: any) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isReorderEnabled: boolean;
  streamSafe: boolean;
  nsfwBehavior: "blur" | "hide";
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export const ModItem: React.FC<ModItemProps> = ({
  mod,
  isSelected,
  onSelect,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isReorderEnabled,
  streamSafe,
  nsfwBehavior,
  onRename,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showConfirm, showPrompt } = useUiStore();

  const isNsfw = isModNSFW(mod);
  const shouldBlur = isNsfw && streamSafe && nsfwBehavior === "blur";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleRename = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const newName = await showPrompt(
      "Enter new name for the mod:",
      mod.name,
      "Rename Mod"
    );
    if (newName && newName !== mod.name) onRename(mod.id, newName);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const confirmed = await showConfirm(
      `Are you sure you want to delete "${mod.name}"?\nThis action cannot be undone.`,
      "Delete Mod",
      { confirmLabel: "Delete", cancelLabel: "Keep" }
    );
    if (confirmed) onDelete(mod.id);
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    navigator.clipboard.writeText(mod.id);
  };

  return (
    <motion.div
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === "Enter") onSelect();
        if (e.key === " ") {
          e.preventDefault();
          onToggle(mod.id, e);
        }
      }}
      tabIndex={0}
      role="button"
      className={cn(
        "group flex items-center p-3 pr-4 rounded-xl border transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        isSelected
          ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
          : "bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-800/60"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      {isReorderEnabled ? (
        <div className="flex flex-col gap-0.5 mr-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus:bg-white/20 outline-none"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus:bg-white/20 outline-none"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      ) : (
        <div className="w-2 mr-2" />
      )}

      <div
        onClick={e => onToggle(mod.id, e)}
        data-testid="mod-toggle"
        className="relative flex items-center cursor-pointer mr-4 shrink-0"
      >
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors duration-200",
            mod.enabled
              ? "bg-indigo-500 shadow-[0_0_10px_#6366f1]"
              : "bg-slate-700"
          )}
        >
          <div
            className={cn(
              "absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
              mod.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>

      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10 shadow-sm">
        {shouldBlur ? (
          <div className="w-full h-full relative">
            <img
              src={mod.imageUrl}
              className="w-full h-full object-cover blur-sm opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center text-slate-200">
              <EyeOff size={18} />
            </div>
          </div>
        ) : (
          <img src={mod.imageUrl} className="w-full h-full object-cover" />
        )}
      </div>

      <div
        className={cn(
          "flex-1 min-w-0 ml-4 transition-all duration-300",
          shouldBlur ? "blur-[3px] opacity-40 select-none grayscale" : ""
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={cn(
              "font-semibold text-base truncate",
              isSelected ? "text-white" : "text-slate-200"
            )}
          >
            {mod.name}
          </h3>
          {isNsfw && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 font-bold uppercase">
              NSFW
            </span>
          )}
          {mod.isValidated === true && (
            <span title="Logic Validated">
              <CheckCircle2 size={14} className="text-emerald-500" />
            </span>
          )}
          {mod.isValidated === false && (
            <span title="Logic Error Detected">
              <AlertTriangle size={14} className="text-amber-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 overflow-hidden">
          {mod.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className={`px-2 py-0.5 rounded-[4px] border text-xs font-medium ${getTagStyle(tag)}`}
            >
              {tag}
            </span>
          ))}
          {mod.tags.length > 3 && (
            <span className="text-xs font-medium opacity-60">
              +{mod.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {isSelected && (
        <div
          className="relative flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200"
          ref={menuRef}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "p-2.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none",
              showMenu
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/50"
              >
                <div className="p-1">
                  <button
                    onClick={handleRename}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium flex items-center gap-2 rounded-lg transition-colors"
                  >
                    <Edit size={14} className="text-indigo-400" /> Rename
                  </button>
                  <button
                    onClick={handleCopyId}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium flex items-center gap-2 rounded-lg transition-colors"
                  >
                    <Copy size={14} className="text-emerald-400" /> Copy ID
                  </button>
                </div>
                <div className="h-px bg-white/5 my-0.5" />
                <div className="p-1">
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm font-medium flex items-center gap-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export const CompactModItem: React.FC<any> = ({
  mod,
  isSelected,
  onSelect,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isReorderEnabled,
  streamSafe,
  nsfwBehavior,
}) => {
  const isNsfw = isModNSFW(mod);
  const shouldBlur = isNsfw && streamSafe && nsfwBehavior === "blur";

  return (
    <div
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === "Enter") onSelect();
        if (e.key === " ") {
          e.preventDefault();
          onToggle(mod.id, e);
        }
      }}
      tabIndex={0}
      role="button"
      className={cn(
        "flex items-center text-sm h-14 border-b border-white/5 px-4 gap-4 cursor-pointer select-none transition-colors outline-none focus-visible:bg-white/5",
        isSelected
          ? "bg-indigo-500/10 text-white"
          : "hover:bg-white/5 text-slate-400"
      )}
    >
      {isReorderEnabled && (
        <div className="flex flex-col -gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 w-4 shrink-0">
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveUp();
            }}
            data-testid="mod-move-up"
            disabled={!canMoveUp}
            className="text-slate-500 hover:text-white disabled:opacity-0"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="text-slate-500 hover:text-white disabled:opacity-0"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      )}

      <div
        onClick={e => onToggle(mod.id, e)}
        className="relative flex items-center cursor-pointer shrink-0"
      >
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors duration-200",
            mod.enabled
              ? "bg-indigo-500 shadow-[0_0_10px_#6366f1]"
              : "bg-slate-700"
          )}
        >
          <div
            className={cn(
              "absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
              mod.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex-1 truncate flex items-center gap-2 font-medium text-[15px]",
          shouldBlur ? "blur-[3px] opacity-50" : ""
        )}
      >
        <FileBox size={16} className="text-indigo-400" />
        {mod.name}
      </div>
    </div>
  );
};

export const GridModItem: React.FC<any> = ({
  mod,
  isSelected,
  onSelect,
  onToggle,
  streamSafe,
  nsfwBehavior,
}) => {
  const isNsfw = isModNSFW(mod);
  const shouldBlur = isNsfw && streamSafe && nsfwBehavior === "blur";

  return (
    <motion.div
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === "Enter") onSelect();
        if (e.key === " ") {
          e.preventDefault();
          onToggle(mod.id, e);
        }
      }}
      tabIndex={0}
      role="button"
      className={cn(
        "group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border transition-all duration-300 outline-none focus-visible:ring-4 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        isSelected
          ? "ring-2 ring-indigo-500 border-indigo-500/50"
          : "border-white/5 hover:border-white/20"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="absolute inset-0 bg-slate-900">
        {shouldBlur ? (
          <div className="w-full h-full relative">
            <img
              src={mod.imageUrl}
              className="w-full h-full object-cover blur-md opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center text-slate-500/50">
              <EyeOff size={32} />
            </div>
          </div>
        ) : (
          <img
            src={mod.imageUrl}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <div className="absolute top-2 right-2 flex gap-2">
        {isNsfw && (
          <span className="bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded font-bold backdrop-blur-sm border border-red-500/20 shadow-sm">
            18+
          </span>
        )}
        <div
          onClick={e => onToggle(mod.id, e)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors",
            mod.enabled
              ? "bg-indigo-600/90 text-white shadow-[0_0_10px_#6366f1]"
              : "bg-black/40 text-slate-400 hover:bg-black/60"
          )}
        >
          <Check
            size={16}
            className={mod.enabled ? "opacity-100" : "opacity-0"}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3
          className={cn(
            "font-bold text-xl leading-tight mb-1 truncate",
            isSelected ? "text-indigo-200" : "text-white"
          )}
        >
          {mod.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <span className="truncate max-w-[120px]">{mod.author}</span>
          <span className="w-1 h-1 rounded-full bg-slate-500" />
          <span>{mod.tags[0]}</span>
        </div>
      </div>
    </motion.div>
  );
};
