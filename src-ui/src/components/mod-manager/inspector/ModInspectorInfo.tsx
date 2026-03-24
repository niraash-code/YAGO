import React, { useState } from "react";
import { motion } from "framer-motion";
import {
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
  Image as ImageIcon,
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
  <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-black">
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
    character: mod.compatibility?.character || "Unknown",
    type: "character",
    hashes: [],
    fingerprint: mod.compatibility?.fingerprint || "",
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

  const isNsfw = isModNSFW(selectedMod);
  const shouldBlur = isNsfw && streamSafe;

  if (devMode) {
    return (
      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-card">
        <div className="flex gap-5 mb-4 pb-6 border-b border-border">
          <div className="w-20 h-20 bg-background rounded border border-border flex items-center justify-center overflow-hidden shrink-0">
            {selectedMod.imageUrl ? (
              <img
                src={selectedMod.imageUrl}
                className={cn(
                  "w-full h-full object-cover",
                  shouldBlur && "grayscale opacity-20"
                )}
                alt=""
              />
            ) : (
              <ImageIcon size={32} className="text-muted-foreground/20" />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-xl font-black text-foreground truncate uppercase italic tracking-tighter">
              {selectedMod.name}
            </div>
            <div className="text-primary font-mono text-[10px] mt-1 select-all bg-background px-2 py-1 rounded inline-block border border-border font-bold uppercase">
              {selectedMod.id}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Raw Metadata
          </div>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                JSON.stringify(generateManifest(selectedMod, game), null, 2)
              )
            }
            className="text-primary hover:text-primary/80 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
          >
            <Copy size={12} /> Copy JSON
          </button>
        </div>
        <pre className="font-mono text-[10px] leading-relaxed bg-background p-4 rounded border border-border text-muted-foreground overflow-x-auto">
          {JSON.stringify(generateManifest(selectedMod, game), null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-card"
    >
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border group flex items-center justify-center bg-muted/10">
        {selectedMod.imageUrl ? (
          <img
            src={selectedMod.imageUrl}
            className={cn(
              "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105",
              shouldBlur && "grayscale opacity-40"
            )}
            alt=""
          />
        ) : (
          <ImageIcon size={64} className="text-muted-foreground/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2
            className={cn(
              "text-3xl font-black text-foreground mb-2 uppercase italic tracking-tighter",
              shouldBlur && "blur-sm select-none"
            )}
          >
            {selectedMod.name}
          </h2>
          <div className="flex items-center gap-4 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <UserAvatar name={selectedMod.author} /> {selectedMod.author}
            </span>
            <span className="font-mono bg-background px-2 py-0.5 rounded border border-border">
              v{selectedMod.version}
            </span>
          </div>
        </div>
      </div>

      <p
        className={cn(
          "text-muted-foreground bg-background p-6 rounded-lg border border-border leading-relaxed font-bold text-xs uppercase tracking-tight",
          shouldBlur ? "blur-sm select-none opacity-50" : ""
        )}
      >
        {selectedMod.description}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded border border-border flex items-center gap-4">
          <HardDrive size={20} className="text-primary" />
          <div>
            <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
              Size
            </div>
            <div className="text-xs text-foreground font-mono font-bold">
              {selectedMod.size}
            </div>
          </div>
        </div>
        <div className="p-4 bg-background rounded border border-border flex items-center gap-4">
          <Calendar size={20} className="text-primary" />
          <div>
            <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
              Updated
            </div>
            <div className="text-xs text-foreground font-bold uppercase tracking-widest">
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
          className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded text-primary-foreground">
              <Globe size={18} />
            </div>
            <div>
              <div className="text-[10px] font-black text-foreground uppercase tracking-widest">
                Mod Homepage
              </div>
              <div className="text-[10px] text-primary/60 truncate max-w-[200px] font-bold">
                {selectedMod.url}
              </div>
            </div>
          </div>
          <ExternalLink
            size={16}
            className="text-primary group-hover:text-primary/80"
          />
        </a>
      )}

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Tag size={14} /> Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedMod.tags.map((tag: string) => (
            <span
              key={tag}
              className={`px-3 py-1 rounded border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 group ${getTagStyle(tag)}`}
            >
              {tag}
              <button
                onClick={() =>
                  updateTags(
                    selectedMod.id,
                    selectedMod.tags.filter(t => t !== tag)
                  )
                }
                className="hover:bg-background/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {isAddingTag ? (
            <input
              autoFocus
              className="bg-background border border-primary rounded px-2 py-1 text-[9px] font-black uppercase text-foreground outline-none"
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
              className="px-3 py-1 rounded border border-dashed border-border text-muted-foreground hover:text-foreground text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Plus size={12} /> Add Tag
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-3">
        {selectedMod.modType === "character" ? (
          <div className="p-4 bg-primary/5 rounded border border-primary/10 space-y-3">
            <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} /> Character Integration Tools
            </div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase">
              This character skin is isolated via the YAGO Router.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-black uppercase rounded transition-colors">
                Re-index Buffers
              </button>
              <button className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-black uppercase rounded transition-colors">
                Fix Vertex Groups
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-primary/5 rounded border border-blue-500/10 space-y-2">
            <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} /> Global UI Protocol
            </div>
            <p className="text-[9px] text-muted-foreground font-bold uppercase">
              Persistent UI enhancement. Bypasses character gates.
            </p>
          </div>
        )}

        <button
          onClick={() => onValidate(selectedMod.id)}
          className="w-full py-3.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          <Zap size={16} /> Validate Logic
        </button>
        <button
          onClick={() => deleteMod(selectedMod.id)}
          className="w-full py-3.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={16} /> Uninstall Mod
        </button>
      </div>
    </motion.div>
  );
};
