import React from "react";
import { motion } from "framer-motion";
import { Layers, Zap, User } from "lucide-react";
import { cn } from "../../lib/utils";

interface CharacterCardProps {
  name: string;
  activeCount: number;
  totalCount: number;
  thumbnailUrl?: string;
  isNSFW?: boolean;
  streamSafe?: boolean;
  onClick: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  name,
  activeCount,
  totalCount,
  thumbnailUrl,
  isNSFW,
  streamSafe,
  onClick,
}) => {
  const shouldBlur = isNSFW && streamSafe;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-white/5 hover:border-indigo-500/50 transition-all shadow-xl text-left"
    >
      {/* Dynamic Portrait Background */}
      <div className="absolute inset-0 z-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
              shouldBlur && "blur-2xl opacity-50 grayscale"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <User size={48} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
      </div>

      {/* Badges Overlay */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 z-10">
        {activeCount > 1 && (
          <div className="px-2 py-1 rounded-lg bg-indigo-600/90 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white shadow-lg flex items-center gap-1.5 ring-1 ring-white/20">
            <Zap size={10} fill="currentColor" />
            Cycle Active
          </div>
        )}
        {isNSFW && (
          <div className="px-2 py-1 rounded-lg bg-red-600/90 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white shadow-lg ring-1 ring-white/20">
            18+
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h3
          className={cn(
            "text-xl font-bold text-white tracking-tight mb-1 drop-shadow-md truncate",
            shouldBlur && "blur-sm select-none"
          )}
        >
          {name}
        </h3>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <Layers size={12} className="text-indigo-400" />
            <span>
              {activeCount} / {totalCount} Skins
            </span>
          </div>
        </div>
      </div>

      {/* Hover Glow */}
      <div className="absolute inset-0 border-2 border-indigo-500/0 group-hover:border-indigo-500/30 rounded-2xl transition-all duration-300 pointer-events-none z-20" />
    </motion.button>
  );
};
