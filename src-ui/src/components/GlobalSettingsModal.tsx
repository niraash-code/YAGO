import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  FolderOpen,
  Globe,
  Monitor,
  Terminal,
  Shield,
  RefreshCw,
  Trash2,
  Star,
  Download,
} from "lucide-react";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { open } from "@tauri-apps/plugin-dialog";
import { EditableSetting } from "./ui/EditableSetting";
import { useAssetInstaller } from "../hooks/useAssetInstaller";
import { cn } from "../lib/utils";
import { ThemeSelector } from "./settings/ThemeSelector";
import { Select } from "./ui/Select";

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    globalSettings,
    updateGlobalSettings,
    availableRunners,
    refreshRunners,
    removeRunner,
    appConfig,
    updateAppConfig,
    forceResetAppState,
  } = useAppStore();
  const { showAlert, showConfirm } = useUiStore();
  const { installState, installProton } = useAssetInstaller();

  const [activeTab, setActiveTab] = useState<
    "general" | "paths" | "runners" | "config"
  >("general");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Buffer state
  const [localSteamPath, setLocalSteamPath] = useState("");
  const [localWinePrefix, setLocalWinePrefix] = useState("");
  const [localStoragePath, setLocalStoragePath] = useState("");
  const [localDefaultGamesPath, setLocalDefaultGamesPath] = useState("");
  const [localModsPath, setLocalModsPath] = useState("");
  const [localRunnersPath, setLocalRunnersPath] = useState("");
  const [localPrefixesPath, setLocalPrefixesPath] = useState("");
  const [localCachePath, setLocalCachePath] = useState("");

  // AppConfig Buffers
  const [localCommonLoaderRepo, setLocalCommonLoaderRepo] = useState("");
  const [localProtonRepo, setLocalProtonRepo] = useState("");

  useEffect(() => {
    if (globalSettings) {
      setLocalSteamPath(globalSettings.steam_compat_tools_path || "");
      setLocalWinePrefix(globalSettings.wine_prefix_path || "");
      setLocalStoragePath(globalSettings.yago_storage_path || "");
      setLocalDefaultGamesPath(globalSettings.default_games_path || "");
      setLocalModsPath(globalSettings.mods_path || "");
      setLocalRunnersPath(globalSettings.runners_path || "");
      setLocalPrefixesPath(globalSettings.prefixes_path || "");
      setLocalCachePath(globalSettings.cache_path || "");
    }
    if (appConfig) {
      setLocalCommonLoaderRepo(appConfig.commonLoaderRepo);
      setLocalProtonRepo(appConfig.protonRepo);
    }
  }, [globalSettings, appConfig]);

  useEffect(() => {
    if (isOpen && activeTab === "runners") {
      refreshRunners();
    }
  }, [isOpen, activeTab, refreshRunners]);

  const saveGlobalField = async (field: string) => {
    if (!globalSettings) return;
    setIsSaving(true);
    try {
      const update = { ...globalSettings };
      if (field === "steamPath")
        update.steam_compat_tools_path = localSteamPath;
      if (field === "winePrefix") update.wine_prefix_path = localWinePrefix;
      if (field === "storagePath") update.yago_storage_path = localStoragePath;
      if (field === "defaultGamesPath")
        update.default_games_path = localDefaultGamesPath;
      if (field === "modsPath") update.mods_path = localModsPath;
      if (field === "runnersPath") update.runners_path = localRunnersPath;
      if (field === "prefixesPath") update.prefixes_path = localPrefixesPath;
      if (field === "cachePath") update.cache_path = localCachePath;

      await updateGlobalSettings(update);
      setEditingField(null);
    } catch (e) {
      showAlert("Failed to save global settings: " + e, "Error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAppConfigField = async (field: string) => {
    if (!appConfig) return;
    setIsSaving(true);
    try {
      const update = { ...appConfig };
      if (field === "commonLoader")
        update.commonLoaderRepo = localCommonLoaderRepo;
      if (field === "protonRepo") update.protonRepo = localProtonRepo;

      await updateAppConfig(update);
      setEditingField(null);
    } catch (e) {
      showAlert("Failed to save repository config: " + e, "Error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGlobal = async (key: keyof typeof globalSettings) => {
    if (!globalSettings) return;
    try {
      const update = { ...globalSettings, [key]: !globalSettings[key] };
      await updateGlobalSettings(update);
    } catch (e) {
      showAlert("Toggle failed: " + e, "Error");
    }
  };

  if (!globalSettings) return null;

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
            className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-[51]"
          >
            {/* Header */}
            <div className="p-8 border-b border-border flex items-center justify-between bg-background">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary rounded-lg text-primary-foreground border border-primary">
                  <Settings size={22} />
                </div>
                <div>
                  <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-1">
                    System Hub
                  </h2>
                  <p className="text-2xl font-black text-foreground tracking-tighter uppercase italic">
                    App Settings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-border gap-2 bg-background p-2">
              {["general", "paths", "runners", "config"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab === "config" ? "REPOS" : tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-card">
              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                      Application Behavior
                    </h3>

                    <div className="bg-background rounded-lg p-4 border border-border flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-card text-primary border border-border">
                          <Shield size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Stream Safe Mode
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-bold">
                            Automatically hide or blur NSFW content
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleGlobal("stream_safe")}
                        className={cn(
                          "w-11 h-6 rounded-full transition-all relative border border-border",
                          globalSettings.stream_safe ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 w-4 h-4 bg-primary-foreground rounded-full transition-all shadow-sm",
                            globalSettings.stream_safe
                              ? "right-0.5"
                              : "left-0.5"
                          )}
                        />
                      </button>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-border flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-card text-primary border border-border">
                          <Terminal size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Close on Launch
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-bold">
                            Exit YAGO to tray when a game starts
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleGlobal("close_on_launch")}
                        className={cn(
                          "w-11 h-6 rounded-full transition-all relative border border-border",
                          globalSettings.close_on_launch
                            ? "bg-primary"
                            : "bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 w-4 h-4 bg-primary-foreground rounded-full transition-all shadow-sm",
                            globalSettings.close_on_launch
                              ? "right-0.5"
                              : "left-0.5"
                          )}
                        />
                      </button>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-border flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-card text-primary border border-border">
                            <Globe size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              Language
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-bold">
                              Select your preferred display language
                            </div>
                          </div>
                        </div>
                        <Select
                          value={globalSettings.language}
                          onChange={v =>
                            updateGlobalSettings({
                              ...globalSettings,
                              language: v,
                            })
                          }
                          options={[
                            { value: "en-US", label: "English (US)" },
                            { value: "ja-JP", label: "日本語 (Japanese)" },
                            { value: "zh-CN", label: "简体中文 (Chinese)" },
                          ]}
                          className="min-w-[180px]"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                        Theme & Appearance
                      </h3>

                      <div className="space-y-6">
                        <ThemeSelector />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                        Maintenance
                      </h3>
                      <button
                        onClick={async () => {
                          await forceResetAppState();
                          showAlert("App state has been reset.", "Success");
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all text-sm font-bold w-full uppercase tracking-widest"
                      >
                        <RefreshCw size={18} />
                        Force Reset App State
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "paths" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                      System Directories
                    </h3>

                    <EditableSetting
                      label="Steam Compatibility Tools"
                      description="Path to your Steam 'compatibilitytools.d' directory for Proton versions."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.steam_compat_tools_path ||
                            "Not detected"}
                        </span>
                      }
                      isEditing={editingField === "steamPath"}
                      onEdit={() => setEditingField("steamPath")}
                      onSave={() => saveGlobalField("steamPath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalSteamPath(
                          globalSettings.steam_compat_tools_path
                        );
                      }}
                      isSaving={isSaving}
                      path={globalSettings.steam_compat_tools_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localSteamPath}
                          onChange={e => setLocalSteamPath(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/home/user/.steam/steam/compatibilitytools.d"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localSteamPath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalSteamPath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Global Wine Prefix"
                      description="Default prefix used for games that don't have a specific one configured."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.wine_prefix_path || "Not set"}
                        </span>
                      }
                      isEditing={editingField === "winePrefix"}
                      onEdit={() => setEditingField("winePrefix")}
                      onSave={() => saveGlobalField("winePrefix")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalWinePrefix(globalSettings.wine_prefix_path);
                      }}
                      isSaving={isSaving}
                      path={globalSettings.wine_prefix_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localWinePrefix}
                          onChange={e => setLocalWinePrefix(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/home/user/.wine"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localWinePrefix || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalWinePrefix(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="YAGO Storage Path"
                      description="Where YAGO stores game databases, mod metadata, and logs."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.yago_storage_path ||
                            "Standard Data Path"}
                        </span>
                      }
                      isEditing={editingField === "storagePath"}
                      onEdit={() => setEditingField("storagePath")}
                      onSave={() => saveGlobalField("storagePath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalStoragePath(globalSettings.yago_storage_path);
                      }}
                      isSaving={isSaving}
                      path={globalSettings.yago_storage_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localStoragePath}
                          onChange={e => setLocalStoragePath(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/home/user/.local/share/yago"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localStoragePath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalStoragePath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Default Games Folder"
                      description="Default location where new games will be installed."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.default_games_path || "Not set"}
                        </span>
                      }
                      isEditing={editingField === "defaultGamesPath"}
                      onEdit={() => setEditingField("defaultGamesPath")}
                      onSave={() => saveGlobalField("defaultGamesPath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalDefaultGamesPath(
                          globalSettings.default_games_path
                        );
                      }}
                      isSaving={isSaving}
                      path={globalSettings.default_games_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localDefaultGamesPath}
                          onChange={e =>
                            setLocalDefaultGamesPath(e.target.value)
                          }
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/path/to/Games"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localDefaultGamesPath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalDefaultGamesPath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Mods Storage"
                      description="Where YAGO stores and manages your downloaded mods."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.mods_path || "Standard Mods Path"}
                        </span>
                      }
                      isEditing={editingField === "modsPath"}
                      onEdit={() => setEditingField("modsPath")}
                      onSave={() => saveGlobalField("modsPath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalModsPath(globalSettings.mods_path);
                      }}
                      isSaving={isSaving}
                      path={globalSettings.mods_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localModsPath}
                          onChange={e => setLocalModsPath(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/path/to/Mods"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localModsPath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalModsPath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Runners (Proton/Wine)"
                      description="Folder for downloaded and managed compatibility layers."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.runners_path ||
                            "Standard Runners Path"}
                        </span>
                      }
                      isEditing={editingField === "runnersPath"}
                      onEdit={() => setEditingField("runnersPath")}
                      onSave={() => saveGlobalField("runnersPath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalRunnersPath(globalSettings.runners_path);
                      }}
                      isSaving={isSaving}
                      path={globalSettings.runners_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localRunnersPath}
                          onChange={e => setLocalRunnersPath(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/path/to/Runners"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localRunnersPath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalRunnersPath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Game Prefixes"
                      description="Base directory for game-specific Wine/Proton prefixes."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.prefixes_path ||
                            "Standard Prefixes Path"}
                        </span>
                      }
                      isEditing={editingField === "prefixesPath"}
                      onEdit={() => setEditingField("prefixesPath")}
                      onSave={() => saveGlobalField("prefixesPath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalPrefixesPath(globalSettings.prefixes_path);
                      }}
                      isSaving={isSaving}
                      path={globalSettings.prefixes_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localPrefixesPath}
                          onChange={e => setLocalPrefixesPath(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/path/to/Prefixes"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localPrefixesPath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalPrefixesPath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Cache Directory"
                      description="Where YAGO stores temporary downloads and extracted files."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {globalSettings.cache_path || "Standard Cache Path"}
                        </span>
                      }
                      isEditing={editingField === "cachePath"}
                      onEdit={() => setEditingField("cachePath")}
                      onSave={() => saveGlobalField("cachePath")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalCachePath(globalSettings.cache_path);
                      }}
                      isSaving={isSaving}
                      path={globalSettings.cache_path}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localCachePath}
                          onChange={e => setLocalCachePath(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                          placeholder="/home/user/.cache/yago"
                        />
                        <button
                          onClick={async () => {
                            const selected = await open({
                              directory: true,
                              multiple: false,
                              defaultPath: localCachePath || undefined,
                            });
                            if (selected && typeof selected === "string")
                              setLocalCachePath(selected);
                          }}
                          className="p-2 bg-muted hover:bg-muted-foreground/20 border border-border rounded-lg text-muted-foreground transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>
                  </div>
                </div>
              )}

              {activeTab === "runners" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        Runner Management
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 font-bold">
                        Manage Proton/Wine versions for your games
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={refreshRunners}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Rescan folders"
                      >
                        <RefreshCw size={16} />
                      </button>
                      {installState.status === "idle" && (
                        <button
                          onClick={() => installProton()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-all"
                        >
                          <Download size={14} />
                          Get GE-Proton
                        </button>
                      )}
                    </div>
                  </div>

                  {installState.status === "working" && (
                    <div className="p-4 rounded-lg bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-primary uppercase">
                        <span>Downloading GE-Proton...</span>
                        <span>{Math.round(installState.progress * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${installState.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {availableRunners.length > 0 ? (
                      availableRunners.map(runner => (
                        <div
                          key={runner}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border transition-all group",
                            globalSettings.default_runner_id === runner
                              ? "bg-background border-primary"
                              : "bg-background border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "p-2.5 rounded-lg transition-colors",
                                globalSettings.default_runner_id === runner
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              )}
                            >
                              <Monitor size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">
                                  {runner}
                                </span>
                                {globalSettings.default_runner_id ===
                                  runner && (
                                  <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase tracking-tighter font-bold">
                                Local Storage
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 invisible group-hover:visible transition-all">
                            {globalSettings.default_runner_id !== runner && (
                              <button
                                onClick={() =>
                                  updateGlobalSettings({
                                    ...globalSettings,
                                    default_runner_id: runner,
                                  })
                                }
                                className="p-2 hover:bg-primary hover:text-primary-foreground text-muted-foreground rounded-lg transition-colors"
                                title="Set as Default"
                              >
                                <Star size={16} />
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (
                                  await showConfirm(
                                    `Permanently delete ${runner} from your storage?`,
                                    "Delete Runner"
                                  )
                                ) {
                                  try {
                                    await removeRunner(runner);
                                  } catch (e) {
                                    showAlert(
                                      "Failed to delete: " + e,
                                      "Error"
                                    );
                                  }
                                }
                              }}
                              className="p-2 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-background rounded-lg border border-dashed border-border">
                        <Monitor className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">
                          No external runners detected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "config" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                      Remote Repositories
                    </h3>

                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs mb-6 font-black uppercase tracking-widest leading-relaxed">
                      <p>
                        These settings control where YAGO fetches its core
                        components. Only change these if you want to use a fork
                        or custom repository.
                      </p>
                    </div>

                    <EditableSetting
                      label="Common Mod Loader"
                      description="Default GitHub repository for 3DMigoto/GIMI loaders."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {appConfig?.commonLoaderRepo}
                        </span>
                      }
                      isEditing={editingField === "commonLoader"}
                      onEdit={() => setEditingField("commonLoader")}
                      onSave={() => saveAppConfigField("commonLoader")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalCommonLoaderRepo(
                          appConfig?.commonLoaderRepo || ""
                        );
                      }}
                      isSaving={isSaving}
                    >
                      <input
                        type="text"
                        value={localCommonLoaderRepo}
                        onChange={e => setLocalCommonLoaderRepo(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                        placeholder="Owner/Repo"
                      />
                    </EditableSetting>

                    <EditableSetting
                      label="Proton Distribution"
                      description="GitHub repository used for fetching Proton compatibility layers."
                      displayValue={
                        <span className="font-mono text-xs text-foreground">
                          {appConfig?.protonRepo}
                        </span>
                      }
                      isEditing={editingField === "protonRepo"}
                      onEdit={() => setEditingField("protonRepo")}
                      onSave={() => saveAppConfigField("protonRepo")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalProtonRepo(appConfig?.protonRepo || "");
                      }}
                      isSaving={isSaving}
                    >
                      <input
                        type="text"
                        value={localProtonRepo}
                        onChange={e => setLocalProtonRepo(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                        placeholder="Owner/Repo"
                      />
                    </EditableSetting>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};