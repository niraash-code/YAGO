import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VibeBackgroundProps {
  vibe?: string;
}

export const VibeBackground: React.FC<VibeBackgroundProps> = ({ vibe }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <AnimatePresence mode="wait">
        {vibe === "raiden" ? (
          <motion.div
            key="raiden-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--primary),transparent_70%)] opacity-10"
          >
            {/* Animated lightning-like pulses */}
            <motion.div
              animate={{
                opacity: [0, 0.3, 0, 0.1, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                times: [0, 0.1, 0.2, 0.8, 1],
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,var(--primary),transparent_50%)] opacity-20"
            />
            <motion.div
              animate={{
                opacity: [0, 0.1, 0, 0.2, 0],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                times: [0, 0.3, 0.5, 0.7, 1],
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,var(--primary),transparent_50%)] opacity-10"
            />
          </motion.div>
        ) : (
          <motion.div
            key="default-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,var(--primary),transparent_50%)] opacity-5"
          />
        )}
      </AnimatePresence>
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjAwIDIwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSdub2lzZUZpbHRlcic+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuNjUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbm9pc2VGaWx0ZXInKScvPjwvc3ZnPg==')]" />
    </div>
  );
};
