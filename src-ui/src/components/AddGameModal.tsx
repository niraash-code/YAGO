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
  Cloud,
  Download,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { Game, InstallStatus } from "../types";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api, RemoteCatalogEntry } from "../lib/api";
import { cn } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInstall: (id: string, name: string, templateId: string) => void;
  existingGameIds: string[];
}

const formatSize = (bytes: number) => {
  if (!bytes) return "Unknown Size";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
};

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
  const [remoteCatalog, setRemoteCatalog] = useState<RemoteCatalogEntry[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("initial");
      setScanProgress(0);
      setFoundGames([]);
      setManualPath("");
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
          } as Game;
        } catch (e) {
          return null;
        }
      });

      const resolvedGames = (await Promise.all(gamePromises)).filter(
        g => g !== null
      ) as Game[];

      const uniqueGamesMap = new Map<string, Game>();
      resolvedGames.forEach(g => {
        if (!uniqueGamesMap.has(g.id)) {
          uniqueGamesMap.set(g.id, g);
        }
      });

      const uniqueGames = Array.from(uniqueGamesMap.values());
      const newGames = uniqueGames.filter(g => !existingGameIds.includes(g.id));

      setFoundGames(newGames);
      setStep("results");
    } catch (e) {
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
          showAlert("Game is already in your library.", "Duplicate Game");
          setStep("initial");
        } else {
          setFoundGames([detectedGame]);
          setStep("results");
        }
      } catch (err) {
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
          className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-[51]"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-background">
              <div>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2 uppercase italic tracking-tighter">
                  <Gamepad2 className="text-primary" />
                  Hub Discovery
                </h2>
                <div className="flex items-center gap-6 mt-2">
                  <button
                    onClick={() => setStep("initial")}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-1",
                      step !== "discover"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Local Storage
                  </button>
                  <button
                    onClick={fetchCatalog}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-1",
                      step === "discover"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Cloud Catalog
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-10 min-h-[400px] flex flex-col overflow-y-auto bg-card custom-scrollbar">
              {step === "initial" && (
                <div className="grid grid-cols-2 gap-8 my-auto">
                  <button
                    onClick={startScan}
                    className="group relative p-8 rounded-lg bg-background border border-border hover:border-primary transition-all text-left flex flex-col gap-5"
                  >
                    <div className="w-14 h-14 rounded bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform">
                      <Search size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground uppercase italic tracking-tighter">
                        Auto Scan
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">
                        Detect installed HoYoverse games on your system.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setStep("manual")}
                    className="group relative p-8 rounded-lg bg-background border border-border hover:border-primary transition-all text-left flex flex-col gap-5"
                  >
                    <div className="w-14 h-14 rounded bg-muted flex items-center justify-center text-primary-foreground group-hover:bg-primary transition-colors">
                      <FolderOpen size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground uppercase italic tracking-tighter">
                        Locate Manually
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">
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
                      <Cloud className="text-primary animate-pulse" size={48} />
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                        Querying Catalog...
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      {remoteCatalog.map(entry => (
                        <div
                          key={entry.template.id}
                          className="group relative rounded-lg bg-background border border-border overflow-hidden flex flex-col transition-all hover:border-primary/50"
                        >
                          <div className="h-32 w-full relative overflow-hidden flex items-center justify-center bg-muted/20">
                            {entry.template.cover_image &&
                            entry.template.cover_image.trim() !== "" ? (
                              <img
                                src={entry.template.cover_image}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                alt=""
                              />
                            ) : (
                              <ImageIcon
                                size={32}
                                className="text-muted-foreground/20"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                          </div>

                          <div className="p-6 pt-2 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xl font-black text-foreground tracking-tighter uppercase italic">
                                {entry.template.name}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded border border-border">
                                {entry.remote_info?.version || "v?.?.?"}
                              </span>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded border border-border">
                                {formatSize(entry.remote_info?.total_size)}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                onStartInstall(
                                  entry.template.id,
                                  entry.template.name,
                                  entry.template.id
                                )
                              }
                              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Initialize Install
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
                    <HardDrive
                      size={32}
                      className="text-primary animate-bounce"
                    />
                  </div>
                  <h3 className="text-xl font-black text-foreground mb-2 tracking-tight uppercase italic">
                    Analyzing System
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-black mb-8 h-6 tracking-widest uppercase">
                    {scanText}
                  </p>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {step === "results" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter">
                      Scan Results
                    </h3>
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      {foundGames.length} titles found
                    </span>
                  </div>

                  {foundGames.length > 0 ? (
                    <div className="space-y-3">
                      {foundGames.map(game => (
                        <div
                          key={game.id}
                          className="flex items-center gap-5 p-5 rounded-lg bg-background border border-border"
                        >
                          <div className="w-14 h-14 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
                            {game.logoInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-foreground text-lg truncate uppercase italic">
                              {game.name}
                            </h4>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              {game.size} • {game.version}
                            </p>
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
                            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                          >
                            Add to Library
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-background rounded-lg border border-border border-dashed">
                      <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h4 className="text-muted-foreground/80 font-black uppercase tracking-widest">
                        No new games found
                      </h4>
                      <button
                        onClick={() => setStep("manual")}
                        className="mt-6 text-primary hover:text-primary/80 text-[10px] font-black uppercase tracking-widest underline"
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
                      className="mx-auto text-muted-foreground mb-5"
                    />
                    <h3 className="text-xl font-black text-foreground tracking-tight uppercase italic">
                      Locate Game Folder
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Folder Path
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={manualPath}
                        onChange={e => setManualPath(e.target.value)}
                        placeholder="e.g., /home/user/Games/Genshin"
                        className="flex-1 bg-background border border-border rounded-lg px-6 py-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleSelectManualPath}
                        className="p-4 bg-muted hover:bg-muted/80 border border-border rounded-lg text-muted-foreground transition-all"
                      >
                        <FolderOpen size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("initial")}
                      className="flex-1 py-4 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!manualPath}
                      className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Detect Game
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
