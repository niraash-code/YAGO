import React from "react";
import {
  ArrowLeft,
  Layers,
  Terminal,
  List,
  LayoutGrid,
  Search,
  X,
  Plus,
  RefreshCw,
  Folder,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface ModManagerHeaderProps {
  modCount: number;
  devMode: boolean;
  setDevMode: (v: boolean) => void;
  viewMode: "list" | "grid";
  setViewMode: (v: "list" | "grid") => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isImporting: boolean;
  isRedeploying?: boolean;
  onImport: () => void;
  onImportFolder?: () => void;
  onRedeploy?: () => void;
  onClose: () => void;
}

export const ModManagerHeader: React.FC<ModManagerHeaderProps> = ({
  modCount,
  devMode,
  setDevMode,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  isImporting,
  isRedeploying,
  onImport,
  onImportFolder,
  onRedeploy,
  onClose,
}) => {
  return (
    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-foreground flex items-center gap-3 uppercase italic tracking-tighter">
          <Layers className="text-primary" size={20} />
          Mod Manager
          <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            {modCount}
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded transition-all",
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded transition-all",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid size={18} />
          </button>
        </div>

        <button
          onClick={() => setDevMode(!devMode)}
          className={cn(
            "p-2.5 rounded-lg border transition-all",
            devMode
              ? "bg-muted border-primary text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Terminal size={20} />
        </button>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            placeholder="Search mods..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-card border border-border rounded-lg pl-10 pr-10 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-56 font-bold"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={onImport}
          disabled={isImporting}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {isImporting ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          <span>{isImporting ? "Importing..." : "Add Mod"}</span>
        </button>

        {onImportFolder && (
          <button
            onClick={onImportFolder}
            disabled={isImporting}
            className="p-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-all flex items-center gap-2 group disabled:opacity-50"
            title="Import from Folder (Migration)"
          >
            <Folder size={18} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-widest hidden lg:inline">
              Import Folder
            </span>
          </button>
        )}

        {onRedeploy && (
          <button
            onClick={onRedeploy}
            disabled={isRedeploying}
            className="p-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-all flex items-center gap-2 group disabled:opacity-50"
            title="Reload Mods & Refresh In-Game (F10)"
          >
            <RefreshCw
              size={18}
              className={cn(
                "text-primary transition-transform group-hover:rotate-180 duration-500",
                isRedeploying && "animate-spin"
              )}
            />
            <span className="text-xs font-black uppercase tracking-widest hidden lg:inline">
              Reload
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
