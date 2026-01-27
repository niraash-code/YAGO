import React from "react";
import { FileCode, RotateCcw, Save } from "lucide-react";

interface ModInspectorEditorProps {
  activeFileId: string | null;
  activeFileContent: string;
  onContentChange: (content: string) => void;
  onReload: () => void;
  onSave: () => void;
}

export const ModInspectorEditor: React.FC<ModInspectorEditorProps> = ({
  activeFileId,
  activeFileContent,
  onContentChange,
  onReload,
  onSave,
}) => {
  if (!activeFileId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <FileCode size={64} className="mb-6 opacity-20" />
        <p className="text-xl font-medium mb-2">No File Selected</p>
        <p className="text-base">
          Select a text-based file from the explorer to edit.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      <div className="h-12 bg-slate-900 flex items-center justify-end px-4 gap-2 border-b border-white/10 shrink-0">
        <span className="mr-auto text-xs text-slate-400 truncate flex items-center gap-2">
          <FileCode size={14} className="text-indigo-400" /> {activeFileId}
        </span>
        <button
          className="p-1.5 hover:bg-white/10 rounded text-slate-300"
          onClick={onReload}
          title="Reload"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded transition-colors"
          onClick={onSave}
          title="Save"
        >
          <Save size={16} />
        </button>
      </div>
      <textarea
        value={activeFileContent}
        onChange={e => onContentChange(e.target.value)}
        spellCheck={false}
        className="flex-1 bg-slate-950 text-slate-300 p-6 resize-none focus:outline-none leading-relaxed font-mono text-sm"
      />
    </div>
  );
};
