import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Zap, Monitor, Trash2 } from "lucide-react";
import { EditableSetting } from "../ui/EditableSetting";
import { Game, Profile } from "../../types";
import { cn } from "../../lib/utils";
import { InjectionMethod } from "../../lib/api";
import { Select } from "../ui/Select";
import { AssetSetupButton } from "./AssetSetupButton";

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
  localGamescopeArgs: string;
  availableRunners: string[];
  setLocalFpsPattern: (v: string) => void;
  setLocalFpsOffset: (v: number) => void;
  setLocalProfileName: (v: string) => void;
  setLocalProfileDescription: (v: string) => void;
  setLocalGamescopeArgs: (v: string) => void;
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
  localGamescopeArgs,
  availableRunners,
  setLocalFpsPattern,
  setLocalFpsOffset,
  setLocalProfileName,
  setLocalProfileDescription,
  setLocalGamescopeArgs,
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
}) => {
  return (
    <div className="space-y-12">
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-primary text-sm font-medium flex gap-4">
        <AlertTriangle className="shrink-0 text-primary" size={20} />
        <p className="leading-relaxed">
          Advanced configurations can cause runtime instability or game crashes.
          Proceed with caution.
        </p>
      </div>

      <div className="space-y-8">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 pl-2">
          Active Loadout
        </h3>
        <div className="divide-y divide-border border-t border-border">
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
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
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
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none min-h-[80px]"
              autoFocus
            />
          </EditableSetting>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider pl-2">
          Game Performance
        </h3>
        <div className="divide-y divide-border border-t border-border">
          <div className="py-4 px-2 flex flex-col gap-4 group hover:bg-muted/30 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">
                  FPS Unlocker
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Bypass the default 60 FPS limit
                </div>
              </div>
              <button
                onClick={() => toggleFeature("fps")}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                  game.fpsConfig?.enabled
                    ? "bg-primary border-primary"
                    : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                    game.fpsConfig?.enabled ? "right-0.5" : "left-0.5"
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
                  <div className="flex items-center justify-between pt-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Target FPS
                    </label>
                    <Select
                      value={game.fpsConfig?.target_fps || 60}
                      onChange={v => updateFpsTarget(parseInt(v))}
                      options={[60, 80, 120, 144, 165, 240].map(fps => ({
                        value: fps,
                        label: `${fps} FPS`,
                      }))}
                      className="min-w-[140px]"
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <EditableSetting
                      label="FPS Search Pattern"
                      description="Hexadecimal pattern to find FPS value in memory."
                      displayValue={
                        game.fpsConfig?.search_pattern ? (
                          <span className="font-mono text-[10px] text-foreground">
                            {game.fpsConfig.search_pattern}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            None
                          </span>
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
                          <label className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">
                            Pattern (Hex)
                          </label>
                          <input
                            type="text"
                            value={localFpsPattern}
                            onChange={e => setLocalFpsPattern(e.target.value)}
                            placeholder="7F 0F..."
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">
                            Offset (Bytes)
                          </label>
                          <input
                            type="number"
                            value={localFpsOffset}
                            onChange={e =>
                              setLocalFpsOffset(parseInt(e.target.value))
                            }
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>
                    </EditableSetting>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {game.modloaderEnabled && (
              <AssetSetupButton
                gameId={game.id}
                assetType="loader"
                label="Install / Update Mod Loader"
              />
            )}
          </div>

          <div className="py-4 px-2 flex flex-col gap-4 group hover:bg-muted/30 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-card text-primary border border-border">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Enable Mod Loader
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
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
                  "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                  game.modloaderEnabled
                    ? "bg-primary border-primary"
                    : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                    game.modloaderEnabled ? "right-0.5" : "left-0.5"
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
                  className="overflow-hidden pt-2 pl-12"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Injection Method
                    </label>
                    <Select
                      value={game.injectionMethod || InjectionMethod.Proxy}
                      onChange={v => setInjectionMethod(v as InjectionMethod)}
                      options={(game.supportedInjectionMethods &&
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
                        .map(method => ({
                          value: method,
                          label:
                            method === InjectionMethod.Proxy
                              ? "Proxy DLL (d3d11.dll)"
                              : method === InjectionMethod.Loader
                                ? "Direct Loader (Hook)"
                                : method === InjectionMethod.RemoteThread
                                  ? "Remote Thread (Inject)"
                                  : method,
                        }))}
                      className="min-w-[200px]"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="py-4 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-lg transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-card text-primary border border-border">
                <Monitor size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  Enable ReShade
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
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
                "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                activeProfile.useReshade
                  ? "bg-primary border-primary"
                  : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                  activeProfile.useReshade ? "right-0.5" : "left-0.5"
                )}
              />
            </button>
          </div>

          {activeProfile.useReshade && (
            <div className="px-2">
              <AssetSetupButton
                gameId={game.id}
                assetType="reshade"
                label="Install / Update ReShade Core"
              />
            </div>
          )}

          {isLinux && (
            <div className="py-4 px-2 flex flex-col gap-4 group hover:bg-muted/30 rounded-lg transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-card text-primary border border-border">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Compatibility Runner
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Select Proton/Wine version
                    </div>
                  </div>
                </div>
                <Select
                  value={game.activeRunnerId || "default"}
                  onChange={v =>
                    updateGameConfig(game.id, {
                      activeRunnerId: v === "default" ? null : v,
                    })
                  }
                  options={[
                    { value: "default", label: "System Default" },
                    ...availableRunners.map(r => ({ value: r, label: r })),
                  ]}
                  className="min-w-[200px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isLinux && (
        <div className="space-y-8">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider pl-2">
            Linux Environment
          </h3>
          <div className="divide-y divide-border border-t border-border">
            <div className="py-4 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-lg transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">
                  Integrity Shield
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Prevent game from deleting mod files
                </div>
              </div>
              <button
                onClick={() => toggleFeature("shield")}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                  game.enableLinuxShield
                    ? "bg-primary border-primary"
                    : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                    game.enableLinuxShield ? "right-0.5" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <div className="py-4 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-lg transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">
                  Gamemode
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Enable Feral GameMode optimizations
                </div>
              </div>
              <button
                onClick={() => toggleFeature("gamemode")}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                  activeProfile.useGamemode
                    ? "bg-primary border-primary"
                    : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                    activeProfile.useGamemode ? "right-0.5" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <div className="py-4 px-2 flex flex-col gap-4 group hover:bg-muted/30 rounded-lg transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Gamescope
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Use Gamescope micro-compositor
                  </div>
                </div>
                <button
                  onClick={() => toggleFeature("gamescope")}
                  className={cn(
                    "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                    activeProfile.useGamescope
                      ? "bg-primary border-primary"
                      : "bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                      activeProfile.useGamescope ? "right-0.5" : "left-0.5"
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
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
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
                            className="w-full bg-background border border-border rounded-md pl-4 pr-8 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">
                            W
                          </span>
                        </div>
                        <span className="text-muted-foreground font-bold text-lg">
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
                            className="w-full bg-background border border-border rounded-md pl-4 pr-8 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-colors"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">
                            H
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <EditableSetting
                        label="Gamescope Arguments"
                        description="Additional parameters for the micro-compositor (e.g., --adaptive-sync)."
                        displayValue={
                          activeProfile.gamescopeArgs?.length ? (
                            <span className="font-mono text-[10px] text-foreground">
                              {activeProfile.gamescopeArgs.join(" ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              None
                            </span>
                          )
                        }
                        isEditing={editingField === "gamescopeArgs"}
                        onEdit={() => startEditing("gamescopeArgs")}
                        onSave={() => saveField("gamescopeArgs")}
                        onCancel={cancelEditing}
                        isSaving={isSaving}
                      >
                        <input
                          type="text"
                          value={localGamescopeArgs}
                          onChange={e => setLocalGamescopeArgs(e.target.value)}
                          placeholder="--adaptive-sync --rt"
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground font-mono focus:ring-1 focus:ring-primary outline-none"
                        />
                      </EditableSetting>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="py-4 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-lg transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">
                  MangoHud
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Enable performance overlay
                </div>
              </div>
              <button
                onClick={() => toggleFeature("mangohud")}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                  activeProfile.useMangohud
                    ? "bg-primary border-primary"
                    : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                    activeProfile.useMangohud ? "right-0.5" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 pt-6 border-t border-border">
        <h3 className="text-xs font-black text-destructive uppercase tracking-widest pl-2">
          Danger Zone
        </h3>
        <div className="grid grid-cols-1">
          <button
            onClick={handleDeleteProfile}
            className="p-4 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive hover:text-destructive-foreground rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
          >
            <Trash2
              size={16}
              className="group-hover:scale-110 transition-transform"
            />
            Delete Loadout
          </button>
        </div>
      </div>
    </div>
  );
};
