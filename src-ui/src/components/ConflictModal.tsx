import React from "react";
import { useAppStore } from "../store/gameStore";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-white/5 bg-amber-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-bold">
                Deployment Conflicts Detected
              </h2>
            </div>
            <button
              onClick={() => setConflictReport(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            <p className="text-slate-300 text-sm">
              The following assets were overwritten by mods lower in the load
              order. The <strong>last mod listed</strong> for each hash is the
              winner.
            </p>

            <div className="space-y-3">
              {Object.entries(conflictReport.overwritten_hashes).map(
                ([hash, modIds]) => (
                  <div
                    key={hash}
                    className="bg-black/30 rounded-xl p-4 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2 text-xs font-mono text-slate-500">
                      <span className="bg-white/5 px-2 py-0.5 rounded">
                        Hash: {hash}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {modIds.map((uuid, index) => (
                        <div key={uuid} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-white/5">
                            {index + 1}
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              index === modIds.length - 1
                                ? "text-emerald-400"
                                : "text-slate-400 line-through decoration-slate-600"
                            )}
                          >
                            {getModName(uuid)}
                          </span>
                          {index === modIds.length - 1 && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold tracking-wider ml-auto">
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

          <div className="p-4 border-t border-white/5 bg-slate-950/50 flex justify-end">
            <button
              onClick={() => setConflictReport(null)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              Acknowledge
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
