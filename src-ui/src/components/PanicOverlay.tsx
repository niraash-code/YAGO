import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export const PanicOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handlePanic = () => setVisible(true);
    window.addEventListener("YAGO_PANIC", handlePanic);
    return () => window.removeEventListener("YAGO_PANIC", handlePanic);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-red-500 animate-in fade-in duration-200">
      <ShieldAlert size={128} className="mb-8 animate-pulse" />
      <h1 className="text-6xl font-black tracking-tighter mb-4">
        SAFE MODE ENGAGED
      </h1>
      <p className="text-xl text-red-400/80 font-mono uppercase">
        Game Terminated. Content Purged.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="mt-12 px-6 py-2 border border-red-500/30 text-red-500/50 hover:text-red-500 hover:border-red-500 transition-colors font-mono text-sm"
      >
        [DISMISS OVERLAY]
      </button>
    </div>
  );
};
