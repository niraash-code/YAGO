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
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 pl-2">
          Identity
        </h3>

        <div className="space-y-2">
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
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none font-medium"
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
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              autoFocus
            />
          </EditableSetting>

          <EditableSetting
            label="Description"
            description="Brief summary of the game."
            displayValue={
              <p className="line-clamp-3 text-xs leading-relaxed">
                {game.description}
              </p>
            }
            isEditing={editingField === "description"}
            onEdit={() => startEditing("description")}
            onSave={() => saveField("description")}
            onCancel={cancelEditing}
            isSaving={isSaving}
          >
            <textarea
              value={localDescription}
              onChange={e => setLocalDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none min-h-[100px]"
              autoFocus
            />
          </EditableSetting>
        </div>
      </div>
    </div>
  );
};
