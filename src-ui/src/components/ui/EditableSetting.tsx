import React from "react";
import { FolderOpen, Edit2, RefreshCw, Check, X } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

interface EditableSettingProps {
  label: string;
  description?: string;
  displayValue: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  isSaving?: boolean;
  path?: string;
}

export const EditableSetting: React.FC<EditableSettingProps> = ({
  label,
  description,
  displayValue,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  children,
  isSaving,
  path,
}) => {
  return (
    <div className="group relative p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-all">
      <div className="flex flex-col gap-3">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">{label}</h4>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed pr-8">
                {description}
              </p>
            )}
          </div>

          {/* Open Folder - Top Right */}
          {path && !isEditing && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (path) api.openPath(path);
              }}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-md transition-all opacity-0 group-hover:opacity-100"
              title="Open Folder"
            >
              <FolderOpen size={18} />
            </button>
          )}
        </div>

        {/* Content Row */}
        <div className="pt-1">
          {isEditing ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              {children}
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={onCancel}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wide rounded-md transition-colors border border-border"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wide rounded-md transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 bg-background/50 p-3 rounded-md border border-border/50">
              <div className="text-sm text-foreground font-mono break-all line-clamp-2">
                {displayValue}
              </div>
              <button
                onClick={onEdit}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border rounded-md transition-all shrink-0 opacity-0 group-hover:opacity-100"
                title="Edit"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
