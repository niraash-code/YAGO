import React from "react";
import { FolderOpen, AlertTriangle } from "lucide-react";
import { EditableSetting } from "../ui/EditableSetting";
import { Game, Profile } from "../../types";
import { cn } from "../../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";

interface InstallationSettingsProps {
  game: Game;
  activeProfile: Profile;
  isLinux: boolean;
  editingField: string | null;
  isSaving: boolean;
  localInstallPath: string;
  localExeName: string;
  localGlobalLaunchArgs: string;
  localLaunchArgs: string;
  localSavePath: string;
  localPrefixPath: string;
  setLocalInstallPath: (v: string) => void;
  setLocalExeName: (v: string) => void;
  setLocalGlobalLaunchArgs: (v: string) => void;
  setLocalLaunchArgs: (v: string) => void;
  setLocalSavePath: (v: string) => void;
  setLocalPrefixPath: (v: string) => void;
  startEditing: (f: string) => void;
  saveField: (f: string) => void;
  cancelEditing: () => void;
  toggleFeature: (f: any) => void;
}

export const InstallationSettings: React.FC<InstallationSettingsProps> = ({
  game,
  activeProfile,
  isLinux,
  editingField,
  isSaving,
  localInstallPath,
  localExeName,
  localGlobalLaunchArgs,
  localLaunchArgs,
  localSavePath,
  localPrefixPath,
  setLocalInstallPath,
  setLocalExeName,
  setLocalGlobalLaunchArgs,
  setLocalLaunchArgs,
  setLocalSavePath,
  setLocalPrefixPath,
  startEditing,
  saveField,
  cancelEditing,
  toggleFeature,
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 pl-2">
          File System
        </h3>

        <div className="divide-y divide-border border-t border-border">
          <EditableSetting
            label="Game Path"
            description="Location of the game files."
            displayValue={
              <span className="font-mono text-xs text-foreground">
                {game.installPath}
              </span>
            }
            isEditing={editingField === "installPath"}
            onEdit={() => startEditing("installPath")}
            onSave={() => saveField("installPath")}
            onCancel={cancelEditing}
            isSaving={isSaving}
            path={game.installPath}
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localInstallPath}
                  onChange={e => setLocalInstallPath(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
                <button
                  onClick={async () => {
                    const selected = await open({
                      directory: true,
                      multiple: false,
                      defaultPath: localInstallPath,
                    });
                    if (selected && typeof selected === "string") {
                      setLocalInstallPath(selected);
                    }
                  }}
                  className="p-2 bg-muted hover:bg-muted/80 border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-primary text-xs bg-amber-500/10 p-2 rounded-md">
                <AlertTriangle size={14} />
                <span>Verify integrity after path change.</span>
              </div>
            </div>
          </EditableSetting>

          <EditableSetting
            label="Executable Name"
            description="The main game binary name."
            displayValue={
              <span className="font-mono text-xs text-foreground">
                {game.exeName}
              </span>
            }
            isEditing={editingField === "exeName"}
            onEdit={() => startEditing("exeName")}
            onSave={() => saveField("exeName")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <input
              type="text"
              value={localExeName}
              onChange={e => setLocalExeName(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
              autoFocus
            />
          </EditableSetting>

          <EditableSetting
            label="Global Launch Arguments"
            description="Arguments applied to all profiles."
            displayValue={
              game.launchArgs?.length ? (
                <span className="font-mono text-xs text-foreground">
                  {game.launchArgs.join(" ")}
                </span>
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )
            }
            isEditing={editingField === "globalLaunchArgs"}
            onEdit={() => startEditing("globalLaunchArgs")}
            onSave={() => saveField("globalLaunchArgs")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <input
              type="text"
              value={localGlobalLaunchArgs}
              onChange={e => setLocalGlobalLaunchArgs(e.target.value)}
              placeholder="-popupwindow"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
              autoFocus
            />
          </EditableSetting>

          <EditableSetting
            label="Profile Launch Arguments"
            description="Arguments for this specific loadout."
            displayValue={
              activeProfile.launchArgs?.length ? (
                <span className="font-mono text-xs text-foreground">
                  {activeProfile.launchArgs.join(" ")}
                </span>
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )
            }
            isEditing={editingField === "launchArgs"}
            onEdit={() => startEditing("launchArgs")}
            onSave={() => saveField("launchArgs")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <input
              type="text"
              value={localLaunchArgs}
              onChange={e => setLocalLaunchArgs(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
              autoFocus
            />
          </EditableSetting>

          <EditableSetting
            label="Save Data Path"
            description="Custom path for game saves."
            displayValue={
              activeProfile.saveDataPath ? (
                <span className="font-mono text-xs text-foreground">
                  {activeProfile.saveDataPath}
                </span>
              ) : (
                <span className="text-muted-foreground italic">Default</span>
              )
            }
            isEditing={editingField === "savePath"}
            onEdit={() => startEditing("savePath")}
            onSave={() => saveField("savePath")}
            onCancel={cancelEditing}
            isSaving={isSaving}
            path={activeProfile.saveDataPath || undefined}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={localSavePath}
                onChange={e => setLocalSavePath(e.target.value)}
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                autoFocus
              />
              <button
                onClick={async () => {
                  const selected = await open({
                    directory: true,
                    multiple: false,
                    defaultPath: localSavePath || undefined,
                  });
                  if (selected && typeof selected === "string") {
                    setLocalSavePath(selected);
                  }
                }}
                className="p-2 bg-muted hover:bg-muted/80 border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </EditableSetting>

          {isLinux && (
            <EditableSetting
              label="Wine/Proton Prefix Path"
              description="Compatibility environment directory."
              displayValue={
                <span className="font-mono text-xs text-foreground">
                  {game.prefixPath || "Not set"}
                </span>
              }
              isEditing={editingField === "prefixPath"}
              onEdit={() => startEditing("prefixPath")}
              onSave={() => saveField("prefixPath")}
              onCancel={cancelEditing}
              isSaving={isSaving}
              path={game.prefixPath || undefined}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localPrefixPath}
                  onChange={e => setLocalPrefixPath(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono"
                />
                <button
                  onClick={async () => {
                    const selected = await open({
                      directory: true,
                      multiple: false,
                      defaultPath: localPrefixPath || undefined,
                    });
                    if (selected && typeof selected === "string") {
                      setLocalPrefixPath(selected);
                    }
                  }}
                  className="p-2 bg-muted hover:bg-muted/80 border border-border rounded-md text-muted-foreground transition-colors"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </EditableSetting>
          )}

          <div className="py-4 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-lg transition-colors">
            <div>
              <div className="text-sm font-medium text-foreground">
                Auto-Update
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Keep game updated automatically
              </div>
            </div>
            <button
              onClick={() => toggleFeature("autoupdate")}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative focus:outline-none border border-border",
                game.autoUpdate ? "bg-primary border-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-all shadow-sm",
                  game.autoUpdate ? "right-0.5" : "left-0.5"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
