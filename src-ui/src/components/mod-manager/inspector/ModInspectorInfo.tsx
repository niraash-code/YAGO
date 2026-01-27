import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileJson,
  EyeOff,
  Copy,
  Globe,
  ExternalLink,
  Tag,
  Plus,
  X,
  Zap,
  Trash2,
  HardDrive,
  Calendar,
} from "lucide-react";
import { Mod, Game } from "../../../types";
import { cn } from "../../../lib/utils";
import { isModNSFW, getTagStyle } from "../types";

interface ModInspectorInfoProps {
  selectedMod: Mod;
  game: Game;
  devMode: boolean;
  streamSafe: boolean;
  updateTags: (id: string, tags: string[]) => void;
  onValidate: (id: string) => void;
  deleteMod: (id: string) => void;
}

const UserAvatar = ({ name }: { name: string }) => (
  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold shadow-md ring-1 ring-white/10">
    {name.charAt(0).toUpperCase()}
  </div>
);

const generateManifest = (mod: Mod, game: Game) => ({
  $schema: "http://json-schema.org/draft-07/schema#",
  title: `Manifest: ${mod.name}`,
  schema_version: 1.3,
  meta: {
    name: mod.name,
    version: mod.version,
    author: mod.author,
    description: mod.description,
    url: mod.url || `https://yago.app/mods/${mod.id}`,
    update_url: `https://api.yago.app/mods/${mod.id}/update.json`,
    preview_image: "preview.png",
  },
  compatibility: {
    game: game.name,
    character: mod.compatibility.character,
    type: "character",
    hashes: [],
    fingerprint: mod.compatibility.fingerprint,
    relations: { requires: [], overrides: [] },
  },
  config: {
    tags: mod.tags,
    keybinds: {
      Toggle: { label: "Toggle Mod", variable: "kToggle" },
      Reload: { label: "Reload Assets", variable: "kReload" },
    },
    sub_mods: [],
  },
});

export const ModInspectorInfo: React.FC<ModInspectorInfoProps> = ({
  selectedMod,
  game,
  devMode,
  streamSafe,
  updateTags,
  onValidate,
  deleteMod,
}) => {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const isNsfw = isModNSFW(selectedMod);
  const shouldBlur = isNsfw && streamSafe;

  if (devMode) {
    return (
      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex gap-5 mb-4 pb-6 border-b border-white/10">
          <div className="w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden relative shrink-0 border border-white/10 shadow-lg">
            {shouldBlur ? (
              <>
                <img
                  src={selectedMod.imageUrl}
                  className="w-full h-full object-cover opacity-20 blur-sm"
                  alt=""
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <EyeOff size={20} className="text-slate-500" />
                </div>
              </>
            ) : (
              <img
                src={selectedMod.imageUrl}
                className="w-full h-full object-cover"
                alt=""
              />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-xl font-bold text-white truncate">
              {selectedMod.name}
            </div>
            <div className="text-slate-500 font-mono text-sm mt-1 select-all bg-slate-950/50 px-2 py-1 rounded inline-block border border-white/5">
              {selectedMod.id}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Raw Metadata
          </div>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                JSON.stringify(generateManifest(selectedMod, game), null, 2)
              )
            }
            className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
          >
            <Copy size={12} /> Copy JSON
          </button>
        </div>
        <pre className="font-mono text-xs leading-relaxed bg-slate-950 p-4 rounded-xl border border-white/10 text-slate-300 overflow-x-auto shadow-inner">
          {JSON.stringify(generateManifest(selectedMod, game), null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar"
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl group">
        {shouldBlur ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 relative">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md z-10"></div>
            <EyeOff size={48} className="relative z-20 text-slate-400" />
          </div>
        ) : (
          <>
            <img
              src={selectedMod.imageUrl}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2
            className={cn(
              "text-3xl font-bold text-white mb-2",
              shouldBlur ? "blur-sm" : ""
            )}
          >
            {selectedMod.name}
          </h2>
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-2 font-medium">
              <UserAvatar name={selectedMod.author} /> {selectedMod.author}
            </span>
            <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-sm">
              v{selectedMod.version}
            </span>
          </div>
        </div>
      </div>

      <p
        className={cn(
          "text-slate-300 bg-white/5 p-6 rounded-2xl border border-white/5 leading-relaxed",
          shouldBlur ? "blur-sm select-none opacity-50" : ""
        )}
      >
        {selectedMod.description}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex items-center gap-4 shadow-sm">
          <HardDrive size={20} className="text-slate-400" />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">
              Size
            </div>
            <div className="text-sm text-slate-200 font-mono">
              {selectedMod.size}
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-800/40 rounded-xl border border-white/5 flex items-center gap-4 shadow-sm">
          <Calendar size={20} className="text-slate-400" />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">
              Updated
            </div>
            <div className="text-sm text-slate-200">
              {selectedMod.updated
                ? new Date(selectedMod.updated).toLocaleDateString()
                : "Unknown"}
            </div>
          </div>
        </div>
      </div>

      {selectedMod.url && (
        <a
          href={selectedMod.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg text-white">
              <Globe size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-indigo-200">
                Mod Homepage
              </div>
              <div className="text-xs text-indigo-300/60 truncate max-w-[200px]">
                {selectedMod.url}
              </div>
            </div>
          </div>
          <ExternalLink
            size={16}
            className="text-indigo-400 group-hover:text-indigo-300"
          />
        </a>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Tag size={14} /> Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedMod.tags.map((tag: string) => (
            <span
              key={tag}
              className={`px-3 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 group ${getTagStyle(tag)}`}
            >
              {tag}
              <button
                onClick={() =>
                  updateTags(
                    selectedMod.id,
                    selectedMod.tags.filter(t => t !== tag)
                  )
                }
                className="hover:bg-black/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {isAddingTag ? (
            <input
              autoFocus
              className="bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white outline-none"
              onBlur={() => setIsAddingTag(false)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value;
                  if (val)
                    updateTags(selectedMod.id, [...selectedMod.tags, val]);
                  setIsAddingTag(false);
                }
              }}
            />
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="px-3 py-1 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:text-white text-xs font-medium flex items-center gap-2"
            >
              <Plus size={12} /> Add Tag
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-3">
        <button
          onClick={() => onValidate(selectedMod.id)}
          className="w-full py-3.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Zap size={16} /> Validate Logic
        </button>
        <button
          onClick={() => deleteMod(selectedMod.id)}
          className="w-full py-3.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={16} /> Uninstall Mod
        </button>
      </div>
    </motion.div>
  );
};
