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
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex gap-3">
        <AlertTriangle className="shrink-0" size={20} />
        <p>
          Advanced settings can cause game instability. Proceed with caution.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-indigo-400">
          Active Loadout
        </h3>
        <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
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

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-indigo-400">
          Game Performance
        </h3>
        <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  FPS Unlocker
                </div>
                <div className="text-xs text-slate-400">
                  Bypass the default 60 FPS limit
                </div>
              </div>
              <button
                onClick={() => toggleFeature("fps")}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  game.fpsConfig?.enabled ? "bg-indigo-600" : "bg-slate-700"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
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

          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-amber-400" />
                <div>
                  <div className="text-sm font-medium text-white">
                    Injection Method
                  </div>
                  <div className="text-xs text-slate-400">
                    How mod loader is attached to game
                  </div>
                </div>
              </div>
              <select
                value={game.injectionMethod || InjectionMethod.Proxy}
                onChange={e =>
                  setInjectionMethod(e.target.value as InjectionMethod)
                }
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={InjectionMethod.None}>None (Disabled)</option>
                <option value={InjectionMethod.Proxy}>
                  Proxy DLL (d3d11.dll)
                </option>
                <option value={InjectionMethod.Loader}>
                  Direct Loader (3dmloader)
                </option>
              </select>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                Enable ReShade
              </div>
              <div className="text-xs text-slate-400">
                Inject post-processing filters (requires Mod Loader)
              </div>
            </div>
            <button
              onClick={() =>
                updateProfile(game.id, activeProfile.id, {
                  useReshade: !activeProfile.useReshade,
                })
              }
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                activeProfile.useReshade ? "bg-indigo-600" : "bg-slate-700"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                  activeProfile.useReshade ? "right-1" : "left-1"
                )}
              />
            </button>
          </div>

          {isLinux && (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor size={18} className="text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Compatibility Runner
                    </div>
                    <div className="text-xs text-slate-400">
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
                  className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 min-w-[150px]"
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
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-indigo-400">
            Linux Environment
          </h3>
          <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  Integrity Shield
                </div>
                <div className="text-xs text-slate-400">
                  Prevent game from deleting mod files (LD_PRELOAD)
                </div>
              </div>
              <button
                onClick={() => toggleFeature("shield")}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  game.enableLinuxShield ? "bg-indigo-600" : "bg-slate-700"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                    game.enableLinuxShield ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Gamemode</div>
                <div className="text-xs text-slate-400">
                  Enable Feral GameMode optimizations
                </div>
              </div>
              <button
                onClick={() => toggleFeature("gamemode")}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  activeProfile.useGamemode ? "bg-indigo-600" : "bg-slate-700"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                    activeProfile.useGamemode ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">
                    Gamescope
                  </div>
                  <div className="text-xs text-slate-400">
                    Use Gamescope micro-compositor
                  </div>
                </div>
                <button
                  onClick={() => toggleFeature("gamescope")}
                  className={cn(
                    "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    activeProfile.useGamescope
                      ? "bg-indigo-600"
                      : "bg-slate-700"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
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
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                        Target Resolution
                      </label>
                      <div className="flex items-center gap-3">
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
                            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            W
                          </span>
                        </div>
                        <span className="text-slate-500">x</span>
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
                            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            H
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">MangoHud</div>
                <div className="text-xs text-slate-400">
                  Enable performance overlay
                </div>
              </div>
              <button
                onClick={() => toggleFeature("mangohud")}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  activeProfile.useMangohud ? "bg-indigo-600" : "bg-slate-700"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                    activeProfile.useMangohud ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-white/5">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Danger Zone
        </h3>
        <div className="space-y-3">
          <button
            onClick={handleDeleteProfile}
            className="w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 group"
          >
            <Trash2 size={18} />
            Delete Current Loadout
          </button>
          <button
            onClick={handleDeleteGame}
            className="w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 group"
          >
            <Trash2 size={18} />
            Uninstall Game
          </button>
        </div>
      </div>
    </div>
  );
};
