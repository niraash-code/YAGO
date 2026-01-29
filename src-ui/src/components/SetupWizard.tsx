import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  CheckCircle2,
  Shield,
  Zap,
  Box,
  ArrowRight,
  Loader2,
  Monitor,
  AlertCircle,
  FolderOpen,
  Search,
} from "lucide-react";
import { useAssetInstaller } from "../hooks/useAssetInstaller";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";

export const SetupWizard: React.FC = () => {
  const { installState: protonState, installProton } = useAssetInstaller();
  const { installState: loaderState, installGameLoader } = useAssetInstaller();
  const {
    isSetupRequired,
    globalSettings,
    updateGlobalSettings,
    setupStatus,
    refreshSetupStatus,
  } = useAppStore();
  const { showAlert } = useUiStore();

  const isLinux = window.navigator.userAgent.includes("Linux");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [detectedPath, setDetectedPath] = useState<string | null>(
    setupStatus?.detected_steam_path || null
  );
  const [storagePath, setStoragePath] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modsPath, setModsPath] = useState("");
  const [runnersPath, setRunnersPath] = useState("");
  const [prefixesPath, setPrefixesPath] = useState("");
  const [cachePath, setCachePath] = useState("");

  useEffect(() => {
    if (globalSettings) {
      setStoragePath(globalSettings.yago_storage_path || "");
      setModsPath(globalSettings.mods_path || "");
      setRunnersPath(globalSettings.runners_path || "");
      setPrefixesPath(globalSettings.prefixes_path || "");
      setCachePath(globalSettings.cache_path || "");
    }
  }, [globalSettings]);

  const handleSelectGranularPath = async (
    setter: (p: string) => void,
    title: string
  ) => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title,
      });
      if (selected && typeof selected === "string") {
        setter(selected);
      }
    } catch (e) {
      console.error("Failed to select directory:", e);
    }
  };

  const handleConfirmStorage = async () => {
    if (globalSettings) {
      await updateGlobalSettings({
        ...globalSettings,
        yago_storage_path: storagePath,
        mods_path: modsPath,
        runners_path: runnersPath,
        prefixes_path: prefixesPath,
        cache_path: cachePath,
      });
      setStep(isLinux ? 1 : 2);
    }
  };

  const handleSelectExistingProton = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Steam compatibilitytools.d or Proton folder",
      });

      if (selected && typeof selected === "string" && globalSettings) {
        setDetectedPath(selected);
      }
    } catch (e) {
      console.error("Failed to select directory:", e);
    }
  };

  const handleAutoDetectProton = async () => {
    try {
      const detected = await api.detectSteamProtonPath();
      if (detected) {
        setDetectedPath(detected);
      } else {
        showAlert(
          "No standard Steam Proton directories were found. Please select manually.",
          "Detection Failed"
        );
      }
    } catch (e) {
      console.error("Auto detect failed:", e);
      handleSelectExistingProton();
    }
  };

  const handleConfirmPath = async () => {
    if (detectedPath && globalSettings) {
      await updateGlobalSettings({
        ...globalSettings,
        steam_compat_tools_path: detectedPath,
      });
      setStep(2);
    }
  };

  const handleComplete = async () => {
    // Refresh the global setup state to transition to the main app
    await refreshSetupStatus();
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-10 pb-6 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-600/20">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Initialize YAGO
          </h1>
          <p className="text-slate-400 font-medium max-w-md mx-auto">
            We need to download core components to ensure your games run
            smoothly with mods.
          </p>
        </div>

        {/* Steps Progress */}
        <div className="px-10 mb-8">
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map(s => {
              if (s === 1 && !isLinux) return null;
              return (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    step === s
                      ? "w-12 bg-indigo-500"
                      : s < step
                        ? "w-6 bg-emerald-500"
                        : "w-6 bg-white/10"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 px-10 pb-10 flex flex-col justify-center min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 flex flex-col items-center text-center gap-6 group hover:bg-white/[0.07] transition-colors">
                  <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FolderOpen size={40} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Storage Location
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Choose where YAGO will store your game library, mods, and
                      cached assets. You can use your internal drive or an
                      external SSD.
                    </p>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={storagePath}
                        onChange={e => setStoragePath(e.target.value)}
                        placeholder="Default (App Data)"
                        className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                      <button
                        onClick={() =>
                          handleSelectGranularPath(
                            setStoragePath,
                            "Select YAGO Storage Directory"
                          )
                        }
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-slate-400 transition-all"
                      >
                        <FolderOpen size={20} />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-2 px-1"
                    >
                      {showAdvanced ? "Hide" : "Show"} Advanced Path Options
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 gap-4">
                            {[
                              {
                                label: "Mods Path",
                                value: modsPath,
                                setter: setModsPath,
                              },
                              {
                                label: "Runners Path",
                                value: runnersPath,
                                setter: setRunnersPath,
                              },
                              {
                                label: "Prefixes Path",
                                value: prefixesPath,
                                setter: setPrefixesPath,
                              },
                              {
                                label: "Cache Path",
                                value: cachePath,
                                setter: setCachePath,
                              },
                            ].map(item => (
                              <div key={item.label} className="space-y-1.5">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                  {item.label}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={item.value}
                                    onChange={e => item.setter(e.target.value)}
                                    placeholder="Use Storage Default"
                                    className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                  />
                                  <button
                                    onClick={() =>
                                      handleSelectGranularPath(
                                        item.setter,
                                        `Select ${item.label}`
                                      )
                                    }
                                    className="px-3 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-slate-300"
                                  >
                                    <FolderOpen size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!storagePath && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/5 p-3 rounded-xl border border-amber-400/10">
                        <AlertCircle size={14} /> Recommended: Choose a path
                        with at least 100GB free space.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleConfirmStorage}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                >
                  Continue to Components <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 flex flex-col items-center text-center gap-6 group hover:bg-white/[0.07] transition-colors">
                  <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Monitor size={40} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Compatibility Runner
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Proton GE is required to run Windows games on Linux with
                      optimal performance and compatibility.
                    </p>
                  </div>

                  {protonState.status === "idle" && !detectedPath && (
                    <div className="w-full space-y-3">
                      <button
                        onClick={() => installProton()}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                      >
                        <Download size={20} />
                        Download Proton GE
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleAutoDetectProton}
                          className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Search size={16} />
                          Auto Detect
                        </button>
                        <button
                          onClick={handleSelectExistingProton}
                          className="py-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FolderOpen size={16} />
                          Manual
                        </button>
                      </div>
                    </div>
                  )}

                  {detectedPath && protonState.status === "idle" && (
                    <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 text-center">
                          Detected Path
                        </div>
                        <div className="text-xs text-slate-300 font-mono break-all text-center leading-relaxed">
                          {detectedPath}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setDetectedPath(null)}
                          className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-400 rounded-xl text-sm font-bold transition-colors"
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleConfirmPath}
                          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                          Confirm & Continue <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {protonState.status === "working" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />{" "}
                          Downloading...
                        </span>
                        <span>{Math.round(protonState.progress * 100)}%</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${protonState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {protonState.status === "error" && (
                    <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400">
                        <AlertCircle size={20} className="mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-bold text-sm">Download Failed</p>
                          <p className="text-xs opacity-80 break-all">
                            {protonState.error || "An unknown error occurred."}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => installProton()}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3"
                      >
                        <Download size={20} />
                        Retry Download
                      </button>
                    </div>
                  )}

                  {protonState.status === "done" && (
                    <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      Runner Ready
                    </div>
                  )}
                </div>

                <button
                  disabled={protonState.status !== "done"}
                  onClick={() => setStep(2)}
                  className="w-full py-4 rounded-2xl border border-white/10 text-white font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 flex flex-col items-center text-center gap-6 group hover:bg-white/[0.07] transition-colors">
                  <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap size={40} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Core Mod Loaders
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Download common modding libraries like ReShade and the
                      global asset proxy.
                    </p>
                  </div>

                  {loaderState.status === "idle" && (
                    <button
                      onClick={() => installGameLoader("common")}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                    >
                      <Download size={20} />
                      Setup Common Assets
                    </button>
                  )}

                  {loaderState.status === "working" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />{" "}
                          Installing...
                        </span>
                        <span>{Math.round(loaderState.progress * 100)}%</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${loaderState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {loaderState.status === "error" && (
                    <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400">
                        <AlertCircle size={20} className="mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-bold text-sm">
                            Installation Failed
                          </p>
                          <p className="text-xs opacity-80 break-all">
                            {loaderState.error || "An unknown error occurred."}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => installGameLoader("common")}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3"
                      >
                        <Download size={20} />
                        Retry Installation
                      </button>
                    </div>
                  )}

                  {loaderState.status === "done" && (
                    <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      Loaders Ready
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    disabled={loaderState.status !== "done"}
                    onClick={() => setStep(3)}
                    className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-10"
              >
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      damping: 12,
                      stiffness: 200,
                      delay: 0.2,
                    }}
                    className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20"
                  >
                    <CheckCircle2 size={64} />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl -z-10"
                  />
                </div>

                <div>
                  <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                    Everything Ready!
                  </h2>
                  <p className="text-slate-400 font-medium">
                    YAGO has been successfully initialized. You can now start
                    adding your games.
                  </p>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xl transition-all shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95"
                >
                  Enter Library
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
