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
import { useUiStore } from "../../store/uiStore";

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
  const { showAlert } = useUiStore();

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
      }
    } else if (action === "rename") {
      const newName = await showPrompt("Rename to:", file.name, "Rename File");
      if (newName && newName !== file.name) {
      }
    }
  };

  if (!selectedMod) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-card">
        <FileJson size={64} className="mb-4 opacity-20" />
        <h3 className="text-lg font-black uppercase italic tracking-tighter">
          No Mod Selected
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-2">
          Select a mod to inspect.
        </p>
      </div>
    );
  }

  const availableTabs = devMode
    ? ["info", "files", "editor"]
    : ["info", "files"];

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between shrink-0 px-6 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center">
          {availableTabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={cn(
                "px-4 py-3 flex items-center gap-2 border-b-2 transition-colors focus-visible:outline-none capitalize text-[10px] font-black uppercase tracking-widest",
                tab === t
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t === "info" && <FileText size={14} />}
              {t === "files" && <FolderOpen size={14} />}
              {t === "editor" && <Code size={14} />}
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {isSorted ? (
            <div className="flex items-center gap-1 bg-card rounded-lg px-2 py-1.5 border border-border text-muted-foreground cursor-not-allowed">
              <SortAsc size={14} />
              <span className="text-[9px] font-black uppercase tracking-tighter">
                Sorted
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-card rounded-lg p-0.5 border border-border">
              <button
                onClick={() => onMove(selectedMod.id, "top")}
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowUpToLine size={16} />
              </button>
              <button
                onClick={() => onMove(selectedMod.id, "up")}
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => onMove(selectedMod.id, "down")}
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => onMove(selectedMod.id, "bottom")}
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
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
                showAlert(String(e), "Error");
              }
            }}
          />
        )}

        {contextMenu && (
          <div
            className="fixed z-50 bg-card border border-border shadow-2xl rounded-lg py-1 min-w-[160px] overflow-hidden"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="px-1">
              <button
                onClick={() => handleAction("rename", contextMenu.file)}
                className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-bold uppercase tracking-widest rounded-md transition-all"
              >
                Rename
              </button>
              <button
                onClick={() => handleAction("delete", contextMenu.file)}
                className="w-full text-left px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-bold uppercase tracking-widest rounded-md transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {openWithModal && (
            <div className="fixed inset-0 z-[100] bg-background/90 flex items-center justify-center">
              <div className="bg-card border border-border rounded-lg shadow-2xl w-[28rem] overflow-hidden">
                <div className="p-5 border-b border-border flex justify-between items-center text-foreground bg-background">
                  <span className="text-sm font-black uppercase italic tracking-tighter">
                    Open {openWithModal.file.name}
                  </span>
                  <X
                    size={20}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setOpenWithModal(null)}
                  />
                </div>
                <div className="p-10 bg-card">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                    Select application to open file.
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
