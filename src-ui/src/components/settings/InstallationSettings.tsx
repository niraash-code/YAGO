import React from "react";
import { FolderOpen, AlertTriangle } from "lucide-react";
import { EditableSetting } from "../ui/EditableSetting";
import { LoaderManager } from "./LoaderManager";
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
    <div className="space-y-12">
      <div>
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-8">
          File System
        </h3>

        <EditableSetting
          label="Game Path"
          description="Location of the game files. Changing this may break the game."
          displayValue={
            <span className="font-mono text-xs">{game.installPath}</span>
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
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
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
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 p-2 rounded">
              <AlertTriangle size={12} />
              <span>Warning: Ensure files exist at this location.</span>
            </div>
          </div>
        </EditableSetting>

        <EditableSetting
          label="Executable Name"
          description="The main game binary name."
          displayValue={
            <span className="font-mono text-xs">{game.exeName}</span>
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
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            autoFocus
          />
        </EditableSetting>

        <EditableSetting
          label="Global Launch Arguments"
          description="Arguments applied to all profiles for this game."
          displayValue={
            game.launchArgs?.length ? (
              <span className="font-mono text-xs">
                {game.launchArgs.join(" ")}
              </span>
            ) : (
              <span className="text-slate-500 italic">None</span>
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
            placeholder="-popupwindow -screen-width 1920"
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            autoFocus
          />
        </EditableSetting>

        <EditableSetting
          label="Profile Launch Arguments"
          description="Command line arguments passed to the game on startup."
          displayValue={
            activeProfile.launchArgs?.length ? (
              <span className="font-mono text-xs">
                {activeProfile.launchArgs.join(" ")}
              </span>
            ) : (
              <span className="text-slate-500 italic">None</span>
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
            placeholder="-popupwindow -screen-width 1920"
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            autoFocus
          />
        </EditableSetting>

        <EditableSetting
          label="Save Data Path"
          description="Custom path for game saves. Leave empty to use default."
          displayValue={
            activeProfile.saveDataPath ? (
              <span className="font-mono text-xs">
                {activeProfile.saveDataPath}
              </span>
            ) : (
              <span className="text-slate-500 italic">Default</span>
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
              placeholder="C:\Users\You\Saved Games..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
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
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </EditableSetting>

        {isLinux && (
          <EditableSetting
            label="Wine/Proton Prefix Path"
            description="Directory for compatibility files. Automatically created by default."
            displayValue={
              <span className="font-mono text-xs">
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
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
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
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </EditableSetting>
        )}

        <div className="py-6 flex items-center justify-between group transition-all border-b border-white/5">
          <div>
            <div className="text-base font-bold text-white uppercase tracking-tight">Auto-Update</div>
            <div className="text-sm text-slate-500 mt-1 font-medium">
              Keep game updated automatically
            </div>
          </div>
          <button
            onClick={() => toggleFeature("autoupdate")}
            className={cn(
              "w-11 h-6 rounded-full transition-all relative focus:outline-none",
              game.autoUpdate ? "bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]" : "bg-slate-800"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                game.autoUpdate ? "right-1" : "left-1"
              )}
            />
          </button>
        </div>

        <div className="py-8">
          <LoaderManager gameId={game.id} />
        </div>
      </div>
    </div>
  );
};
