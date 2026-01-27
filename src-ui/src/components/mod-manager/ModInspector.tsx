import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FileJson,
  FolderOpen,
  Code,
  FileText,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  SortAsc,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { FileNode } from "./types";

// Sub-components
import { ModInspectorInfo } from "./inspector/ModInspectorInfo";
import { ModInspectorFiles } from "./inspector/ModInspectorFiles";
import { ModInspectorEditor } from "./inspector/ModInspectorEditor";

export const ModInspector = ({
  selectedMod,
  tab,
  setTab,
  streamSafe,
  nsfwBehavior,
  deleteMod,
  updateTags,
  devMode,
  onMove,
  isSorted,
  game,
  onValidate,
  showConfirm,
  showPrompt,
}: any) => {
  // File Manager State
  const [fileSystem, setFileSystem] = useState<FileNode[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileNode;
  } | null>(null);
  const [openWithModal, setOpenWithModal] = useState<{ file: FileNode } | null>(
    null
  );

  useEffect(() => {
    if (selectedMod && game) {
      api
        .getModFiles(selectedMod.id)
        .then(fs => {
          setFileSystem(fs as any);
          const rootFolders = (fs as any[])
            .filter(n => n.type === "folder")
            .map(n => n.id);
          setOpenFolders(new Set(rootFolders));
        })
        .catch(e => {
          console.error("Failed to load mod files:", e);
          setFileSystem([]);
        });

      setActiveFileId(null);
      setActiveFileContent("");
    }
  }, [selectedMod, game]);

  const handleFileClick = async (file: FileNode) => {
    if (file.type === "folder") {
      const newSet = new Set(openFolders);
      if (newSet.has(file.id)) newSet.delete(file.id);
      else newSet.add(file.id);
      setOpenFolders(newSet);
      setActiveFileId(file.id);
    } else {
      setActiveFileId(file.id);
      if (file.name.match(/\.(json|ini|txt|cfg|xml|lua|py|js|ts|md)$/i)) {
        try {
          const content = await api.readModFile(selectedMod.id, file.id);
          setActiveFileContent(content);
          setTab("editor");
        } catch (e) {
          console.warn("Cannot read file:", e);
          setActiveFileContent("");
        }
      }
    }
  };

  const handleAction = async (action: string, file: FileNode) => {
    setContextMenu(null);
    if (action === "open_with") {
      setOpenWithModal({ file });
    } else if (action === "delete") {
      if (await showConfirm(`Delete ${file.name}?`, "Confirm Delete")) {
        // TODO: Implement file deletion API
      }
    } else if (action === "rename") {
      const newName = await showPrompt("Rename to:", file.name, "Rename File");
      if (newName && newName !== file.name) {
        // TODO: Implement file rename API
      }
    }
  };

  if (!selectedMod) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-600">
        <FileJson size={64} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium mb-2">No Mod Selected</h3>
        <p className="text-sm">Select a mod to inspect.</p>
      </div>
    );
  }

  const availableTabs = devMode
    ? ["info", "files", "editor"]
    : ["info", "files"];

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        devMode
          ? "bg-slate-900 text-slate-300"
          : "bg-slate-900/40 backdrop-blur-sm"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between shrink-0",
          devMode
            ? "bg-slate-950/50 border-b border-white/10 px-2"
            : "px-6 border-b border-white/5 bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md"
        )}
      >
        <div className="flex items-center">
          {availableTabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={cn(
                "px-4 py-3 flex items-center gap-2 border-b-2 transition-colors focus-visible:outline-none capitalize text-sm font-medium",
                tab === t
                  ? "border-indigo-500 text-white bg-white/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {t === "info" && <FileText size={16} />}
              {t === "files" && <FolderOpen size={16} />}
              {t === "editor" && <Code size={16} />}
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {isSorted ? (
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5 border border-white/5 text-slate-500 cursor-not-allowed">
              <SortAsc size={14} />
              <span className="text-[10px] font-medium">List Sorted</span>
            </div>
          ) : (
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
              <button
                onClick={() => onMove(selectedMod.id, "top")}
                className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
              >
                <ArrowUpToLine size={16} />
              </button>
              <button
                onClick={() => onMove(selectedMod.id, "up")}
                className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => onMove(selectedMod.id, "down")}
                className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => onMove(selectedMod.id, "bottom")}
                className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
              >
                <ArrowDownToLine size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        onClick={() => setContextMenu(null)}
      >
        {tab === "info" && (
          <ModInspectorInfo
            selectedMod={selectedMod}
            game={game}
            devMode={devMode}
            streamSafe={streamSafe}
            updateTags={updateTags}
            onValidate={onValidate}
            deleteMod={deleteMod}
          />
        )}

        {tab === "files" && (
          <ModInspectorFiles
            devMode={devMode}
            fileSystem={fileSystem}
            activeFileId={activeFileId}
            openFolders={openFolders}
            onFileClick={handleFileClick}
            onToggleFolder={id => {
              const newSet = new Set(openFolders);
              if (newSet.has(id)) newSet.delete(id);
              else newSet.add(id);
              setOpenFolders(newSet);
            }}
            onContextMenu={(e, file) =>
              setContextMenu({ x: e.clientX, y: e.clientY, file })
            }
            onNewItem={type => console.log("New", type)}
            onCollapseAll={() => setOpenFolders(new Set())}
          />
        )}

        {tab === "editor" && devMode && (
          <ModInspectorEditor
            activeFileId={activeFileId}
            activeFileContent={activeFileContent}
            onContentChange={setActiveFileContent}
            onReload={() =>
              activeFileId &&
              handleFileClick({
                id: activeFileId,
                name: activeFileId,
                type: "file",
              })
            }
            onSave={async () => {
              if (!activeFileId) return;
              try {
                await api.writeModFile(
                  selectedMod.id,
                  activeFileId,
                  activeFileContent
                );
              } catch (e) {
                alert(e);
              }
            }}
          />
        )}

        {contextMenu && (
          <div
            className="fixed z-50 bg-slate-900 border border-white/10 shadow-2xl rounded-xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => handleAction("rename", contextMenu.file)}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-indigo-500 hover:text-white text-xs font-medium flex items-center gap-2"
            >
              Rename
            </button>
            <button
              onClick={() => handleAction("delete", contextMenu.file)}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/20 text-xs font-medium flex items-center gap-2"
            >
              Delete
            </button>
          </div>
        )}

        <AnimatePresence>
          {openWithModal && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-[28rem] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex justify-between items-center text-white bg-slate-800/50">
                  <span className="text-base font-bold">
                    Open {openWithModal.file.name}
                  </span>
                  <X
                    size={20}
                    className="cursor-pointer text-slate-400 hover:text-white"
                    onClick={() => setOpenWithModal(null)}
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-400 text-center">
                    Select an application to open this file.
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
