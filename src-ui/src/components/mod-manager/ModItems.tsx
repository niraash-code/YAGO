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
import { Skeleton } from "../ui/skeleton";

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
  const [imageLoaded, setImageLoaded] = useState(false);
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
    const newName = await showPrompt("Enter new name:", mod.name, "Rename Mod");
    if (newName && newName !== mod.name) onRename(mod.id, newName);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const confirmed = await showConfirm(
      `Uninstall "${mod.name}"?`,
      "Delete Mod"
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
        "group flex items-center p-3 pr-4 rounded border transition-all relative outline-none",
        isSelected
          ? "bg-card border-primary"
          : "bg-background border-border hover:border-primary/50"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      {isReorderEnabled ? (
        <div className="flex flex-col gap-0.5 mr-3 invisible group-hover:visible transition-all">
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors outline-none"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors outline-none"
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
            "w-11 h-6 rounded-full transition-colors duration-200 border border-border",
            mod.enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <div
            className={cn(
              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform duration-200 shadow-sm",
              mod.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>

      <div className="relative w-24 h-14 rounded overflow-hidden bg-card shrink-0 border border-border flex items-center justify-center">
        {!imageLoaded && mod.imageUrl && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        {!mod.imageUrl && (
          <FileBox size={24} className="text-muted-foreground/20" />
        )}
        {mod.imageUrl && (
          <>
            {shouldBlur ? (
              <div className="w-full h-full relative">
                <img
                  src={mod.imageUrl}
                  className={cn(
                    "w-full h-full object-cover grayscale opacity-20",
                    !imageLoaded && "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <EyeOff size={18} />
                </div>
              </div>
            ) : (
              <img
                src={mod.imageUrl}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  !imageLoaded ? "opacity-0" : "opacity-100"
                )}
                onLoad={() => setImageLoaded(true)}
              />
            )}
          </>
        )}
      </div>

      <div
        className={cn("flex-1 min-w-0 ml-4", shouldBlur ? "select-none" : "")}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={cn(
              "font-black text-sm truncate uppercase tracking-tight italic",
              isSelected ? "text-foreground" : "text-foreground"
            )}
          >
            {mod.name}
          </h3>
          {isNsfw && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-destructive text-destructive-foreground font-black uppercase tracking-widest">
              NSFW
            </span>
          )}
          {mod.isValidated === true && (
            <CheckCircle2 size={14} className="text-primary" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {mod.modType && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/20 text-primary font-black uppercase tracking-widest border border-primary/20">
              {mod.modType}
            </span>
          )}
          {mod.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className={cn(
                "px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest",
                getTagStyle(tag)
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {isSelected && (
        <div className="relative flex items-center gap-2" ref={menuRef}>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={cn(
              "p-2 rounded-lg transition-colors outline-none border border-transparent",
              showMenu
                ? "bg-muted border-border text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1"
              >
                <div className="px-1">
                  <button
                    onClick={handleRename}
                    className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors rounded-md"
                  >
                    <Edit size={14} className="text-primary" /> Rename
                  </button>
                  <button
                    onClick={handleCopyId}
                    className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors rounded-md"
                  >
                    <Copy size={14} className="text-primary" /> Copy ID
                  </button>
                </div>
                <div className="h-px bg-border my-1 mx-1" />
                <div className="px-1">
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors rounded-md"
                  >
                    <Trash2 size={14} /> Uninstall
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
        "flex items-center text-sm h-14 border-b border-border px-4 gap-4 cursor-pointer select-none transition-colors outline-none",
        isSelected ? "bg-card" : "hover:bg-muted/50 bg-background"
      )}
    >
      {isReorderEnabled && (
        <div className="flex flex-col -gap-0.5 w-4 shrink-0">
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveUp();
            }}
            data-testid="mod-move-up"
            disabled={!canMoveUp}
            className="text-muted-foreground hover:text-primary disabled:opacity-20"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onMoveDown();
            }}
            data-testid="mod-move-down"
            disabled={!canMoveDown}
            className="text-muted-foreground hover:text-primary disabled:opacity-20"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      )}

      <div
        onClick={e => onToggle(mod.id, e)}
        data-testid="mod-toggle"
        className="relative flex items-center cursor-pointer shrink-0"
      >
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors duration-200 border border-border",
            mod.enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <div
            className={cn(
              "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform duration-200",
              mod.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex-1 truncate flex items-center gap-2 font-black text-sm uppercase italic tracking-tight",
          isSelected ? "text-primary" : "text-foreground",
          shouldBlur ? "opacity-40" : ""
        )}
      >
        <FileBox
          size={16}
          className={isSelected ? "text-primary" : "text-muted-foreground"}
        />
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
  const [imageLoaded, setImageLoaded] = useState(false);

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
        "group relative aspect-video rounded-lg overflow-hidden cursor-pointer border transition-all duration-300 outline-none",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/50 bg-background"
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {!imageLoaded && mod.imageUrl && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        {!mod.imageUrl && (
          <FileBox size={48} className="text-muted-foreground/10" />
        )}
        {mod.imageUrl && (
          <img
            src={mod.imageUrl}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
              shouldBlur && "grayscale opacity-40",
              !imageLoaded ? "opacity-0" : "opacity-100"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {shouldBlur && mod.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <EyeOff size={32} />
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

      <div className="absolute top-2 right-2 flex gap-2">
        {isNsfw && (
          <span className="bg-destructive text-destructive-foreground text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-lg">
            18+
          </span>
        )}
        <div
          onClick={e => onToggle(mod.id, e)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all border",
            mod.enabled
              ? "bg-primary border-primary text-primary-foreground shadow-lg"
              : "bg-background/80 border-border text-muted-foreground hover:border-primary"
          )}
        >
          <Check size={16} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3
          className={cn(
            "font-black text-lg leading-tight mb-1 truncate uppercase italic tracking-tighter",
            isSelected ? "text-primary" : "text-foreground"
          )}
        >
          {mod.name}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          <span className="truncate max-w-[120px]">{mod.author}</span>
        </div>
      </div>
    </motion.div>
  );
};
