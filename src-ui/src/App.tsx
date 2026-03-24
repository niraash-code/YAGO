import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./lib/api";
import TitleBar from "./components/TitleBar";
import SettingsDrawer from "./components/SettingsDrawer";
import AddGameModal from "./components/AddGameModal";
import CoverManagerModal from "./components/CoverManagerModal";
import { PanicOverlay } from "./components/PanicOverlay";
import { ConflictModal } from "./components/ConflictModal";
import { GlobalSettingsModal } from "./components/GlobalSettingsModal";
import { SetupWizard } from "./components/SetupWizard";
import { useAppStore } from "./store/gameStore";
import { useUiStore } from "./store/uiStore";
import { useYagoEvents } from "./hooks/useYagoEvents";
import { GlobalDialogs } from "./components/ui/GlobalDialogs";

// Dashboard modular components
import { DashboardRouter } from "./components/dashboard/DashboardRouter";
import { AppLayout } from "./components/dashboard/AppLayout";
import { GameHeader } from "./components/dashboard/GameHeader";
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
      <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden border border-border">
        <TitleBar />
        <div className="flex-1 relative">
          <SetupWizard />
        </div>
      </div>
    );
  }

  if (initError)
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-foreground p-10">
        <div className="text-center max-w-lg">
          <div className="text-destructive mb-4 font-bold text-xl uppercase tracking-widest">
            Critical Initialization Error
          </div>
          <pre className="bg-muted p-4 border border-border text-xs font-mono text-left overflow-auto max-h-60">
            {initError}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold uppercase tracking-widest transition-colors"
          >
            Retry Application
          </button>
        </div>
      </div>
    );

  if (!isInitialized)
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-foreground overflow-hidden">
        <TitleBar />
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-black uppercase tracking-[0.3em] mb-2">
            Synchronizing
          </h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
            Verifying Library & Templates
          </p>
        </div>
      </div>
    );

  const selectedGame =
    games.find(g => g.id === selectedGameId) ||
    (games.length > 0 ? games[0] : null);
  const stats = selectedGame ? statsMap[selectedGame.id] || null : null;

  const vibe = selectedGame?.name === "Genshin Impact" ? "raiden" : "default";

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
      vibe={vibe}
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

            <DashboardRouter
              currentView={currentView}
              setCurrentView={setCurrentView}
              selectedGame={selectedGame}
              isRunning={isRunning}
              isDeploying={isDeploying}
              isLaunching={isLaunching}
              launchStatus={launchStatus}
              stats={stats}
              streamSafe={streamSafe}
              nsfwBehavior={nsfwBehavior}
              onLaunch={handleLaunch}
              onInstall={handleInstall}
              onUpdateGame={updateGame}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
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
              <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">
                No Games Library
              </h1>
              <p className="text-muted-foreground font-medium mb-8 uppercase tracking-widest text-xs">
                Your journey begins with a single title.
              </p>
              <button
                onClick={() => setIsAddGameOpen(true)}
                className="px-10 py-4 bg-primary text-primary-foreground rounded-lg font-black text-sm transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.2em]"
              >
                Add Your First Game
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedGame && (
        <>
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onUninstall={uninstallGame}
            game={selectedGame}
          />
          <CoverManagerModal
            isOpen={isCoverManagerOpen}
            onClose={() => setIsCoverManagerOpen(false)}
            game={selectedGame}
          />
        </>
      )}
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
