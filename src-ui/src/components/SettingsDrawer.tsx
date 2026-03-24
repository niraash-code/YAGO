import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Download, Cpu, Trash2 } from "lucide-react";
import { Game } from "../types";
import { cn } from "../lib/utils";

import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";

// Sub-components
import { GeneralSettings } from "./settings/GeneralSettings";
import { InstallationSettings } from "./settings/InstallationSettings";
import { AdvancedSettings } from "./settings/AdvancedSettings";
import { ManagementSettings } from "./settings/ManagementSettings";
import { Button } from "./ui/button";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUninstall: (gameId: string) => void;
  game: Game;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  onUninstall,
  game,
}) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "installation" | "advanced" | "management"
  >("general");
  const {
    updateProfile,
    updateGameConfig,
    deleteProfile,
    availableRunners,
    refreshRunners,
  } = useAppStore();
  const { showConfirm, showAlert } = useUiStore();

  const isLinux = window.navigator.userAgent.includes("Linux");

  const activeProfile =
    game.profiles.find(p => p.id === game.activeProfileId) || game.profiles[0];

  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local state buffers
  const [localName, setLocalName] = useState(game.name);
  const [localDeveloper, setLocalDeveloper] = useState(game.developer);
  const [localDescription, setLocalDescription] = useState(game.description);
  const [localIcon, setLocalIcon] = useState(game.icon);
  const [localCover, setLocalCover] = useState(game.coverImage);
  const [localInstallPath, setLocalInstallPath] = useState(
    game.installPath || ""
  );
  const [localExeName, setLocalExeName] = useState(game.exeName || "");
  const [localPrefixPath, setLocalPrefixPath] = useState(game.prefixPath || "");
  const [localGlobalLaunchArgs, setLocalGlobalLaunchArgs] = useState(
    game.launchArgs?.join(" ") || ""
  );
  const [localLaunchArgs, setLocalLaunchArgs] = useState(
    activeProfile?.launchArgs?.join(" ") || ""
  );
  const [localGamescopeArgs, setLocalGamescopeArgs] = useState(
    activeProfile?.gamescopeArgs?.join(" ") || ""
  );
  const [localSavePath, setLocalSavePath] = useState(
    activeProfile?.saveDataPath || ""
  );
  const [localProfileName, setLocalProfileName] = useState(activeProfile.name);
  const [localProfileDescription, setLocalProfileDescription] = useState(
    activeProfile.description
  );
  const [localFpsPattern, setLocalFpsPattern] = useState(
    game.fpsConfig?.search_pattern || ""
  );
  const [localFpsOffset, setLocalFpsOffset] = useState(
    game.fpsConfig?.offset || 0
  );

  useEffect(() => {
    setLocalName(game.name);
    setLocalDeveloper(game.developer);
    setLocalDescription(game.description);
    setLocalIcon(game.icon);
    setLocalCover(game.coverImage);
    setLocalInstallPath(game.installPath || "");
    setLocalExeName(game.exeName || "");
    setLocalPrefixPath(game.prefixPath || "");
    setLocalGlobalLaunchArgs(game.launchArgs?.join(" ") || "");
    setLocalLaunchArgs(activeProfile?.launchArgs?.join(" ") || "");
    setLocalGamescopeArgs(activeProfile?.gamescopeArgs?.join(" ") || "");
    setLocalSavePath(activeProfile?.saveDataPath || "");
    setLocalProfileName(activeProfile.name);
    setLocalProfileDescription(activeProfile.description);
    setLocalFpsPattern(game.fpsConfig?.search_pattern || "");
    setLocalFpsOffset(game.fpsConfig?.offset || 0);
  }, [game, activeProfile]);

  useEffect(() => {
    if (isOpen && activeTab === "advanced" && isLinux) refreshRunners();
  }, [isOpen, activeTab, isLinux, refreshRunners]);

  const startEditing = (field: string) => setEditingField(field);
  const cancelEditing = () => setEditingField(null);

  const saveField = async (field: string) => {
    setIsSaving(true);
    try {
      if (field === "name")
        await updateGameConfig(game.id, { name: localName });
      else if (field === "developer")
        await updateGameConfig(game.id, { developer: localDeveloper });
      else if (field === "description")
        await updateGameConfig(game.id, { description: localDescription });
      else if (field === "icon")
        await updateGameConfig(game.id, { icon: localIcon });
      else if (field === "cover")
        await updateGameConfig(game.id, { coverImage: localCover });
      else if (field === "installPath")
        await updateGameConfig(game.id, { installPath: localInstallPath });
      else if (field === "exeName")
        await updateGameConfig(game.id, { exeName: localExeName });
      else if (field === "prefixPath")
        await updateGameConfig(game.id, { prefixPath: localPrefixPath });
      else if (field === "globalLaunchArgs")
        await updateGameConfig(game.id, {
          launchArgs: localGlobalLaunchArgs
            .split(" ")
            .filter(s => s.length > 0),
        });
      else if (field === "profileName")
        await updateProfile(game.id, activeProfile.id, {
          name: localProfileName,
        });
      else if (field === "profileDescription")
        await updateProfile(game.id, activeProfile.id, {
          description: localProfileDescription,
        });
      else if (field === "fpsAdvanced") {
        await updateGameConfig(game.id, {
          fpsConfig: {
            enabled: game.fpsConfig?.enabled || false,
            target_fps: game.fpsConfig?.target_fps || 60,
            search_pattern: localFpsPattern,
            offset: localFpsOffset,
          },
        });
      } else if (field === "launchArgs")
        await updateProfile(game.id, activeProfile.id, {
          launchArgs: localLaunchArgs.split(" ").filter(s => s.length > 0),
        });
      else if (field === "gamescopeArgs")
        await updateProfile(game.id, activeProfile.id, {
          gamescopeArgs: localGamescopeArgs
            .split(" ")
            .filter(s => s.length > 0),
        });
      else if (field === "savePath")
        await updateProfile(game.id, activeProfile.id, {
          saveDataPath: localSavePath || null,
        });
      setEditingField(null);
    } catch (e) {
      showAlert("Failed to save settings: " + e, "Error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeature = async (
    feature:
      | "gamemode"
      | "gamescope"
      | "mangohud"
      | "fps"
      | "autoupdate"
      | "shield"
  ) => {
    try {
      if (feature === "fps") {
        const current = game.fpsConfig?.enabled || false;
        await updateGameConfig(game.id, {
          fpsConfig: {
            enabled: !current,
            target_fps: game.fpsConfig?.target_fps || 60,
            search_pattern: game.fpsConfig?.search_pattern || "",
            offset: game.fpsConfig?.offset || 0,
          },
        });
      } else if (feature === "autoupdate")
        await updateGameConfig(game.id, { autoUpdate: !game.autoUpdate });
      else if (feature === "shield")
        await updateGameConfig(game.id, {
          enableLinuxShield: !game.enableLinuxShield,
        });
      else {
        const update: any = {};
        if (feature === "gamemode")
          update.useGamemode = !activeProfile.useGamemode;
        if (feature === "gamescope")
          update.useGamescope = !activeProfile.useGamescope;
        if (feature === "mangohud")
          update.useMangohud = !activeProfile.useMangohud;
        await updateProfile(game.id, activeProfile.id, update);
      }
    } catch (e) {
      showAlert(`Failed to toggle ${feature}: ` + e, "Error");
    }
  };

  const updateFpsTarget = async (fps: number) => {
    try {
      await updateGameConfig(game.id, {
        fpsConfig: {
          enabled: true,
          target_fps: fps,
          search_pattern: game.fpsConfig?.search_pattern || "",
          offset: game.fpsConfig?.offset || 0,
        },
      });
    } catch (e) {
      console.error("FPS update failed", e);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "installation", label: "Installation", icon: Download },
    { id: "advanced", label: "Advanced", icon: Cpu },
    { id: "management", label: "Management", icon: Trash2 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-12 bottom-0 w-[900px] bg-card border-l border-border shadow-2xl z-50 flex overflow-hidden"
          >
            {/* Sidebar */}
            <div className="w-64 bg-sidebar border-r border-border flex flex-col p-6 shrink-0">
              <div className="mb-8">
                <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-1">
                  Configuration
                </h2>
                <p className="text-xl font-black text-foreground tracking-tighter uppercase italic truncate">
                  {game.name}
                </p>
              </div>

              <div className="flex flex-col gap-1 space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all text-left outline-none",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-auto">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  <X size={18} /> Close Settings
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-background custom-scrollbar">
              <div className="p-10 max-w-3xl mx-auto space-y-8">
                {activeTab === "general" && (
                  <GeneralSettings
                    game={game}
                    editingField={editingField}
                    isSaving={isSaving}
                    localName={localName}
                    localDeveloper={localDeveloper}
                    localDescription={localDescription}
                    localIcon={localIcon}
                    localCover={localCover}
                    setLocalName={setLocalName}
                    setLocalDeveloper={setLocalDeveloper}
                    setLocalDescription={setLocalDescription}
                    setLocalIcon={setLocalIcon}
                    setLocalCover={setLocalCover}
                    startEditing={startEditing}
                    saveField={saveField}
                    cancelEditing={cancelEditing}
                  />
                )}
                {activeTab === "installation" && (
                  <InstallationSettings
                    game={game}
                    activeProfile={activeProfile}
                    isLinux={isLinux}
                    editingField={editingField}
                    isSaving={isSaving}
                    localInstallPath={localInstallPath}
                    localExeName={localExeName}
                    localGlobalLaunchArgs={localGlobalLaunchArgs}
                    localLaunchArgs={localLaunchArgs}
                    localSavePath={localSavePath}
                    localPrefixPath={localPrefixPath}
                    setLocalInstallPath={setLocalInstallPath}
                    setLocalExeName={setLocalExeName}
                    setLocalGlobalLaunchArgs={setLocalGlobalLaunchArgs}
                    setLocalLaunchArgs={setLocalLaunchArgs}
                    setLocalSavePath={setLocalSavePath}
                    setLocalPrefixPath={setLocalPrefixPath}
                    startEditing={startEditing}
                    saveField={saveField}
                    cancelEditing={cancelEditing}
                    toggleFeature={toggleFeature}
                  />
                )}
                {activeTab === "advanced" && (
                  <AdvancedSettings
                    game={game}
                    activeProfile={activeProfile}
                    isLinux={isLinux}
                    editingField={editingField}
                    isSaving={isSaving}
                    localFpsPattern={localFpsPattern}
                    localFpsOffset={localFpsOffset}
                    localProfileName={localProfileName}
                    localProfileDescription={localProfileDescription}
                    localGamescopeArgs={localGamescopeArgs}
                    availableRunners={availableRunners}
                    setLocalFpsPattern={setLocalFpsPattern}
                    setLocalFpsOffset={setLocalFpsOffset}
                    setLocalProfileName={setLocalProfileName}
                    setLocalProfileDescription={setLocalProfileDescription}
                    setLocalGamescopeArgs={setLocalGamescopeArgs}
                    startEditing={startEditing}
                    saveField={saveField}
                    cancelEditing={cancelEditing}
                    toggleFeature={toggleFeature}
                    updateFpsTarget={updateFpsTarget}
                    setInjectionMethod={m =>
                      updateGameConfig(game.id, { injectionMethod: m })
                    }
                    updateResolution={(w, h) =>
                      updateProfile(game.id, activeProfile.id, {
                        resolution: [w, h],
                      })
                    }
                    updateProfile={updateProfile}
                    updateGameConfig={updateGameConfig}
                    handleDeleteProfile={async () => {
                      if (
                        await showConfirm(
                          `Delete loadout "${activeProfile.name}"?`,
                          "Delete Profile"
                        )
                      )
                        await deleteProfile(game.id, activeProfile.id);
                    }}
                  />
                )}
                {activeTab === "management" && (
                  <ManagementSettings
                    game={game}
                    onClose={onClose}
                    onUninstall={onUninstall}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
