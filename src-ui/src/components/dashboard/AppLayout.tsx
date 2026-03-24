import React from "react";
import TitleBar from "../TitleBar";
import Sidebar from "../Sidebar";
import { VibeBackground } from "../ui/VibeBackground";

interface AppLayoutProps {
  selectedGameId: string | null;
  vibe?: string;
  currentView: "overview" | "mods" | "skins";
  setCurrentView: (v: "overview" | "mods" | "skins") => void;
  onOpenAddGame: () => void;
  onOpenAppSettings: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentView,
  setCurrentView,
  onOpenAddGame,
  onOpenAppSettings,
  vibe,
  children,
}) => {
  return (
    <div 
      className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans transition-colors duration-1000"
      data-vibe={vibe}
    >
      <VibeBackground vibe={vibe} />
      <TitleBar />

      <div className="flex-1 flex min-h-0 relative z-10">
        <Sidebar
          currentView={currentView}
          onChangeView={setCurrentView}
          onOpenAddGame={onOpenAddGame}
          onOpenAppSettings={onOpenAppSettings}
        />
        <main className="flex-1 relative flex flex-col min-w-0 glass m-2 rounded-xl overflow-hidden shadow-2xl">
          {children}
        </main>
      </div>
    </div>
  );
};
