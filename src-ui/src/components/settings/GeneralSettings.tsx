import React from "react";
import { EditableSetting } from "../ui/EditableSetting";
import { Game } from "../../types";

interface GeneralSettingsProps {
  game: Game;
  editingField: string | null;
  isSaving: boolean;
  localName: string;
  localDeveloper: string;
  localDescription: string;
  localIcon: string;
  localCover: string;
  setLocalName: (v: string) => void;
  setLocalDeveloper: (v: string) => void;
  setLocalDescription: (v: string) => void;
  setLocalIcon: (v: string) => void;
  setLocalCover: (v: string) => void;
  startEditing: (f: string) => void;
  saveField: (f: string) => void;
  cancelEditing: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  game,
  editingField,
  isSaving,
  localName,
  localDeveloper,
  localDescription,
  localIcon,
  localCover,
  setLocalName,
  setLocalDeveloper,
  setLocalDescription,
  setLocalIcon,
  setLocalCover,
  startEditing,
  saveField,
  cancelEditing,
}) => {
  return (
    <div className="space-y-12">
      <div>
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-8">
          Identity
        </h3>

        <EditableSetting
          label="Display Name"
          description="The name shown in your library."
          displayValue={game.name}
          isEditing={editingField === "name"}
          onEdit={() => startEditing("name")}
          onSave={() => saveField("name")}
          onCancel={cancelEditing}
          isSaving={isSaving}
        >
          <input
            type="text"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
            autoFocus
          />
        </EditableSetting>

        <EditableSetting
          label="Developer"
          description="Game developer or publisher."
          displayValue={game.developer}
          isEditing={editingField === "developer"}
          onEdit={() => startEditing("developer")}
          onSave={() => saveField("developer")}
          onCancel={cancelEditing}
          isSaving={isSaving}
        >
          <input
            type="text"
            value={localDeveloper}
            onChange={e => setLocalDeveloper(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        </EditableSetting>

        <EditableSetting
          label="Description"
          description="Brief summary of the game."
          displayValue={<p className="line-clamp-3">{game.description}</p>}
          isEditing={editingField === "description"}
          onEdit={() => startEditing("description")}
          onSave={() => saveField("description")}
          onCancel={cancelEditing}
          isSaving={isSaving}
        >
          <textarea
            value={localDescription}
            onChange={e => setLocalDescription(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[100px]"
            autoFocus
          />
        </EditableSetting>

        <div className="grid grid-cols-2 gap-4">
          <EditableSetting
            label="Icon URL"
            displayValue={
              game.icon ? (
                <img src={game.icon} className="w-8 h-8 rounded" />
              ) : (
                <span className="text-slate-500 italic">None</span>
              )
            }
            isEditing={editingField === "icon"}
            onEdit={() => startEditing("icon")}
            onSave={() => saveField("icon")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <input
              type="text"
              value={localIcon}
              onChange={e => setLocalIcon(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </EditableSetting>

          <EditableSetting
            label="Cover Art"
            displayValue={
              game.coverImage ? (
                <div
                  className="h-8 w-16 bg-cover bg-center rounded"
                  style={{ backgroundImage: `url(${game.coverImage})` }}
                />
              ) : (
                <span className="text-slate-500 italic">None</span>
              )
            }
            isEditing={editingField === "cover"}
            onEdit={() => startEditing("cover")}
            onSave={() => saveField("cover")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <input
              type="text"
              value={localCover}
              onChange={e => setLocalCover(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </EditableSetting>
        </div>
      </div>
    </div>
  );
};
