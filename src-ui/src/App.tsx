import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./lib/api";
import TitleBar from "./components/TitleBar";
import SystemStatusCard from "./components/SystemStatusCard";
import SettingsDrawer from "./components/SettingsDrawer";
import AddGameModal from "./components/AddGameModal";
import CoverManagerModal from "./components/CoverManagerModal";
import ModManager from "./components/ModManager";
import { SkinManager } from "./components/SkinManager";
import { PanicOverlay } from "./components/PanicOverlay";
import { ConflictModal } from "./components/ConflictModal";
import { GlobalSettingsModal } from "./components/GlobalSettingsModal";
import { SetupWizard } from "./components/SetupWizard";
import { useAppStore } from "./store/gameStore";
import { useUiStore } from "./store/uiStore";
import { useYagoEvents } from "./hooks/useYagoEvents";
import { GlobalDialogs } from "./components/ui/GlobalDialogs";

// Dashboard modular components
import { AppLayout } from "./components/dashboard/AppLayout";
import { GameHeader } from "./components/dashboard/GameHeader";
import { GameOverview } from "./components/dashboard/GameOverview";
import { InstallWizard } from "./components/InstallWizard";

const App: React.FC = () => {
  const [initError, setInitError] = useState<string | null>(null);
  useYagoEvents();

  const store = useAppStore();
  const {
    games,
    selectedGameId,
    isRunning,
    isLaunching,
    launchStatus,
    isInitialized,
    isDeploying,
    streamSafe,
    nsfwBehavior,
    statsMap,
    selectGame,
    toggleStreamSafe,
    setNsfwBehavior,
    uninstallGame,
    initialize,
    initializeEvents,
    updateGame,
    launchCurrentGame,
    killCurrentGame,
  } = store;

  React.useEffect(() => {
    initialize().catch(err => setInitError(String(err)));
    const teardownPromise = initializeEvents();
    return () => {
      teardownPromise.then(fn => {
        if (typeof fn === "function") fn();
      });
    };
  }, [initialize, initializeEvents]);

  const [currentView, setCurrentView] = useState<"overview" | "mods" | "skins">(
    "overview"
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [isCoverManagerOpen, setIsCoverManagerOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [installWizardGame, setInstallWizardGame] = useState<{
    id: string;
    name: string;
    templateId: string;
  } | null>(null);

  const { showAlert, showPrompt } = useUiStore();

  if (store.isSetupRequired) {
    return (
      <div className="flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden border border-white/10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
        <TitleBar />
        <div className="flex-1 relative">
          <SetupWizard />
        </div>
      </div>
    );
  }

  if (initError)
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-white p-10">
        <div className="text-center max-w-lg">
          <div className="text-red-500 mb-4 font-bold text-xl">
            Critical Initialization Error
          </div>
          <pre className="bg-black/40 p-4 rounded-xl border border-red-500/20 text-xs font-mono text-left overflow-auto max-h-60">
            {initError}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            Retry Application
          </button>
        </div>
      </div>
    );

  if (!isInitialized)
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Synchronizing Library...</p>
        </div>
      </div>
    );

  const selectedGame =
    games.find(g => g.id === selectedGameId) ||
    (games.length > 0 ? games[0] : null);
  const stats = selectedGame ? statsMap[selectedGame.id] || null : null;
  const backgroundStyle = selectedGame
    ? {
        backgroundImage: `url(${selectedGame.coverImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  const handleLaunch = async () => {
    if (isRunning) await killCurrentGame();
    else {
      try {
        await launchCurrentGame();
      } catch (e) {
        showAlert("Failed to launch game: " + e, "Launch Error");
      }
    }
  };

  const handleInstall = () => {
    if (selectedGame) {
      setInstallWizardGame({
        id: selectedGame.id,
        name: selectedGame.name,
        templateId: selectedGame.id,
      });
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    if (!selectedGame) return;
    try {
      await store.switchProfile(selectedGame.id, profileId);
      setIsProfileDropdownOpen(false);
    } catch (e) {
      showAlert("Failed to switch profile: " + e, "Error");
    }
  };

  const handleAddProfile = async () => {
    if (!selectedGame) return;
    const name = await showPrompt(
      "Enter new profile name:",
      "New Profile",
      "Create Profile"
    );
    if (name && name.trim()) {
      try {
        const newProfile = await api.createProfile(
          selectedGame.id,
          name.trim()
        );
        await store.switchProfile(selectedGame.id, newProfile.id);
        setIsProfileDropdownOpen(false);
      } catch (e) {
        showAlert("Failed to create profile: " + e, "Error");
      }
    } else if (name !== null)
      showAlert("Profile name cannot be empty.", "Validation Error");
  };

  return (
    <AppLayout
      selectedGameId={selectedGame?.id || null}
      backgroundStyle={backgroundStyle}
      currentView={currentView}
      setCurrentView={setCurrentView}
      onOpenAddGame={() => setIsAddGameOpen(true)}
      onOpenAppSettings={() => setIsGlobalSettingsOpen(true)}
    >
      <AnimatePresence mode="wait">
        {selectedGame ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <GameHeader
              selectedGame={selectedGame}
              streamSafe={streamSafe}
              nsfwBehavior={nsfwBehavior}
              isProfileDropdownOpen={isProfileDropdownOpen}
              setIsProfileDropdownOpen={setIsProfileDropdownOpen}
              handleSwitchProfile={handleSwitchProfile}
              handleAddProfile={handleAddProfile}
              setNsfwBehavior={setNsfwBehavior}
              toggleStreamSafe={toggleStreamSafe}
              onOpenCoverManager={() => setIsCoverManagerOpen(true)}
            />

            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {currentView === "overview" ? (
                  <GameOverview
                    selectedGame={selectedGame}
                    isRunning={isRunning}
                    isDeploying={isDeploying}
                    isLaunching={isLaunching}
                    launchStatus={launchStatus}
                    handleLaunch={handleLaunch}
                    handleInstall={handleInstall}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                  />
                ) : currentView === "mods" ? (
                  <ModManager
                    key="modmanager"
                    game={selectedGame}
                    onUpdateGame={updateGame}
                    streamSafe={streamSafe}
                    nsfwBehavior={nsfwBehavior}
                    onClose={() => setCurrentView("overview")}
                  />
                ) : (
                  <SkinManager
                    key="skinmanager"
                    gameId={selectedGame.id}
                    streamSafe={streamSafe}
                  />
                )}
              </AnimatePresence>

              {stats && currentView === "overview" && (
                <div className="absolute right-12 bottom-20 z-20">
                  <SystemStatusCard
                    stats={stats}
                    game={selectedGame}
                    streamSafe={streamSafe}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center text-center relative"
          >
            <div className="relative z-10">
              <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase italic text-white">
                No Games Library
              </h1>
              <p className="text-slate-500 font-medium mb-8 uppercase tracking-widest text-xs">
                Your journey begins with a single title.
              </p>
              <button
                onClick={() => setIsAddGameOpen(true)}
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.2em]"
              >
                Add Your First Game
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUninstall={uninstallGame}
        game={selectedGame}
      />
      <AddGameModal
        isOpen={isAddGameOpen}
        onClose={() => setIsAddGameOpen(false)}
        onStartInstall={(id, name, templateId) => {
          setIsAddGameOpen(false);
          setInstallWizardGame({ id, name, templateId });
        }}
        existingGameIds={games.map(g => g.id)}
      />
      <InstallWizard
        isOpen={!!installWizardGame}
        onClose={() => setInstallWizardGame(null)}
        gameId={installWizardGame?.id || ""}
        gameName={installWizardGame?.name || ""}
        templateId={installWizardGame?.templateId || ""}
      />
      <CoverManagerModal
        isOpen={isCoverManagerOpen}
        onClose={() => setIsCoverManagerOpen(false)}
        game={selectedGame}
      />
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
      />
      <ConflictModal />
      <PanicOverlay />
      <GlobalDialogs />
    </AppLayout>
  );
};

export default App;