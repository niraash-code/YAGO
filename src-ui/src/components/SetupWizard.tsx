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
  AlertCircle,
  RefreshCw,
  FastForward,
} from "lucide-react";
import { useAssetInstaller } from "../hooks/useAssetInstaller";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";
import { Tooltip } from "./ui/Tooltip";

export const SetupWizard: React.FC = () => {
  const {
    installState: protonState,
    installProton,
    reset: resetProton,
  } = useAssetInstaller();
  const {
    installState: loaderState,
    installGameLoader,
    reset: resetLoader,
  } = useAssetInstaller();

  const {
    globalSettings,
    updateGlobalSettings,
    setupStatus,
    refreshSetupStatus,
    addGame,
  } = useAppStore();
  const { showAlert } = useUiStore();

  const [isLinux, setIsLinux] = useState(false);

  useEffect(() => {
    const platform = window.navigator.userAgent.toLowerCase();
    setIsLinux(platform.includes("linux"));
  }, []);

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
  const [isLoading, setIsLoading] = useState(false);

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
      await refreshSetupStatus();
    }
  };

  const handleConfirmStorage = async () => {
    await saveAllPaths();
    setStep(1);
  };

  const handleContinueAfterDiscovery = () => {
    const status = useAppStore.getState().setupStatus;
    if (isLinux && !status?.has_runners) {
      setStep(4);
    } else {
      setStep(5);
    }
  };

  const handleConfirmLibrary = async () => {
    await saveAllPaths();
    if (defaultGamesPath) {
      setStep(2);
      startAutoDiscovery();
    } else {
      handleContinueAfterDiscovery();
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
            shortName: identified.short_name,
          };
        } catch (e) {
          return null;
        }
      });
      const resolved = (await Promise.all(gamePromises)).filter(
        g => g !== null
      );

      const uniqueMap = new Map();
      resolved.forEach(g => {
        if (g && !uniqueMap.has(g.id)) {
          uniqueMap.set(g.id, g);
        }
      });

      setFoundGames(Array.from(uniqueMap.values()));
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
      await refreshSetupStatus();
      setStep(5);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await saveAllPaths();
      await refreshSetupStatus();

      setTimeout(() => {
        if (useAppStore.getState().isSetupRequired) {
          showAlert(
            "The system still requires initialization. Please ensure all components are downloaded.",
            "Setup Incomplete"
          );
          setIsLoading(false);
        }
      }, 500);
    } catch (e) {
      showAlert("Initialization failed: " + e, "Error");
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    if (step === 4 && !isLinux) setStep(2);
    else if (step === 0.5) setStep(0);
    else setStep(s => s - 1);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 pb-4 text-center relative bg-muted">
          {step > 0 && step < 6 && (
            <button
              onClick={prevStep}
              className="absolute left-8 top-10 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground mx-auto mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">
            {step === 0
              ? "Storage Home"
              : step === 1
                ? "Game Library"
                : step === 2
                  ? "Identify Titles"
                  : step === 3
                    ? "Advanced Paths"
                    : step === 4
                      ? "Compat Tools"
                      : step === 5
                        ? "Mod Assets"
                        : "Everything Ready"}
          </h1>
        </div>

        {/* Steps Progress */}
        <div className="px-10 mb-6 mt-4">
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map(s => {
              if (s === 4 && !isLinux) return null;
              if (s === 3 && step !== 3) return null;
              return (
                <div
                  key={s}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    step === s
                      ? "w-8 bg-primary"
                      : s < step
                        ? "w-4 bg-primary/50"
                        : "w-4 bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 px-10 pb-10 flex flex-col justify-center min-h-[320px] bg-background">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-muted rounded-lg p-6 border border-border flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Database size={32} />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-foreground">
                        YAGO Storage
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto font-medium">
                      Choose a central location for your mods and environment
                      data.
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={storagePath}
                        onChange={e => setStoragePath(e.target.value)}
                        placeholder="Default (App Data)"
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                      />
                      <button
                        onClick={() =>
                          handleSelectGranularPath(
                            setStoragePath,
                            "Select YAGO Storage Directory"
                          )
                        }
                        className="p-3 bg-muted hover:bg-muted-foreground/10 border border-border rounded-lg text-muted-foreground transition-all"
                      >
                        <FolderOpen size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleConfirmStorage}
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                  >
                    Next Step <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
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
                <div className="bg-muted rounded-lg p-6 border border-border flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Library size={32} />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-foreground">
                        Games Root
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto font-medium">
                      Point to your primary games directory for automatic
                      discovery.
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={defaultGamesPath}
                        onChange={e => setDefaultGamesPath(e.target.value)}
                        placeholder="e.g., /home/user/Games"
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                      />
                      <button
                        onClick={() =>
                          handleSelectGranularPath(
                            setDefaultGamesPath,
                            "Select Games Directory"
                          )
                        }
                        className="p-3 bg-muted hover:bg-muted-foreground/10 border border-border rounded-lg text-muted-foreground transition-all"
                      >
                        <FolderOpen size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmLibrary}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
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
                  <h2 className="text-xl font-bold text-foreground mb-1 uppercase tracking-tighter italic">
                    {isScanning ? "Scanning Library..." : "Games Identified"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    {isScanning
                      ? "Looking for supported titles..."
                      : `${discoveredGames.length} titles found in your root.`}
                  </p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border-y border-border py-4">
                  {isScanning ? (
                    <div className="h-32 flex items-center justify-center">
                      <Loader2
                        size={40}
                        className="text-primary animate-spin"
                      />
                    </div>
                  ) : discoveredGames.length > 0 ? (
                    discoveredGames.map(game => (
                      <div
                        key={game.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted border border-border group"
                      >
                        <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shrink-0">
                          {game.logoInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-foreground truncate uppercase">
                            {game.name}
                          </h4>
                          <p className="text-[9px] text-muted-foreground truncate font-mono">
                            {game.installPath}
                          </p>
                        </div>
                        <button
                          onClick={() => addDiscoveredGame(game)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-[9px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-50 italic">
                      <p className="text-xs text-muted-foreground">
                        No supported games found.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleContinueAfterDiscovery}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  Continue <ArrowRight size={18} />
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
                    {
                      label: "Mods Path",
                      value: modsPath,
                      setter: setModsPath,
                      tooltip: "Global storage for all mod files.",
                    },
                    {
                      label: "Runners Path",
                      value: runnersPath,
                      setter: setRunnersPath,
                      tooltip: "Where Proton/WINE binaries are stored.",
                    },
                    {
                      label: "Prefixes Path",
                      value: prefixesPath,
                      setter: setPrefixesPath,
                      tooltip:
                        "Where game-specific WINE environments are kept.",
                    },
                    {
                      label: "Cache Path",
                      value: cachePath,
                      setter: setCachePath,
                      tooltip: "Internal cache for textures and assets.",
                    },
                  ].map(item => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center gap-2 ml-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                          {item.label}
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.value}
                          onChange={e => item.setter(e.target.value)}
                          placeholder="Use Storage Default"
                          className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-[11px] text-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
                        />
                        <button
                          onClick={() =>
                            handleSelectGranularPath(
                              item.setter,
                              `Select ${item.label}`
                            )
                          }
                          className="px-3 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <FolderOpen size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep(0)}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-all uppercase tracking-widest"
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
                <div className="bg-muted rounded-lg p-8 border border-border flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Monitor size={40} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2 uppercase italic">
                      Runner Components
                    </h2>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs font-medium">
                      Proton GE is required to run Windows titles on Linux. YAGO
                      can download it or link your existing Steam install.
                    </p>
                  </div>

                  {protonState.status === "idle" && !detectedPath && (
                    <div className="w-full space-y-3">
                      <button
                        onClick={() => installProton()}
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                      >
                        <Download size={18} />
                        Download Proton GE
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleAutoDetectProton}
                          className="py-3 bg-muted border border-border hover:bg-background text-muted-foreground rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 uppercase"
                        >
                          <Search size={14} />
                          Auto Detect
                        </button>
                        <button
                          onClick={handleSelectExistingProton}
                          className="py-3 border border-border hover:bg-muted text-muted-foreground rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 uppercase"
                        >
                          <FolderOpen size={14} />
                          Manual
                        </button>
                      </div>
                    </div>
                  )}

                  {detectedPath && protonState.status === "idle" && (
                    <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="p-4 rounded-lg bg-background border border-border">
                        <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 text-center">
                          Linked Path
                        </div>
                        <div className="text-[10px] text-foreground font-mono break-all text-center leading-relaxed">
                          {detectedPath}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setDetectedPath(null)}
                          className="flex-1 py-3 border border-border hover:bg-muted text-muted-foreground rounded-lg text-xs font-bold transition-colors uppercase"
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleConfirmProtonPath}
                          className="flex-[2] py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                          Confirm <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {protonState.status === "working" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" />{" "}
                          Downloading...
                        </span>
                        <span>{Math.round(protonState.progress * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${protonState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {protonState.status === "done" && (
                    <div className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                      <CheckCircle2 size={20} />
                      Runner Ready
                    </div>
                  )}

                  {protonState.status === "error" && (
                    <div className="w-full space-y-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                        <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                          <AlertCircle size={20} />
                          <span className="text-sm font-bold uppercase tracking-tight">
                            Download Failed
                          </span>
                        </div>
                        <p className="text-[10px] text-destructive/80 font-mono line-clamp-2">
                          {protonState.error}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            resetProton();
                            installProton();
                          }}
                          className="py-3 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Retry
                        </button>
                        <button
                          onClick={() => setStep(5)}
                          className="py-3 bg-muted border border-border hover:bg-background text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <FastForward size={14} />
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  disabled={protonState.status !== "done"}
                  onClick={() => setStep(5)}
                  className="w-full py-4 rounded-lg border border-border text-foreground font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-muted transition-colors uppercase tracking-widest text-sm"
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
                <div className="bg-muted rounded-lg p-8 border border-border flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Zap size={40} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2 uppercase italic">
                      Modding Assets
                    </h2>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-xs font-medium">
                      Install common modding libraries like ReShade and the
                      global asset proxy to enable full mod support.
                    </p>
                  </div>

                  {loaderState.status === "idle" && (
                    <button
                      onClick={() => installGameLoader("common")}
                      className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                      <Download size={18} />
                      Setup Common Assets
                    </button>
                  )}

                  {loaderState.status === "working" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" />{" "}
                          Installing...
                        </span>
                        <span>{Math.round(loaderState.progress * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${loaderState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {loaderState.status === "done" && (
                    <div className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                      <CheckCircle2 size={20} />
                      Loaders Ready
                    </div>
                  )}

                  {loaderState.status === "error" && (
                    <div className="w-full space-y-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                        <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                          <AlertCircle size={20} />
                          <span className="text-sm font-bold uppercase tracking-tight">
                            Setup Failed
                          </span>
                        </div>
                        <p className="text-[10px] text-destructive/80 font-mono line-clamp-2">
                          {loaderState.error}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            resetLoader();
                            installGameLoader("common");
                          }}
                          className="py-3 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Retry
                        </button>
                        <button
                          onClick={() => setStep(6)}
                          className="py-3 bg-muted border border-border hover:bg-background text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <FastForward size={14} />
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  disabled={loaderState.status !== "done"}
                  onClick={() => setStep(6)}
                  className="w-full py-4 rounded-lg border border-border text-foreground font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-muted transition-colors uppercase tracking-widest text-sm"
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
                    className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground mx-auto shadow-xl"
                  >
                    <CheckCircle2 size={48} />
                  </motion.div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight uppercase italic">
                    Initialization Complete
                  </h2>
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                    YAGO is ready. Your library and tools are synced.
                  </p>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-black text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Syncing State...
                    </>
                  ) : (
                    "Enter Library"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
