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
    <div className="py-6 first:pt-0 last:pb-0 relative group/card border-b border-white/5 last:border-0 transition-colors">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1.5">
            <div className="text-base font-bold text-white uppercase tracking-tight">
              {label}
            </div>
            {path && !isEditing && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (path) api.openPath(path);
                }}
                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all active:scale-90"
                title="Explore Files"
              >
                <FolderOpen size={18} />
              </button>
            )}
          </div>
          {description && (
            <div className="text-sm text-slate-400 mb-4 leading-relaxed font-medium pr-10">
              {description}
            </div>
          )}

          <div className="mt-1">
            {isEditing ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                {children}
                <div className="flex items-center gap-2 mt-5">
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group gap-4 bg-white/[0.03] hover:bg-white/5 p-4 rounded-xl border border-white/5 transition-colors">
                <div className="text-sm text-slate-300 font-mono break-all line-clamp-2">
                  {displayValue}
                </div>
                <button
                  onClick={onEdit}
                  className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0 active:scale-90"
                  title="Modify"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
