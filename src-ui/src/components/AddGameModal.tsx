import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  FolderOpen,
  CheckCircle,
  HardDrive,
  Gamepad2,
  AlertCircle,
  AlertTriangle,
  Layers,
  Cloud,
  Download,
  Info,
} from "lucide-react";
import { Game, InstallStatus } from "../types";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api, InjectionMethod, RemoteCatalogEntry } from "../lib/api";
import { cn } from "../lib/utils";
import { InstallWizard } from "./InstallWizard";
import { open } from "@tauri-apps/plugin-dialog";

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInstall: (id: string, name: string, templateId: string) => void;
  existingGameIds: string[];
}

const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  onStartInstall,
  existingGameIds,
}) => {
  const { addGame } = useAppStore();
  const { showAlert } = useUiStore();
  const [step, setStep] = useState<
    "initial" | "scanning" | "results" | "manual" | "duplicate" | "discover"
  >("initial");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanText, setScanText] = useState("Initializing scan...");
  const [foundGames, setFoundGames] = useState<Game[]>([]);
  const [manualPath, setManualPath] = useState("");
  const [duplicateGame, setDuplicateGame] = useState<Game | null>(null);
  const [remoteCatalog, setRemoteCatalog] = useState<RemoteCatalogEntry[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("initial");
      setScanProgress(0);
      setFoundGames([]);
      setManualPath("");
      setDuplicateGame(null);
    }
  }, [isOpen]);

  const fetchCatalog = async () => {
    setStep("discover");
    setIsLoadingCatalog(true);
    try {
      const catalog = await api.getRemoteCatalog();
      setRemoteCatalog(catalog);
    } catch (e) {
      showAlert("Failed to load catalog: " + e, "Error");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleSelectManualPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Game Installation Folder",
      });
      if (selected && typeof selected === "string") {
        setManualPath(selected);
      }
    } catch (e) {
      console.error("Failed to select directory:", e);
    }
  };

  const startScan = async () => {
    setStep("scanning");
    setScanProgress(0);
    setScanText("Searching for games...");

    try {
      // Simulate progress for UX
      const interval = setInterval(() => {
        setScanProgress(p => Math.min(p + 5, 90));
      }, 100);

      const discovered = await api.scanForGames();
      clearInterval(interval);
      setScanProgress(100);

      const gamePromises = discovered.map(async d => {
        try {
          const identified = await api.identifyGame(
            d.path as unknown as string
          );
          return {
            id: identified.id,
            name: identified.name,
            shortName: identified.short_name,
            developer: identified.developer,
            description: identified.description,
            status: InstallStatus.INSTALLED,
            version: identified.version,
            color: identified.color,
            accentColor: identified.accent_color,
            coverImage: identified.cover_image,
            icon: identified.icon,
            logoInitial: identified.logo_initial,
            size: identified.size,
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
            installPath: identified.install_path,
            exeName: identified.exe_name,
            autoUpdate: false,
            injectionMethod: identified.injection_method,
            supportedInjectionMethods: identified.supported_injection_methods,
            modloaderEnabled: identified.modloader_enabled,
            activeRunnerId: undefined, // Will be set by backend defaults
            prefixPath: undefined,
          } as Game;
        } catch (e) {
          console.warn(`Failed to identify discovered game at ${d.path}:`, e);
          return null;
        }
      });

      const resolvedGames = (await Promise.all(gamePromises)).filter(
        g => g !== null
      ) as Game[];

      // Deduplicate by ID (in case multiple paths point to same game)
      const uniqueGamesMap = new Map<string, Game>();
      resolvedGames.forEach(g => {
        if (!uniqueGamesMap.has(g.id)) {
          uniqueGamesMap.set(g.id, g);
        }
      });

      const uniqueGames = Array.from(uniqueGamesMap.values());

      // Filter out existing games
      const newGames = uniqueGames.filter(g => !existingGameIds.includes(g.id));

      setFoundGames(newGames);
      setStep("results");
    } catch (e) {
      console.error("Scan failed:", e);
      showAlert("Scan failed: " + e, "Error");
      setStep("initial");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("scanning");
    setScanText(`Analyzing: ${manualPath}`);

    setTimeout(async () => {
      try {
        const identified = await api.identifyGame(manualPath);

        const detectedGame: Game = {
          id: identified.id,
          name: identified.name,
          shortName: identified.short_name,
          developer: identified.developer,
          description: identified.description,
          status: InstallStatus.INSTALLED,
          version: identified.version,
          color: identified.color,
          accentColor: identified.accent_color,
          coverImage: identified.cover_image,
          icon: identified.icon,
          logoInitial: identified.logo_initial,
          size: identified.size,
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
          installPath: identified.install_path,
          exeName: identified.exe_name,
          autoUpdate: false,
          injectionMethod: identified.injection_method,
          supportedInjectionMethods: identified.supported_injection_methods,
          modloaderEnabled: identified.modloader_enabled,
        };
        if (existingGameIds.includes(detectedGame.id)) {
          setDuplicateGame(detectedGame);
          setStep("duplicate");
        } else {
          setFoundGames([detectedGame]);
          setStep("results");
        }
      } catch (err) {
        console.error("Failed to identify game:", err);
        showAlert("Identification failed: " + err, "Error");
        setStep("initial");
      }
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-[51]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="text-indigo-400" />
                  Hub Discovery
                </h2>
                <div className="flex items-center gap-6 mt-2">
                  <button
                    onClick={() => setStep("initial")}
                    className={cn(
                      "text-sm font-black uppercase tracking-[0.2em] transition-all relative pb-1",
                      step === "initial" ||
                        step === "scanning" ||
                        step === "results" ||
                        step === "manual" ||
                        step === "duplicate"
                        ? "text-indigo-400"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Local
                    {(step === "initial" ||
                      step === "scanning" ||
                      step === "results" ||
                      step === "manual" ||
                      step === "duplicate") && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>
                  <button
                    onClick={fetchCatalog}
                    className={cn(
                      "text-sm font-black uppercase tracking-[0.2em] transition-all relative pb-1",
                      step === "discover"
                        ? "text-indigo-400"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Cloud
                    {step === "discover" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-10 min-h-[400px] flex flex-col overflow-y-auto custom-scrollbar">
              {step === "initial" && (
                <div className="grid grid-cols-2 gap-8 my-auto">
                  <button
                    onClick={startScan}
                    className="group relative p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/50 transition-all hover:bg-indigo-500/20 text-left flex flex-col gap-5 shadow-lg"
                  >
                    <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                      <Search size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1.5">
                        Auto Scan
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Detect installed HoYoverse games on your system.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setStep("manual")}
                    className="group relative p-8 rounded-2xl bg-slate-800/30 border border-white/5 hover:border-white/20 transition-all hover:bg-slate-800/50 text-left flex flex-col gap-5 shadow-lg"
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform shadow-inner">
                      <FolderOpen size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1.5">
                        Locate Manually
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Select the game executable from your disk.
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {step === "discover" && (
                <div className="space-y-8">
                  {isLoadingCatalog ? (
                    <div className="h-[300px] flex flex-col items-center justify-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                      >
                        <Cloud className="text-indigo-500" size={48} />
                      </motion.div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">
                        Querying Sophon API...
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      {remoteCatalog.map(entry => (
                        <div
                          key={entry.template.id}
                          className="group relative rounded-3xl bg-slate-800/40 border border-white/5 overflow-hidden flex flex-col shadow-2xl transition-all hover:border-indigo-500/30"
                        >
                          {/* Card Cover */}
                          <div className="h-32 w-full relative overflow-hidden">
                            <img
                              src={entry.template.cover_image}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                            <div className="absolute top-4 right-4">
                              <span className="bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-lg">
                                Cloud
                              </span>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="p-6 pt-2 flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xl font-black text-white tracking-tighter uppercase italic">
                                {entry.template.name}
                              </h4>
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <img
                                  src={entry.template.icon}
                                  className="w-6 h-6 object-contain"
                                  alt=""
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                              {entry.remote_info ? (
                                <>
                                  <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                                    <Info
                                      size={10}
                                      className="text-indigo-400"
                                    />{" "}
                                    v{entry.remote_info.version}
                                  </span>
                                  <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                                    <HardDrive
                                      size={10}
                                      className="text-indigo-400"
                                    />{" "}
                                    {(
                                      entry.remote_info.total_size /
                                      (1024 * 1024 * 1024)
                                    ).toFixed(1)}{" "}
                                    GB
                                  </span>
                                </>
                              ) : (
                                <span className="text-[9px] font-black text-slate-600 uppercase italic">
                                  Metadata Unavailable
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() =>
                                onStartInstall(
                                  entry.template.id,
                                  entry.template.name,
                                  entry.template.id
                                )
                              }
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                            >
                              <Download size={14} /> Initialize Install
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === "scanning" && (
                <div className="text-center max-w-md mx-auto w-full my-auto">
                  <div className="mb-8 relative w-32 h-32 mx-auto flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "linear",
                      }}
                      className="absolute inset-0 rounded-full border-b-2 border-indigo-500"
                    />
                    <HardDrive size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight uppercase">
                    Analyzing System
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mb-8 h-6 tracking-widest uppercase">
                    {scanText}
                  </p>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {step === "results" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">
                      Scan Results
                    </h3>
                    <span className="text-sm text-slate-400 font-medium bg-slate-800 px-3 py-1 rounded-full">
                      {foundGames.length} games found
                    </span>
                  </div>

                  {foundGames.length > 0 ? (
                    <div className="space-y-3">
                      {foundGames.map(game => (
                        <div
                          key={game.id}
                          className="flex items-center gap-5 p-5 rounded-2xl bg-slate-800/50 border border-white/10 shadow-lg"
                        >
                          <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                            {game.logoInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-lg truncate">
                              {game.name}
                            </h4>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-slate-400">
                                {game.size} • {game.version}
                              </p>
                              <p
                                className="text-[10px] font-mono text-slate-500 truncate bg-black/20 px-2 py-0.5 rounded border border-white/5"
                                title={game.installPath}
                              >
                                {game.installPath}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await addGame(game);
                                onClose();
                              } catch (e) {
                                showAlert("Failed to add game: " + e, "Error");
                              }
                            }}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
                          >
                            <CheckCircle size={18} />
                            Add to Library
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-800/30 rounded-2xl border border-white/5 border-dashed">
                      <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                      <h4 className="text-slate-300 font-bold text-lg">
                        No new games found
                      </h4>
                      <p className="text-base text-slate-500 mt-2">
                        Try locating the game folder manually.
                      </p>
                      <button
                        onClick={() => setStep("manual")}
                        className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4"
                      >
                        Switch to Manual Mode
                      </button>
                    </div>
                  )}
                </div>
              )}

              {step === "manual" && (
                <form
                  onSubmit={handleManualSubmit}
                  className="max-w-lg mx-auto w-full space-y-8 my-auto"
                >
                  <div className="text-center mb-6">
                    <FolderOpen
                      size={48}
                      className="mx-auto text-slate-500 mb-5"
                    />
                    <h3 className="text-xl font-bold text-white tracking-tight uppercase">
                      Locate Game Folder
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                      Navigate to the installation directory of the game.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Folder Path
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={manualPath}
                        onChange={e => setManualPath(e.target.value)}
                        placeholder="e.g., C:\Games\Genshin Impact"
                        className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleSelectManualPath}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-slate-400 transition-all"
                      >
                        <FolderOpen size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("initial")}
                      className="flex-1 py-4 border border-white/10 hover:bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!manualPath}
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3"
                    >
                      <Search size={18} /> Detect Game
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddGameModal;
