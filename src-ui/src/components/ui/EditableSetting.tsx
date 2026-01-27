import React from "react";
import { FolderOpen, Edit2, RefreshCw, Check, X } from "lucide-react";
import { api } from "../../lib/api";

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
    <div className="bg-white/5 rounded-xl p-4 border border-white/5 transition-colors hover:bg-white/[0.07] relative group/card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white mb-0.5 pr-8">
            {label}
          </div>
          {description && (
            <div className="text-xs text-slate-400 mb-2 leading-relaxed">
              {description}
            </div>
          )}

          {path && !isEditing && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (path) api.openPath(path);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Open Folder"
            >
              <FolderOpen size={16} />
            </button>
          )}

          <div className="mt-2">
            {isEditing ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                {children}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Save
                  </button>
                  <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group gap-4">
                <div className="text-sm text-slate-200 font-mono break-all line-clamp-2">
                  {displayValue}
                </div>
                <button
                  onClick={onEdit}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                  title="Edit Setting"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
