import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  FolderOpen,
  Globe,
  Eye,
  Monitor,
  Terminal,
  Shield,
  Save,
  RefreshCw,
  Trash2,
  Star,
  Download,
} from "lucide-react";
import { useAppStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import { open } from "@tauri-apps/plugin-dialog";
import { EditableSetting } from "./ui/EditableSetting";
import { useAssetInstaller } from "../hooks/useAssetInstaller";
import { cn } from "../lib/utils";

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

  // AppConfig Buffers
  const [localCommonLoaderRepo, setLocalCommonLoaderRepo] = useState("");
  const [localProtonRepo, setLocalProtonRepo] = useState("");
  const [localUpdateUrl, setLocalUpdateUrl] = useState("");

  useEffect(() => {
    if (globalSettings) {
      setLocalSteamPath(globalSettings.steam_compat_tools_path || "");
      setLocalWinePrefix(globalSettings.wine_prefix_path || "");
      setLocalStoragePath(globalSettings.yago_storage_path || "");
    }
    if (appConfig) {
      setLocalCommonLoaderRepo(appConfig.commonLoaderRepo);
      setLocalProtonRepo(appConfig.protonRepo);
      setLocalUpdateUrl(appConfig.yagoUpdateUrl);
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
      if (field === "updateUrl") update.yagoUpdateUrl = localUpdateUrl;

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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl bg-slate-950/80 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-[51]"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                  <Settings size={22} />
                </div>
                <div>
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">
                    System Hub
                  </h2>
                  <p className="text-2xl font-black text-white tracking-tighter uppercase italic">App Settings</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-white/5 gap-2 bg-black/20 p-2">
              {["general", "paths", "runners", "config"].map(tab => (
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
                  {tab === "config" ? "REPOS" : tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-transparent">
              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
                      Application Behavior
                    </h3>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between group hover:bg-white/[0.07] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Shield size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Stream Safe Mode
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Automatically hide or blur NSFW content
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleGlobal("stream_safe")}
                        className={cn(
                          "w-11 h-6 rounded-full transition-all relative",
                          globalSettings.stream_safe
                            ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                            : "bg-slate-700"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                            globalSettings.stream_safe ? "right-1" : "left-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between group hover:bg-white/[0.07] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Terminal size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Close on Launch
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Exit YAGO to tray when a game starts
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleGlobal("close_on_launch")}
                        className={cn(
                          "w-11 h-6 rounded-full transition-all relative",
                          globalSettings.close_on_launch
                            ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                            : "bg-slate-700"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                            globalSettings.close_on_launch
                              ? "right-1"
                              : "left-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col gap-4 group hover:bg-white/[0.07] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Globe size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Language
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Select your preferred display language
                            </div>
                          </div>
                        </div>
                        <select
                          value={globalSettings.language}
                          onChange={e =>
                            updateGlobalSettings({
                              ...globalSettings,
                              language: e.target.value,
                            })
                          }
                          className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="en-US">English (US)</option>
                          <option value="ja-JP">日本語 (Japanese)</option>
                          <option value="zh-CN">简体中文 (Chinese)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
                        Maintenance
                      </h3>
                      <button
                        onClick={async () => {
                          await forceResetAppState();
                          showAlert("App state has been reset.", "Success");
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium w-full"
                      >
                        <RefreshCw size={18} />
                        Force Reset App State
                        <span className="ml-auto text-[10px] opacity-50 font-normal">
                          Clears stuck 'Running' indicators
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "paths" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
                      System Directories
                    </h3>

                    <EditableSetting
                      label="Steam Compatibility Tools"
                      description="Path to your Steam 'compatibilitytools.d' directory for Proton versions."
                      displayValue={
                        <span className="font-mono text-xs opacity-80">
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
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
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
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="Global Wine Prefix"
                      description="Default prefix used for games that don't have a specific one configured."
                      displayValue={
                        <span className="font-mono text-xs opacity-80">
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
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
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
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    </EditableSetting>

                    <EditableSetting
                      label="YAGO Storage Path"
                      description="Where YAGO stores game databases, mod metadata, and logs."
                      displayValue={
                        <span className="font-mono text-xs opacity-80">
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
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
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
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 transition-colors"
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
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        Runner Management
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Manage Proton/Wine versions for your games
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={refreshRunners}
                        className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Rescan folders"
                      >
                        <RefreshCw size={16} />
                      </button>
                      {installState.status === "idle" && (
                        <button
                          onClick={() => installProton()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                        >
                          <Download size={14} />
                          Get GE-Proton
                        </button>
                      )}
                    </div>
                  </div>

                  {installState.status === "working" && (
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-300 uppercase">
                        <span>Downloading GE-Proton...</span>
                        <span>{Math.round(installState.progress * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-indigo-500/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500"
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
                            "flex items-center justify-between p-4 rounded-xl border transition-all group",
                            globalSettings.default_runner_id === runner
                              ? "bg-indigo-500/10 border-indigo-500/50"
                              : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "p-2.5 rounded-lg transition-colors",
                                globalSettings.default_runner_id === runner
                                  ? "bg-indigo-500 text-white"
                                  : "bg-white/5 text-slate-400 group-hover:text-white"
                              )}
                            >
                              <Monitor size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {runner}
                                </span>
                                {globalSettings.default_runner_id ===
                                  runner && (
                                  <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-tighter">
                                Local Storage
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {globalSettings.default_runner_id !== runner && (
                              <button
                                onClick={() =>
                                  updateGlobalSettings({
                                    ...globalSettings,
                                    default_runner_id: runner,
                                  })
                                }
                                className="p-2 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
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
                              className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Monitor className="mx-auto h-10 w-10 text-slate-600 mb-4" />
                        <p className="text-sm text-slate-500 font-medium">
                          No external runners detected.
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Download GE-Proton using the button above or configure
                          Steam path.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "config" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
                      Remote Repositories
                    </h3>

                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs mb-6">
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
                        <span className="font-mono text-xs opacity-80">
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
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        placeholder="Owner/Repo"
                      />
                    </EditableSetting>

                    <EditableSetting
                      label="Proton Distribution"
                      description="GitHub repository used for fetching Proton compatibility layers."
                      displayValue={
                        <span className="font-mono text-xs opacity-80">
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
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        placeholder="Owner/Repo"
                      />
                    </EditableSetting>

                    <EditableSetting
                      label="YAGO Update API"
                      description="Endpoint used to check for new application versions."
                      displayValue={
                        <span className="font-mono text-xs opacity-80 truncate block">
                          {appConfig?.yagoUpdateUrl}
                        </span>
                      }
                      isEditing={editingField === "updateUrl"}
                      onEdit={() => setEditingField("updateUrl")}
                      onSave={() => saveAppConfigField("updateUrl")}
                      onCancel={() => {
                        setEditingField(null);
                        setLocalUpdateUrl(appConfig?.yagoUpdateUrl || "");
                      }}
                      isSaving={isSaving}
                    >
                      <input
                        type="text"
                        value={localUpdateUrl}
                        onChange={e => setLocalUpdateUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        placeholder="https://api.github.com/..."
                      />
                    </EditableSetting>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-end">
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
