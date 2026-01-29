import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import TitleBar from "../TitleBar";
import Sidebar from "../Sidebar";
import { Game } from "../../types";

interface AppLayoutProps {
  selectedGameId: string | null;
  backgroundStyle: React.CSSProperties;
  currentView: "overview" | "mods" | "skins";
  setCurrentView: (v: "overview" | "mods" | "skins") => void;
  onOpenAddGame: () => void;
  onOpenAppSettings: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  selectedGameId,
  backgroundStyle,
  currentView,
  setCurrentView,
  onOpenAddGame,
  onOpenAppSettings,
  children,
}) => {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden font-sans selection:bg-indigo-500/30 border border-white/10 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
      <div className="absolute inset-0 z-0 rounded-xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGameId || "empty-library"}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0"
            style={selectedGameId ? backgroundStyle : { backgroundColor: '#020617' }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
      </div>

      <TitleBar />

      <div className="flex-1 flex min-h-0 relative z-10">
        <Sidebar
          currentView={currentView}
          onChangeView={setCurrentView}
          onOpenAddGame={onOpenAddGame}
          onOpenAppSettings={onOpenAppSettings}
        />
        <main className="flex-1 relative flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
