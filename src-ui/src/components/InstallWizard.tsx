import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FolderOpen,
  CheckCircle,
  Download,
  ChevronRight,
  HardDrive,
  Globe,
  Music,
} from "lucide-react";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api, ManifestCategory } from "../lib/api";
import { cn } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";

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

  const handleSelectInstallPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: `Select Installation Folder for ${gameName}`,
      });
      if (selected && typeof selected === "string") {
        setInstallPath(selected);
      }
    } catch (e) {
      console.error("Failed to select directory:", e);
    }
  };

  const handleNextToCategories = async () => {
    if (!installPath) {
      showAlert("Please specify an installation path.", "Error");
      return;
    }
    setIsLoading(true);
    try {
      const id = await api.initializeRemoteGame(templateId);
      useAppStore.getState().selectGame(id);

      const opts = await api.getInstallOptions(templateId);
      setCategories(opts);
      setSelectedCategoryIds(opts.map(c => c.id));
      setStep("categories");
    } catch (e) {
      showAlert("Failed to fetch install options: " + e, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (cat: ManifestCategory) => {
    if (cat.is_required) return;

    setSelectedCategoryIds(prev =>
      prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      await api.updateGameConfig(templateId, { installPath });
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
          className="fixed inset-0 bg-background/90 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Wizard Header */}
            <div className="p-8 border-b border-border flex items-center justify-between bg-muted">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-3">
                  <Download className="text-primary" />
                  Install {gameName}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <div
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      step === "path" ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    01 Path
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground" />
                  <div
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      step === "categories"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    02 Content
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground" />
                  <div
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      step === "confirm"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    03 Ready
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted-foreground/10 rounded-lg text-muted-foreground transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Steps Content */}
            <div className="p-10 min-h-[350px] flex flex-col bg-background">
              {step === "path" && (
                <div className="space-y-8 flex-1">
                  <div className="bg-card border border-border p-6 rounded-lg flex gap-5">
                    <HardDrive className="text-primary shrink-0" size={24} />
                    <p className="text-sm text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">
                      Select a directory where the game will be installed. YAGO
                      will create a sub-folder automatically.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Installation Directory
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={installPath}
                        onChange={e => setInstallPath(e.target.value)}
                        placeholder="e.g., /home/user/Games/Genshin"
                        className="flex-1 bg-card border border-border rounded-lg px-6 py-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                      />
                      <button
                        onClick={handleSelectInstallPath}
                        className="p-4 bg-card hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all"
                      >
                        <FolderOpen size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === "categories" && (
                <div className="space-y-6 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                      Selective Installation
                    </h3>
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded border border-primary/20">
                      Smart-Sync
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                          "group flex items-center justify-between p-5 rounded-lg border transition-all",
                          cat.is_required ? "cursor-default" : "cursor-pointer",
                          selectedCategoryIds.includes(cat.id)
                            ? "bg-card border-primary"
                            : "bg-card border-border opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded flex items-center justify-center transition-colors",
                              selectedCategoryIds.includes(cat.id)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {cat.name.toLowerCase().includes("audio") ? (
                              <Music size={20} />
                            ) : (
                              <Globe size={20} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-foreground uppercase tracking-tight italic">
                              {cat.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                {cat.is_required ? "Core" : "Optional"}
                              </p>
                              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                              <p className="text-[10px] text-primary font-mono font-black">
                                {formatSize(cat.size)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            cat.is_required
                              ? "border-primary bg-primary/20"
                              : selectedCategoryIds.includes(cat.id)
                                ? "border-primary bg-primary"
                                : "border-border"
                          )}
                        >
                          {(selectedCategoryIds.includes(cat.id) ||
                            cat.is_required) && (
                            <CheckCircle
                              size={14}
                              className="text-primary-foreground"
                            />
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
                    <CheckCircle
                      size={64}
                      className="text-primary relative z-10"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter italic">
                      Ready for Deployment
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed font-bold uppercase tracking-tight">
                      YAGO will now begin the block-level reconstruction of{" "}
                      {gameName}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
                    <div className="p-4 rounded-lg bg-card border border-border">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Status
                      </p>
                      <p className="text-xs font-black text-foreground uppercase">
                        Validating Hash
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-card border border-border">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Threads
                      </p>
                      <p className="text-xs font-black text-foreground uppercase">
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
                    className="flex-1 py-4 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all"
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
                  className="flex-[2] py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-primary/20"
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
