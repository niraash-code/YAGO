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
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <FileCode size={64} className="mb-6 opacity-20" />
        <p className="text-xl font-medium mb-2">No File Selected</p>
        <p className="text-base">
          Select a text-based file from the explorer to edit.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="h-12 bg-muted/20 flex items-center justify-end px-4 gap-2 border-b border-border shrink-0">
        <span className="mr-auto text-xs text-muted-foreground truncate flex items-center gap-2">
          <FileCode size={14} className="text-primary" /> {activeFileId}
        </span>
        <button
          className="p-1.5 hover:bg-muted/10 rounded text-foreground"
          onClick={onReload}
          title="Reload"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="p-1.5 hover:bg-primary/20 text-primary rounded transition-colors"
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
        className="flex-1 bg-background text-foreground p-6 resize-none focus:outline-none leading-relaxed font-mono text-sm"
      />
    </div>
  );
};
