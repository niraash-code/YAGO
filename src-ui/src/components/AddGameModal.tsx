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
} from "lucide-react";
import { Game, InstallStatus } from "../types";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api, InjectionMethod } from "../lib/api";

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGameIds: string[];
}

const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  existingGameIds,
}) => {
  const { addGame } = useAppStore();
  const { showAlert } = useUiStore();
  const [step, setStep] = useState<
    "initial" | "scanning" | "results" | "manual" | "duplicate"
  >("initial");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanText, setScanText] = useState("Initializing scan...");
  const [foundGames, setFoundGames] = useState<Game[]>([]);
  const [manualPath, setManualPath] = useState("");
  const [duplicateGame, setDuplicateGame] = useState<Game | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("initial");
      setScanProgress(0);
      setFoundGames([]);
      setManualPath("");
      setDuplicateGame(null);
    }
  }, [isOpen]);

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

      const games: Game[] = discovered
        .map(d => {
          // Map identified game to full Game object (using default/empty values where needed)
          // Ideally backend returns full IdentifiedGame struct or we fetch details.
          // But DiscoveredGame only has template_id and path.
          // We should probably call identifyGame on each path to get full metadata?
          // OR the backend scan should return IdentifiedGame?
          // The scan_for_games command currently returns Vec<DiscoveredGame>.
          // Let's assume we can map it or we need to update backend to return more info.
          // Actually, we can just use the path to call identifyGame, OR trust the template_id.

          // For now, let's call identifyGame for each result to populate metadata.
          // This might be slow if many games found, but robust.
          return null;
        })
        .filter(g => g !== null) as Game[];

      // Wait, parallel identify
      const gamePromises = discovered.map(async d => {
        try {
          // Determine the full path to the executable
          // DiscoveredGame.path IS the executable path from scanner
          // On Windows/Linux scanner returns the executable path directly.
          const pathStr =
            typeof d.path === "string" ? d.path : (d.path as any).toString(); // Handle if path is object
          // Note: d.path comes from serde PathBuf which serializes as string usually.

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
            regions: identified.regions,
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
            injectionMethod: InjectionMethod.Proxy,
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
          regions: identified.regions,
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
          injectionMethod: InjectionMethod.Proxy,
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
            className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-[51]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="text-indigo-400" />
                  Add Game to Library
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Scan your system or manually locate game files
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-10 min-h-[300px] flex flex-col justify-center">
              {step === "initial" && (
                <div className="grid grid-cols-2 gap-8">
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
                        Automatically detect installed HoYoverse games on your
                        drives.
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
                        Select the game installation folder directly from your
                        file system.
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {step === "scanning" && (
                <div className="text-center max-w-md mx-auto w-full">
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
                  <h3 className="text-xl font-bold text-white mb-2">
                    Analyzing System
                  </h3>
                  <p className="text-sm text-slate-400 font-mono mb-8 h-6">
                    {scanText}
                  </p>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500"
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
                  className="max-w-lg mx-auto w-full space-y-8"
                >
                  <div className="text-center mb-6">
                    <FolderOpen
                      size={48}
                      className="mx-auto text-slate-500 mb-5"
                    />
                    <h3 className="text-xl font-bold text-white">
                      Locate Game Folder
                    </h3>
                    <p className="text-base text-slate-400 mt-2">
                      Navigate to the installation directory of the game.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Folder Path
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={manualPath}
                        onChange={e => setManualPath(e.target.value)}
                        placeholder="e.g., C:\Program Files\HoYoverse\Genshin Impact"
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("initial")}
                      className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!manualPath}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
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
