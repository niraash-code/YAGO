import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Game } from "../types";
import { cn } from "../lib/utils";

import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { InjectionMethod } from "../lib/api";

// Sub-components
import { GeneralSettings } from "./settings/GeneralSettings";
import { InstallationSettings } from "./settings/InstallationSettings";
import { AdvancedSettings } from "./settings/AdvancedSettings";

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
    "general" | "installation" | "advanced"
  >("general");
  const {
    updateProfile,
    updateGameConfig,
    deleteProfile,
    availableRunners,
    refreshRunners,
  } = useAppStore();
  const { showAlert, showConfirm } = useUiStore();

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-12 bottom-0 w-[500px] bg-slate-950/60 backdrop-blur-3xl border-l border-white/5 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">
                  Game Configuration
                </h2>
                <p className="text-2xl font-black text-white tracking-tighter uppercase italic">
                  {game.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex px-6 border-b border-white/5 gap-2 bg-black/20 p-2">
              {["general", "installation", "advanced"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    activeTab === tab
                      ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
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
                  availableRunners={availableRunners}
                  setLocalFpsPattern={setLocalFpsPattern}
                  setLocalFpsOffset={setLocalFpsOffset}
                  setLocalProfileName={setLocalProfileName}
                  setLocalProfileDescription={setLocalProfileDescription}
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
                  handleDeleteGame={async () => {
                    if (
                      await showConfirm(
                        `Uninstall ${game.name}?`,
                        "Uninstall Game"
                      )
                    ) {
                      onUninstall(game.id);
                      onClose();
                    }
                  }}
                />
              )}
            </div>
            <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
