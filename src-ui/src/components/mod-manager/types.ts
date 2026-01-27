import { Mod } from "../../types";

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  children?: FileNode[];
  content?: string;
}

export const NSFW_TAGS = [
  "nsfw",
  "nude",
  "bikini",
  "skimpy",
  "hentai",
  "18+",
  "explicit",
];

export const isModNSFW = (mod: Mod) =>
  mod.tags.some(tag => NSFW_TAGS.includes(tag.toLowerCase()));

export const getTagStyle = (tag: string) => {
  const lower = tag.toLowerCase();
  if (NSFW_TAGS.includes(lower))
    return "bg-red-500/10 text-red-400 border-red-500/20";
  if (["ui", "hud", "interface", "menu"].includes(lower))
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (["texture", "environment", "map", "world", "landscape"].includes(lower))
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (["audio", "sound", "music", "voice"].includes(lower))
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (["shader", "reshade", "visuals", "graphics"].includes(lower))
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (["character", "outfit", "skin", "model"].includes(lower))
    return "bg-pink-500/10 text-pink-400 border-pink-500/20";
  if (["scripts", "tools", "cheat", "utility"].includes(lower))
    return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
};

export const parseSize = (sizeStr: string): number => {
  const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const mult = { GB: 1024 * 1024 * 1024, MB: 1024 * 1024, KB: 1024, B: 1 };
  return val * (mult[unit as keyof typeof mult] || 1);
};
