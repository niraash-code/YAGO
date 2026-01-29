import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  CheckCircle2,
  Shield,
  Zap,
  ArrowRight,
  Loader2,
  Monitor,
  FolderOpen,
  Search,
  HelpCircle,
  Database,
  Library,
  ChevronLeft,
} from "lucide-react";
import { useAssetInstaller } from "../hooks/useAssetInstaller";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";
import { Tooltip } from "./ui/Tooltip";

export const SetupWizard: React.FC = () => {
  const { installState: protonState, installProton } = useAssetInstaller();
  const { installState: loaderState, installGameLoader } = useAssetInstaller();
  const {
    globalSettings,
    updateGlobalSettings,
    setupStatus,
    refreshSetupStatus,
    addGame,
  } = useAppStore();
  const { showAlert } = useUiStore();

  const isLinux = window.navigator.userAgent.includes("Linux");
  // Steps: 0: Storage, 1: Library, 2: Discovery, 3: Advanced, 4: Runners, 5: Loaders, 6: Done
  const [step, setStep] = useState<number>(0);
  const [detectedPath, setDetectedPath] = useState<string | null>(
    setupStatus?.detected_steam_path || null
  );
  const [storagePath, setStoragePath] = useState<string>("");
  const [modsPath, setModsPath] = useState("");
  const [runnersPath, setRunnersPath] = useState("");
  const [prefixesPath, setPrefixesPath] = useState("");
  const [cachePath, setCachePath] = useState("");
  const [defaultGamesPath, setDefaultGamesPath] = useState("");
  const [discoveredGames, setFoundGames] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      setStoragePath(globalSettings.yago_storage_path || "");
      setDefaultGamesPath(globalSettings.default_games_path || "");
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
    setStep(1);
  };

  const handleConfirmLibrary = async () => {
    if (defaultGamesPath) {
      setStep(2);
      startAutoDiscovery();
    } else {
      setStep(isLinux ? 4 : 5); // Skip discovery if no path
    }
  };

  const saveAllPaths = async () => {
    if (globalSettings) {
      await updateGlobalSettings({
        ...globalSettings,
        yago_storage_path: storagePath,
        default_games_path: defaultGamesPath,
        mods_path: modsPath,
        runners_path: runnersPath,
        prefixes_path: prefixesPath,
        cache_path: cachePath,
      });
    }
  };

  const startAutoDiscovery = async () => {
    if (!defaultGamesPath) return;
    setIsScanning(true);
    try {
      const discovered = await api.recursiveScanPath(defaultGamesPath);
      const gamePromises = discovered.map(async d => {
        try {
          const identified = await api.identifyGame(
            d.path as unknown as string
          );
          return {
            id: identified.id,
            name: identified.name,
            logoInitial: identified.logo_initial,
            installPath: identified.install_path,
            exeName: identified.exe_name,
            modloader_enabled: identified.modloader_enabled,
            injection_method: identified.injection_method,
            supported_injection_methods: identified.supported_injection_methods,
            version: identified.version,
            size: identified.size,
            color: identified.color,
            accentColor: identified.accent_color,
            coverImage: identified.cover_image,
            icon: identified.icon,
            developer: identified.developer,
            description: identified.description,
            regions: identified.regions,
            shortName: identified.short_name,
          };
        } catch (e) {
          return null;
        }
      });
      const resolved = (await Promise.all(gamePromises)).filter(g => g !== null);
      setFoundGames(resolved);
    } catch (e) {
      console.error("Discovery failed:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const addDiscoveredGame = async (game: any) => {
    try {
      const g: any = {
        ...game,
        status: "Installed",
        activeProfileId: "default",
        profiles: [
          {
            id: "default",
            name: "Default",
            description: "Default Loadout",
            type: "default",
            created: new Date().toISOString(),
            enabledModIds: [],
            loadOrder: [],
          },
        ],
        mods: [],
        autoUpdate: false,
      };
      await addGame(g);
      setFoundGames(prev => prev.filter(pg => pg.id !== game.id));
    } catch (e) {
      showAlert("Failed to add game: " + e, "Error");
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

  const handleConfirmProtonPath = async () => {
    if (detectedPath && globalSettings) {
      await updateGlobalSettings({
        ...globalSettings,
        steam_compat_tools_path: detectedPath,
      });
      setStep(5);
    }
  };

  const handleComplete = async () => {
    // Final save of all storage paths just in case
    await saveAllPaths();
    // Refresh the global setup state to transition to the main app
    await refreshSetupStatus();
  };

  const prevStep = () => {
    if (step === 4 && !isLinux) setStep(2);
    else if (step === 0.5) setStep(0);
    else setStep(s => s - 1);
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
        className="w-full max-w-xl bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 pb-4 text-center relative">
          {step > 0 && step < 6 && (
            <button
              onClick={prevStep}
              className="absolute left-8 top-10 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-600/20">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {step === 0 ? "Storage Home" : step === 1 ? "Game Library" : step === 2 ? "Identify Titles" : step === 3 ? "Advanced Paths" : step === 4 ? "Compat Tools" : step === 5 ? "Mod Assets" : "Everything Ready"}
          </h1>
        </div>

        {/* Steps Progress */}
        <div className="px-10 mb-6">
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map(s => {
              if (s === 4 && !isLinux) return null;
              if (s === 3 && step !== 3) return null; // Only show advanced if we are in it
              return (
                <div
                  key={s}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    step === s
                      ? "w-8 bg-indigo-500"
                      : s < step
                        ? "w-4 bg-emerald-500"
                        : "w-4 bg-white/10"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 px-10 pb-10 flex flex-col justify-center min-h-[320px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex flex-col items-center text-center gap-4 group hover:bg-white/[0.07] transition-colors">
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Database size={32} />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-white">YAGO Storage</h2>
                      <Tooltip content="Where YAGO stores internal data, mod files, and prefixes. High speed SSD recommended.">
                        <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                      Choose a central location for your mods and environment data.
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={storagePath}
                        onChange={e => setStoragePath(e.target.value)}
                        placeholder="Default (App Data)"
                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                      <button
                        onClick={() =>
                          handleSelectGranularPath(
                            setStoragePath,
                            "Select YAGO Storage Directory"
                          )
                        }
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-slate-400 transition-all"
                      >
                        <FolderOpen size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleConfirmStorage}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                  >
                    Next Step <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
                  >
                    Advanced Path Overrides
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex flex-col items-center text-center gap-4 group hover:bg-white/[0.07] transition-colors">
                  <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Library size={32} />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-white">Games Root</h2>
                      <Tooltip content="The directory where your games are installed. YAGO will scan this to build your library.">
                        <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                      Point to your primary games directory for automatic discovery.
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={defaultGamesPath}
                        onChange={e => setDefaultGamesPath(e.target.value)}
                        placeholder="e.g., /home/user/Games"
                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                      <button
                        onClick={() =>
                          handleSelectGranularPath(
                            setDefaultGamesPath,
                            "Select Games Directory"
                          )
                        }
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-slate-400 transition-all"
                      >
                        <FolderOpen size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmLibrary}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                >
                  Start Discovery <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="stepDiscovery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-tighter italic">
                    {isScanning ? "Scanning Library..." : "Games Identified"}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                    {isScanning
                      ? "Looking for supported titles 4 levels deep..."
                      : `${discoveredGames.length} titles found in your root.`}
                  </p>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {isScanning ? (
                    <div className="h-32 flex items-center justify-center">
                      <Loader2 size={40} className="text-indigo-500 animate-spin" />
                    </div>
                  ) : discoveredGames.length > 0 ? (
                    discoveredGames.map(game => (
                      <div
                        key={game.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-inner">
                          {game.logoInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">
                            {game.name}
                          </h4>
                          <p className="text-[9px] text-slate-500 truncate font-mono">
                            {game.installPath}
                          </p>
                        </div>
                        <button
                          onClick={() => addDiscoveredGame(game)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-50 italic">
                      <p className="text-xs text-slate-400">No supported games found.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep(isLinux ? 4 : 5)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                >
                  Continue to Components <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="stepAdvanced"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[
                    { label: "Mods Path", value: modsPath, setter: setModsPath, tooltip: "Global storage for all mod files." },
                    { label: "Runners Path", value: runnersPath, setter: setRunnersPath, tooltip: "Where Proton/WINE binaries are stored." },
                    { label: "Prefixes Path", value: prefixesPath, setter: setPrefixesPath, tooltip: "Where game-specific WINE environments are kept." },
                    { label: "Cache Path", value: cachePath, setter: setCachePath, tooltip: "Internal cache for textures and assets." },
                  ].map(item => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center gap-2 ml-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          {item.label}
                        </label>
                        <Tooltip content={item.tooltip}>
                          <HelpCircle size={10} className="text-slate-600 hover:text-indigo-400" />
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.value}
                          onChange={e => item.setter(e.target.value)}
                          placeholder="Use Storage Default"
                          className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] text-white focus:outline-none focus:border-indigo-500/50 transition-all"
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

                <button
                  onClick={() => setStep(0)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20"
                >
                  Save Overrides
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
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
                      Runner Components
                    </h2>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                      Proton GE is required to run Windows titles on Linux. YAGO can download it or link your existing Steam install.
                    </p>
                  </div>

                  {protonState.status === "idle" && !detectedPath && (
                    <div className="w-full space-y-3">
                      <button
                        onClick={() => installProton()}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                      >
                        <Download size={18} />
                        Download Proton GE
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleAutoDetectProton}
                          className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Search size={14} />
                          Auto Detect
                        </button>
                        <button
                          onClick={handleSelectExistingProton}
                          className="py-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <FolderOpen size={14} />
                          Manual
                        </button>
                      </div>
                    </div>
                  )}

                  {detectedPath && protonState.status === "idle" && (
                    <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 text-center">
                          Linked Path
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono break-all text-center leading-relaxed">
                          {detectedPath}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setDetectedPath(null)}
                          className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-400 rounded-xl text-xs font-bold transition-colors"
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleConfirmProtonPath}
                          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                          Confirm & Continue <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {protonState.status === "working" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" />{" "}
                          Downloading...
                        </span>
                        <span>{Math.round(protonState.progress * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${protonState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {protonState.status === "error" && (
                    <div className="w-full space-y-4">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs">
                        <p className="font-bold">Download Failed</p>
                        <p className="opacity-80 mt-1">{protonState.error}</p>
                      </div>
                      <button
                        onClick={() => installProton()}
                        className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-bold"
                      >
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
                  onClick={() => setStep(5)}
                  className="w-full py-4 rounded-2xl border border-white/10 text-white font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
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
                      Modding Assets
                    </h2>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                      Install common modding libraries like ReShade and the global asset proxy to enable full mod support.
                    </p>
                  </div>

                  {loaderState.status === "idle" && (
                    <button
                      onClick={() => installGameLoader("common")}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
                    >
                      <Download size={18} />
                      Setup Common Assets
                    </button>
                  )}

                  {loaderState.status === "working" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" />{" "}
                          Installing...
                        </span>
                        <span>{Math.round(loaderState.progress * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${loaderState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {loaderState.status === "done" && (
                    <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      Loaders Ready
                    </div>
                  )}
                </div>

                <button
                  disabled={loaderState.status !== "done"}
                  onClick={() => setStep(6)}
                  className="w-full py-4 rounded-2xl border border-white/10 text-white font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                >
                  Finalize Setup <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
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
                    className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20"
                  >
                    <CheckCircle2 size={48} />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl -z-10"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                    Initialization Complete
                  </h2>
                  <p className="text-slate-400 text-sm font-medium">
                    YAGO is ready. Your library and tools are synced.
                  </p>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95"
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