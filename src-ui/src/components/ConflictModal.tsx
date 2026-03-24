import React from "react";
import { useAppStore } from "../store/gameStore";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

export const ConflictModal: React.FC = () => {
  const { conflictReport, setConflictReport, games, selectedGameId } =
    useAppStore();

  if (!conflictReport) return null;

  const game = games.find(g => g.id === selectedGameId);

  const getModName = (uuid: string) => {
    return game?.mods.find(m => m.id === uuid)?.name || uuid;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/90 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-primary/30 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-primary">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-black uppercase italic tracking-tighter">
                Deployment Conflicts
              </h2>
            </div>
            <button
              onClick={() => setConflictReport(null)}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 bg-card">
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Assets overwritten by lower load order mods. The{" "}
              <strong>last mod listed</strong> wins.
            </p>

            <div className="space-y-3">
              {Object.entries(conflictReport.overwritten_hashes).map(
                ([hash, modIds]) => (
                  <div
                    key={hash}
                    className="bg-background rounded-lg p-4 border border-border"
                  >
                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="bg-card px-2 py-0.5 rounded border border-border">
                        Hash: {hash}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {modIds.map((uuid, index) => (
                        <div key={uuid} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground border border-border">
                            {index + 1}
                          </div>
                          <span
                            className={cn(
                              "text-xs font-bold uppercase tracking-tight",
                              index === modIds.length - 1
                                ? "text-primary"
                                : "text-muted-foreground/50 line-through"
                            )}
                          >
                            {getModName(uuid)}
                          </span>
                          {index === modIds.length - 1 && (
                            <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded font-black uppercase tracking-widest ml-auto">
                              Active
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border bg-background flex justify-end">
            <button
              onClick={() => setConflictReport(null)}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-primary/20"
            >
              Acknowledge
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
