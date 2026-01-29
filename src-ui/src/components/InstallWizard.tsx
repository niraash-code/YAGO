import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FolderOpen,
  CheckCircle,
  Download,
  Info,
  ChevronRight,
  HardDrive,
  Globe,
  Music,
} from "lucide-react";
import { Game, InstallStatus } from "../types";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api, ManifestCategory } from "../lib/api";
import { cn } from "../lib/utils";

interface InstallWizardProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
  templateId: string;
}

export const InstallWizard: React.FC<InstallWizardProps> = ({
  isOpen,
  onClose,
  gameId,
  gameName,
  templateId,
}) => {
  const { startGameDownload, globalSettings } = useAppStore();
  const { showAlert } = useUiStore();
  const [step, setStep] = useState<"path" | "categories" | "confirm" | "done">(
    "path"
  );
  const [installPath, setInstallPath] = useState("");
  const [categories, setCategories] = useState<ManifestCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("path");

      // Default path from settings
      if (globalSettings?.default_games_path) {
        const separator = globalSettings.default_games_path.includes("\\")
          ? "\\"
          : "/";
        setInstallPath(
          `${globalSettings.default_games_path}${separator}${gameName}`
        );
      } else {
        setInstallPath("");
      }

      setCategories([]);
      setSelectedCategoryIds([]);
    }
  }, [isOpen, globalSettings, gameName]);

  const handleNextToCategories = async () => {
    if (!installPath) {
      showAlert("Please specify an installation path.", "Error");
      return;
    }
    setIsLoading(true);
    try {
      // Pin the game as "Remote" first if not already done
      const id = await api.initializeRemoteGame(templateId);
      
      // Select it in the store so UI knows we are working on it
      useAppStore.getState().selectGame(id);

      const opts = await api.getInstallOptions(templateId);
      setCategories(opts);
      // Select all categories by default
      setSelectedCategoryIds(opts.map(c => c.id));
      setStep("categories");
    } catch (e) {
      showAlert("Failed to fetch install options: " + e, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // 1. Update Path
      await api.updateGameConfig(templateId, { installPath });

      // 2. Start Download with selected categories
      await startGameDownload(templateId, selectedCategoryIds);

      showAlert(`${gameName} has been queued for installation.`, "Success");
      onClose();
    } catch (e) {
      showAlert("Failed to start installation: " + e, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Wizard Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                  <Download className="text-indigo-400" />
                  Install {gameName}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <div
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      step === "path" ? "text-indigo-400" : "text-slate-500"
                    )}
                  >
                    01 Path
                  </div>
                  <ChevronRight size={12} className="text-slate-700" />
                  <div
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      step === "categories"
                        ? "text-indigo-400"
                        : "text-slate-500"
                    )}
                  >
                    02 Content
                  </div>
                  <ChevronRight size={12} className="text-slate-700" />
                  <div
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      step === "confirm" ? "text-indigo-400" : "text-slate-500"
                    )}
                  >
                    03 Ready
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Steps Content */}
            <div className="p-10 min-h-[350px] flex flex-col">
              {step === "path" && (
                <div className="space-y-8 flex-1">
                  <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-2xl flex gap-5">
                    <HardDrive className="text-indigo-400 shrink-0" size={24} />
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">
                      Select a directory where the game will be installed. YAGO
                      will create a sub-folder for the game assets
                      automatically.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                      Installation Directory
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={installPath}
                        onChange={e => setInstallPath(e.target.value)}
                        placeholder="e.g., /home/user/Games/Genshin"
                        className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                      <button className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-slate-400 transition-all">
                        <FolderOpen size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === "categories" && (
                <div className="space-y-6 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Selective Installation
                    </h3>
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded">
                      Smart-Sync Active
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          "group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer",
                          selectedCategoryIds.includes(cat.id)
                            ? "bg-indigo-500/10 border-indigo-500/30"
                            : "bg-white/5 border-white/5 opacity-60 grayscale"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              selectedCategoryIds.includes(cat.id)
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "bg-slate-800 text-slate-500"
                            )}
                          >
                            {cat.id.toLowerCase().includes("audio") ? (
                              <Music size={20} />
                            ) : (
                              <Globe size={20} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight">
                              {cat.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                              {cat.id.toLowerCase().includes("audio")
                                ? "Optional Pack"
                                : "Core Asset"}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            selectedCategoryIds.includes(cat.id)
                              ? "border-indigo-500 bg-indigo-500 shadow-lg shadow-indigo-500/30"
                              : "border-white/10"
                          )}
                        >
                          {selectedCategoryIds.includes(cat.id) && (
                            <CheckCircle size={14} className="text-white" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === "confirm" && (
                <div className="text-center py-10 space-y-8 flex-1">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"
                    />
                    <CheckCircle
                      size={64}
                      className="text-indigo-400 relative z-10"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                      Ready for Deployment
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                      YAGO will now begin the block-level reconstruction of{" "}
                      {gameName} at the specified path.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Status
                      </p>
                      <p className="text-xs font-bold text-white uppercase">
                        Validating Hash
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Threads
                      </p>
                      <p className="text-xs font-bold text-white uppercase">
                        8 Workers
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="mt-auto flex gap-4 pt-10">
                {step !== "path" && (
                  <button
                    onClick={() =>
                      setStep(step === "categories" ? "path" : "categories")
                    }
                    className="flex-1 py-4 border border-white/10 hover:bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={
                    step === "path"
                      ? handleNextToCategories
                      : step === "categories"
                        ? () => setStep("confirm")
                        : handleFinish
                  }
                  disabled={isLoading}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading
                    ? "Fetching Manifest..."
                    : step === "confirm"
                      ? "Begin Installation"
                      : "Next Step"}
                  {!isLoading && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
