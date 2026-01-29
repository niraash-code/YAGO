import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Zap, Monitor, Trash2 } from "lucide-react";
import { EditableSetting } from "../ui/EditableSetting";
import { Game, Profile } from "../../types";
import { cn } from "../../lib/utils";
import { InjectionMethod } from "../../lib/api";

interface AdvancedSettingsProps {
  game: Game;
  activeProfile: Profile;
  isLinux: boolean;
  editingField: string | null;
  isSaving: boolean;
  localFpsPattern: string;
  localFpsOffset: number;
  localProfileName: string;
  localProfileDescription: string;
  availableRunners: string[];
  setLocalFpsPattern: (v: string) => void;
  setLocalFpsOffset: (v: number) => void;
  setLocalProfileName: (v: string) => void;
  setLocalProfileDescription: (v: string) => void;
  startEditing: (f: string) => void;
  saveField: (f: string) => void;
  cancelEditing: () => void;
  toggleFeature: (f: any) => void;
  updateFpsTarget: (fps: number) => void;
  setInjectionMethod: (m: InjectionMethod) => void;
  updateResolution: (w: number, h: number) => void;
  updateProfile: (gid: string, pid: string, update: any) => void;
  updateGameConfig: (gid: string, update: any) => void;
  handleDeleteProfile: () => void;
  handleDeleteGame: () => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  game,
  activeProfile,
  isLinux,
  editingField,
  isSaving,
  localFpsPattern,
  localFpsOffset,
  localProfileName,
  localProfileDescription,
  availableRunners,
  setLocalFpsPattern,
  setLocalFpsOffset,
  setLocalProfileName,
  setLocalProfileDescription,
  startEditing,
  saveField,
  cancelEditing,
  toggleFeature,
  updateFpsTarget,
  setInjectionMethod,
  updateResolution,
  updateProfile,
  updateGameConfig,
  handleDeleteProfile,
  handleDeleteGame,
}) => {
  return (
    <div className="space-y-12">
      <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-200/70 text-sm font-medium flex gap-5 backdrop-blur-sm">
        <AlertTriangle className="shrink-0 text-amber-500" size={20} />
        <p className="leading-relaxed">
          Advanced configurations can cause runtime instability or game crashes.
          Proceed with caution and verify changes.
        </p>
      </div>

      <div className="space-y-8">
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">
          Active Loadout
        </h3>
        <div className="divide-y divide-white/5 border-t border-white/5">
          <EditableSetting
            label="Loadout Name"
            description="Rename the current configuration profile."
            displayValue={activeProfile.name}
            isEditing={editingField === "profileName"}
            onEdit={() => startEditing("profileName")}
            onSave={() => saveField("profileName")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <input
              type="text"
              value={localProfileName}
              onChange={e => setLocalProfileName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </EditableSetting>

          <EditableSetting
            label="Loadout Description"
            description="Details about this configuration."
            displayValue={activeProfile.description}
            isEditing={editingField === "profileDescription"}
            onEdit={() => startEditing("profileDescription")}
            onSave={() => saveField("profileDescription")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <textarea
              value={localProfileDescription}
              onChange={e => setLocalProfileDescription(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
              autoFocus
            />
          </EditableSetting>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">
          Game Performance
        </h3>
        <div className="divide-y divide-white/5 border-t border-white/5">
          <div className="py-6 flex flex-col gap-6 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-white uppercase tracking-tight">
                  FPS Unlocker
                </div>
                <div className="text-sm text-slate-500 mt-1 font-medium">
                  Bypass the default 60 FPS limit
                </div>
              </div>
              <button
                onClick={() => toggleFeature("fps")}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                  game.fpsConfig?.enabled
                    ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                    : "bg-slate-800"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    game.fpsConfig?.enabled ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            <AnimatePresence>
              {game.fpsConfig?.enabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-4 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Target FPS
                    </label>
                    <select
                      value={game.fpsConfig?.target_fps || 60}
                      onChange={e => updateFpsTarget(parseInt(e.target.value))}
                      className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {[60, 80, 120, 144, 165, 240].map(fps => (
                        <option key={fps} value={fps}>
                          {fps}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5">
                    <EditableSetting
                      label="FPS Search Pattern"
                      description="Hexadecimal pattern to find FPS value in memory."
                      displayValue={
                        game.fpsConfig?.search_pattern ? (
                          <span className="font-mono text-[10px]">
                            {game.fpsConfig.search_pattern}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )
                      }
                      isEditing={editingField === "fpsAdvanced"}
                      onEdit={() => startEditing("fpsAdvanced")}
                      onSave={() => saveField("fpsAdvanced")}
                      onCancel={cancelEditing}
                      isSaving={isSaving}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">
                            Pattern (Hex)
                          </label>
                          <input
                            type="text"
                            value={localFpsPattern}
                            onChange={e => setLocalFpsPattern(e.target.value)}
                            placeholder="7F 0F..."
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">
                            Offset (Bytes)
                          </label>
                          <input
                            type="number"
                            value={localFpsOffset}
                            onChange={e =>
                              setLocalFpsOffset(parseInt(e.target.value))
                            }
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </EditableSetting>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="py-6 flex flex-col gap-4 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="text-base font-bold text-white uppercase tracking-tight">
                    Enable Mod Loader
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">
                    Load character skins and active mods
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  updateGameConfig(game.id, {
                    modloaderEnabled: !game.modloaderEnabled,
                  })
                }
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                  game.modloaderEnabled
                    ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                    : "bg-slate-800"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    game.modloaderEnabled ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            <AnimatePresence>
              {game.modloaderEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-4"
                >
                  <div className="flex items-center justify-between pl-14">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Injection Method
                    </label>
                    <select
                      value={game.injectionMethod || InjectionMethod.Proxy}
                      onChange={e =>
                        setInjectionMethod(e.target.value as InjectionMethod)
                      }
                      className="bg-slate-900 border border-white/10 rounded-xl px-5 py-2.5 text-xs font-black text-white focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
                    >
                      {(game.supportedInjectionMethods &&
                      game.supportedInjectionMethods.length > 0
                        ? game.supportedInjectionMethods
                        : [InjectionMethod.Proxy, InjectionMethod.Loader]
                      )
                        .filter(
                          method =>
                            (!isLinux ||
                              method !== InjectionMethod.RemoteThread) &&
                            method !== InjectionMethod.None
                        )
                        .map(method => (
                          <option key={method} value={method}>
                            {method === InjectionMethod.Proxy
                              ? "Proxy DLL (d3d11.dll)"
                              : method === InjectionMethod.Loader
                                ? "Direct Loader (Hook)"
                                : method === InjectionMethod.RemoteThread
                                  ? "Remote Thread (Inject)"
                                  : method}
                          </option>
                        ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="py-6 flex items-center justify-between group">
            <div className="flex items-center gap-5">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                <Monitor size={20} />
              </div>
              <div>
                <div className="text-base font-bold text-white uppercase tracking-tight">
                  Enable ReShade
                </div>
                <div className="text-sm text-slate-500 mt-1 font-medium">
                  Inject post-processing filters
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                updateProfile(game.id, activeProfile.id, {
                  useReshade: !activeProfile.useReshade,
                })
              }
              className={cn(
                "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                activeProfile.useReshade
                  ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                  : "bg-slate-800"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  activeProfile.useReshade ? "right-1" : "left-1"
                )}
              />
            </button>
          </div>

          {isLinux && (
            <div className="py-6 flex flex-col gap-4 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <div className="text-base font-bold text-white uppercase tracking-tight">
                      Compatibility Runner
                    </div>
                    <div className="text-sm text-slate-500 mt-1 font-medium">
                      Select Proton/Wine version
                    </div>
                  </div>
                </div>
                <select
                  value={game.activeRunnerId || "default"}
                  onChange={e =>
                    updateGameConfig(game.id, {
                      activeRunnerId:
                        e.target.value === "default" ? null : e.target.value,
                    })
                  }
                  className="bg-slate-900 border border-white/10 rounded-xl px-5 py-2.5 text-xs font-black text-white focus:outline-none focus:border-indigo-500 uppercase tracking-widest min-w-[180px]"
                >
                  <option value="default">System Default</option>
                  {availableRunners.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLinux && (
        <div className="space-y-8">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">
            Linux Environment
          </h3>
          <div className="divide-y divide-white/5 border-t border-white/5">
            <div className="py-6 flex items-center justify-between group">
              <div>
                <div className="text-base font-bold text-white uppercase tracking-tight">
                  Integrity Shield
                </div>
                <div className="text-sm text-slate-500 mt-1 font-medium">
                  Prevent game from deleting mod files (LD_PRELOAD)
                </div>
              </div>
              <button
                onClick={() => toggleFeature("shield")}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                  game.enableLinuxShield
                    ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                    : "bg-slate-800"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    game.enableLinuxShield ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            <div className="py-6 flex items-center justify-between group">
              <div>
                <div className="text-base font-bold text-white uppercase tracking-tight">
                  Gamemode
                </div>
                <div className="text-sm text-slate-500 mt-1 font-medium">
                  Enable Feral GameMode optimizations
                </div>
              </div>
              <button
                onClick={() => toggleFeature("gamemode")}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                  activeProfile.useGamemode
                    ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                    : "bg-slate-800"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    activeProfile.useGamemode ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            <div className="py-6 flex flex-col gap-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-white uppercase tracking-tight">
                    Gamescope
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">
                    Use Gamescope micro-compositor
                  </div>
                </div>
                <button
                  onClick={() => toggleFeature("gamescope")}
                  className={cn(
                    "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                    activeProfile.useGamescope
                      ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                      : "bg-slate-800"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      activeProfile.useGamescope ? "right-1" : "left-1"
                    )}
                  />
                </button>
              </div>

              <AnimatePresence>
                {activeProfile.useGamescope && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 block">
                        Target Resolution
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            defaultValue={activeProfile.resolution?.[0] || 1920}
                            onBlur={e =>
                              updateResolution(
                                parseInt(e.target.value),
                                activeProfile.resolution?.[1] || 1080
                              )
                            }
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-5 pr-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                            W
                          </span>
                        </div>
                        <span className="text-slate-700 font-black text-xl">
                          ×
                        </span>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            defaultValue={activeProfile.resolution?.[1] || 1080}
                            onBlur={e =>
                              updateResolution(
                                activeProfile.resolution?.[0] || 1920,
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-5 pr-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                            H
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="py-6 flex items-center justify-between group">
              <div>
                <div className="text-base font-bold text-white uppercase tracking-tight">
                  MangoHud
                </div>
                <div className="text-sm text-slate-500 mt-1 font-medium">
                  Enable performance overlay
                </div>
              </div>
              <button
                onClick={() => toggleFeature("mangohud")}
                className={cn(
                  "w-11 h-6 rounded-full transition-all relative focus:outline-none",
                  activeProfile.useMangohud
                    ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                    : "bg-slate-800"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    activeProfile.useMangohud ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 pt-6 border-t border-white/5">
        <h3 className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.25em]">
          Danger Zone
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleDeleteProfile}
            className="p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400/80 hover:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
          >
            <Trash2
              size={16}
              className="group-hover:scale-110 transition-transform"
            />
            Delete Loadout
          </button>
          <button
            onClick={handleDeleteGame}
            className="p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400/80 hover:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
          >
            <Trash2
              size={16}
              className="group-hover:scale-110 transition-transform"
            />
            Uninstall Game
          </button>
        </div>
      </div>
    </div>
  );
};
