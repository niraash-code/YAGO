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
  const isRaiden = name.toLowerCase().includes("raiden");

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ 
        y: -8, 
        scale: 1.05,
        transition: { type: "spring", stiffness: 400, damping: 15 }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "group relative aspect-[3/4] rounded-2xl overflow-hidden glass-card text-left",
        isRaiden && "hover:shadow-[0_0_30px_var(--primary)]"
      )}
    >
      <div className="absolute inset-0 z-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110",
              shouldBlur && "grayscale opacity-40 blur-lg"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <User size={48} className="text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-80" />
      </div>

      {/* Decorative Glow for high-tier characters */}
      {isRaiden && (
        <motion.div
          animate={{
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,var(--primary),transparent_70%)] opacity-20 z-0"
        />
      )}

      <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 z-10">
        {activeCount > 1 && (
          <div className="px-2.5 py-1 rounded-full glass border-primary/30 text-[9px] font-black uppercase tracking-[0.15em] text-primary-foreground shadow-xl flex items-center gap-1.5">
            <Zap size={10} className="text-primary fill-primary" />
            Active
          </div>
        )}
        {isNSFW && (
          <div className="px-2.5 py-1 rounded-full bg-destructive/80 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.15em] text-destructive-foreground shadow-xl">
            Sovereign
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <motion.div
          initial={false}
          className="space-y-1"
        >
          <h3
            className={cn(
              "text-2xl font-black text-foreground tracking-tighter uppercase italic leading-none drop-shadow-md",
              shouldBlur && "blur-md select-none"
            )}
          >
            {name}
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <div className="flex items-center gap-1.5 group-hover:text-primary transition-colors">
              <Layers size={12} />
              <span>
                {activeCount} / {totalCount} Variants
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Glass Overlay on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
    </motion.button>
  );
};
