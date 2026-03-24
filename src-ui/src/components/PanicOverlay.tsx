import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { listen } from "@tauri-apps/api/event";

export const PanicOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let unlisten: any;

    const setupListener = async () => {
      unlisten = await listen("PANIC_TRIGGERED", () => {
        setVisible(true);
      });
    };

    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center text-destructive animate-in fade-in duration-200">
      <ShieldAlert size={128} className="mb-8 animate-pulse text-destructive" />
      <h1 className="text-6xl font-black tracking-tighter mb-4 text-foreground uppercase italic">
        SAFE MODE ENGAGED
      </h1>
      <p className="text-xl text-destructive font-black uppercase tracking-widest">
        Game Terminated. Content Purged.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="mt-12 px-8 py-3 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-black text-sm uppercase tracking-[0.2em]"
      >
        [DISMISS OVERLAY]
      </button>
    </div>
  );
};
