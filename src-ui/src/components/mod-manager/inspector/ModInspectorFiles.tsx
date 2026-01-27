import React from "react";
import {
  FolderOpen,
  Plus,
  Folder,
  File,
  FileJson,
  Settings,
  ImageIcon,
  MoreVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { FileNode } from "../types";

interface ModInspectorFilesProps {
  devMode: boolean;
  fileSystem: FileNode[];
  activeFileId: string | null;
  openFolders: Set<string>;
  onFileClick: (file: FileNode) => void;
  onToggleFolder: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onNewItem: (type: "file" | "folder") => void;
  onCollapseAll: () => void;
}

export const ModInspectorFiles: React.FC<ModInspectorFilesProps> = ({
  devMode,
  fileSystem,
  activeFileId,
  openFolders,
  onFileClick,
  onToggleFolder,
  onContextMenu,
  onNewItem,
  onCollapseAll,
}) => {
  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-all duration-200 group relative rounded-lg mx-2 my-0.5",
            activeFileId === node.id
              ? "bg-indigo-500/20 text-indigo-300 shadow-sm"
              : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onFileClick(node)}
          onContextMenu={e => onContextMenu(e, node)}
        >
          <span
            className="opacity-50 hover:opacity-100 p-0.5 rounded hover:bg-white/10"
            onClick={e => {
              e.stopPropagation();
              if (node.type === "folder") onToggleFolder(node.id);
            }}
          >
            {node.type === "folder" &&
              (openFolders.has(node.id) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              ))}
            {node.type === "file" && <div className="w-3.5" />}
          </span>

          {node.type === "folder" ? (
            <Folder
              size={16}
              className={
                openFolders.has(node.id)
                  ? "text-indigo-400"
                  : "text-amber-400/80"
              }
            />
          ) : node.name.endsWith(".json") ? (
            <FileJson size={16} className="text-yellow-400" />
          ) : node.name.endsWith(".ini") ? (
            <Settings size={16} className="text-slate-400" />
          ) : node.name.endsWith(".dds") || node.name.endsWith(".png") ? (
            <ImageIcon size={16} className="text-purple-400" />
          ) : (
            <File size={16} className="text-blue-400" />
          )}

          <span className="truncate text-[15px] font-medium leading-normal">
            {node.name}
          </span>

          <button
            className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
            onClick={e => {
              e.stopPropagation();
              onContextMenu(e, node);
            }}
          >
            <MoreVertical size={14} />
          </button>
        </div>
        {node.type === "folder" &&
          openFolders.has(node.id) &&
          node.children &&
          renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {devMode && (
        <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-slate-950/50 shrink-0">
          <button
            onClick={() => onNewItem("file")}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300"
            title="New File"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => onNewItem("folder")}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300"
            title="New Folder"
          >
            <FolderOpen size={18} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button
            onClick={onCollapseAll}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300"
            title="Collapse All"
          >
            Collapse
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {renderTree(fileSystem)}
      </div>
    </div>
  );
};
