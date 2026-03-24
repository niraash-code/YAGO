import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Package,
  Layers,
  FileWarning,
  Check,
  Zap,
  Box,
  Edit2,
  Trash2,
} from "lucide-react";
import { ImportCandidate, ImportWarning } from "../../lib/api";
import { cn } from "../../lib/utils";

interface ImportStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ImportCandidate[];
  onConfirm: (finalCandidates: ImportCandidate[]) => void;
}

export const ImportStagingModal: React.FC<ImportStagingModalProps> = ({
  isOpen,
  onClose,
  candidates: initialCandidates,
  onConfirm,
}) => {
  const [candidates, setCandidates] =
    useState<ImportCandidate[]>(initialCandidates);
  const [editingIndex, setEditingField] = useState<number | null>(null);

  // Sync candidates when modal opens or props change
  React.useEffect(() => {
    if (isOpen) {
      setCandidates(initialCandidates);
    }
  }, [isOpen, initialCandidates]);

  const toggleCandidate = (index: number) => {
    const next = [...candidates];
    next[index].initial_state = !next[index].initial_state;
    setCandidates(next);
  };

  const renameCandidate = (index: number, name: string) => {
    const next = [...candidates];
    next[index].suggested_name = name;
    setCandidates(next);
  };

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const getTopologyStyle = (topology: string) => {
    switch (topology) {
      case "Merged":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Standard":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted/10 text-muted-foreground border-border";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-background/50">
              <div>
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">
                  Migration Gateway
                </h2>
                <div className="flex items-center gap-3">
                  <Package className="text-primary" size={24} />
                  <h3 className="text-2xl font-black text-foreground uppercase italic tracking-tighter">
                    Found {candidates.length} Mods to Import
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onConfirm(candidates)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                >
                  <Check size={18} /> Commit to Library
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-4">
                {candidates.map((c, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "group flex items-center gap-6 p-4 rounded-xl border transition-all",
                      c.initial_state
                        ? "bg-card border-border hover:border-primary/40"
                        : "bg-muted/30 border-transparent grayscale opacity-60"
                    )}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => toggleCandidate(idx)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative shrink-0",
                        c.initial_state ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 bg-primary-foreground rounded-full transition-all",
                          c.initial_state ? "right-1" : "left-1"
                        )}
                      />
                    </button>

                    {/* Thumbnail */}
                    <div className="w-24 aspect-video rounded-lg bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {c.preview_image && c.preview_image.trim() !== "" ? (
                        <img
                          src={`yago-asset://localhost/${encodeURIComponent(
                            c.original_path + "/" + c.preview_image
                          )}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Box size={24} className="text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {editingIndex === idx ? (
                          <input
                            autoFocus
                            type="text"
                            value={c.suggested_name}
                            onChange={e => renameCandidate(idx, e.target.value)}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={e =>
                              e.key === "Enter" && setEditingField(null)
                            }
                            className="bg-background border border-primary rounded px-2 py-0.5 text-sm font-bold text-foreground focus:outline-none"
                          />
                        ) : (
                          <h4
                            className="text-sm font-black text-foreground uppercase tracking-tight truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setEditingField(idx)}
                          >
                            {c.suggested_name}
                          </h4>
                        )}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest shrink-0",
                            getTopologyStyle(c.detected_topology)
                          )}
                        >
                          {c.detected_topology}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {c.original_path}
                      </p>
                    </div>

                    {/* Warnings */}
                    <div className="flex flex-col gap-1 items-end min-w-[200px]">
                      {c.warnings.map((w, wIdx) => (
                        <div
                          key={wIdx}
                          className={cn(
                            "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight",
                            w.level === "Critical"
                              ? "text-destructive"
                              : w.level === "Warning"
                                ? "text-primary"
                                : "text-primary/80"
                          )}
                        >
                          <FileWarning size={12} />
                          {w.message}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingField(idx)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => removeCandidate(idx)}
                        className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-background/50 border-t border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {candidates.filter(c => c.initial_state).length} Enabled
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  {candidates.filter(c => !c.initial_state).length} Disabled
                </div>
              </div>
              <button
                onClick={() =>
                  onConfirm(candidates.filter(c => c.warnings.length === 0))
                }
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Zap size={14} /> Quick Import (Trust YAGO)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
