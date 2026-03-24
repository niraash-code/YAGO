import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileArchive,
  Folder,
  Zap,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ImportCandidate, api } from "../lib/api";
import { cn } from "../lib/utils";

interface ModImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ImportCandidate[];
  onConfirm: (selected: ImportCandidate[]) => void;
  isProcessing: boolean;
}

export const ModImportModal: React.FC<ModImportModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onConfirm,
  isProcessing,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndices(candidates.map((_, i) => i));
    }
  }, [isOpen, candidates]);

  const toggleSelect = (idx: number) => {
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Alchemy Header */}
            <div className="p-8 border-b border-border bg-muted/30 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-3">
                  <Sparkles className="text-primary animate-pulse" />
                  Protocol Alchemy
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1 ml-9">
                  Transmuting Chaos into Gold
                </p>
              </div>
              <button
                onClick={onClose}
                className="absolute top-8 right-8 p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X size={24} />
              </button>
              
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              {candidates.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 } }}
                  onClick={() => toggleSelect(i)}
                  className={cn(
                    "group relative p-6 rounded-2xl transition-all cursor-pointer border",
                    selectedIndices.includes(i)
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/30 border-border opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        selectedIndices.includes(i) ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                      )}>
                        {c.detected_topology === "Archive" ? <FileArchive size={24} /> : <Folder size={24} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground tracking-tight uppercase italic leading-none mb-2">
                          {c.suggested_name}
                        </h3>
                        <div className="flex items-center gap-3">
                          {c.identified_character ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                              <Zap size={10} className="fill-primary" />
                              Identified: {c.identified_character}
                            </div>
                          ) : (
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              Unknown Essence
                            </div>
                          )}
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded border border-border">
                            {c.detected_topology}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedIndices.includes(i) ? "border-primary bg-primary" : "border-border"
                    )}>
                      {selectedIndices.includes(i) && <ShieldCheck size={14} className="text-primary-foreground" />}
                    </div>
                  </div>

                  {/* Warnings */}
                  {c.warnings.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      {c.warnings.map((w, wi) => (
                        <div key={wi} className="flex items-center gap-2 text-[10px] font-bold text-yellow-500/80 uppercase tracking-tight">
                          <AlertTriangle size={12} />
                          {w.message}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-border bg-muted/20 backdrop-blur-xl flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all"
              >
                Reject Assets
              </button>
              <button
                onClick={() => onConfirm(selectedIndices.map(i => candidates[i]))}
                disabled={selectedIndices.length === 0 || isProcessing}
                className="flex-[2] py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-primary/40 group"
              >
                {isProcessing ? (
                  <Zap className="animate-spin" size={18} />
                ) : (
                  <>
                    Commence Transmutation
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
