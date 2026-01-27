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
  Database,
  FilePlus,
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
  onImport: () => void;
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
  onImport,
  onClose,
}) => {
  return (
    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/60 backdrop-blur-md z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white flex items-center gap-3">
          <Layers className="text-indigo-400" size={20} />
          Mod Manager
          <span className="text-xs font-mono font-normal text-slate-500 px-2 py-0.5 rounded bg-white/5 border border-white/5">
            {modCount}
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {devMode && (
          <div className="flex items-center gap-1 bg-slate-800/50 border border-white/5 rounded-lg p-1 mr-2">
            <button className="p-2 hover:bg-white/10 rounded-md text-slate-400 hover:text-white">
              <FilePlus size={18} />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-md text-slate-400 hover:text-white">
              <Database size={18} />
            </button>
          </div>
        )}

        <div className="flex items-center bg-slate-800/50 border border-white/5 rounded-lg p-1 mr-2">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-md transition-all",
              viewMode === "list"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
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
              ? "bg-slate-800 border-indigo-500 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
              : "border-white/5 text-slate-500 hover:text-white"
          )}
        >
          <Terminal size={20} />
        </button>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-56"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={onImport}
          disabled={isImporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {isImporting ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          <span>{isImporting ? "Importing..." : "Add"}</span>
        </button>
      </div>
    </div>
  );
};
