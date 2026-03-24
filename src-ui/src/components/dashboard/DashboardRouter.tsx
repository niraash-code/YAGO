import React from "react";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "../ui/PageTransition";
import { GameOverview } from "./GameOverview";
import ModManager from "../ModManager";
import { SkinManager } from "../SkinManager";
import { Game } from "../../types/game";
import { StatsMap } from "../../store/gameStore";

interface DashboardRouterProps {
    currentView: "overview" | "mods" | "skins";
    setCurrentView: (view: "overview" | "mods" | "skins") => void;
    selectedGame: Game;
    isRunning: boolean;
    isDeploying: boolean;
    isLaunching: boolean;
    launchStatus: string | null;
    stats: StatsMap[string] | null;
    streamSafe: boolean;
    nsfwBehavior: "blur" | "hide";
    onLaunch: () => void;
    onInstall: () => void;
    onUpdateGame: (game: Game) => void;
    onOpenSettings: () => void;
}

export const DashboardRouter: React.FC<DashboardRouterProps> = ({
    currentView,
    setCurrentView,
    selectedGame,
    isRunning,
    isDeploying,
    isLaunching,
    launchStatus,
    stats,
    streamSafe,
    nsfwBehavior,
    onLaunch,
    onInstall,
    onUpdateGame,
    onOpenSettings,
}) => {
    return (
        <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
                {currentView === "overview" ? (
                    <PageTransition key="overview" className="h-full">
                        <GameOverview
                            selectedGame={selectedGame}
                            isRunning={isRunning}
                            isDeploying={isDeploying}
                            isLaunching={isLaunching}
                            launchStatus={launchStatus}
                            stats={stats}
                            handleLaunch={onLaunch}
                            handleInstall={onInstall}
                            onOpenSettings={onOpenSettings}
                        />
                    </PageTransition>
                ) : currentView === "mods" ? (
                    <PageTransition key="mods" className="h-full">
                        <ModManager
                            key="modmanager"
                            game={selectedGame}
                            onUpdateGame={onUpdateGame}
                            streamSafe={streamSafe}
                            nsfwBehavior={nsfwBehavior}
                            onClose={() => setCurrentView("overview")}
                        />
                    </PageTransition>
                ) : (
                    <PageTransition key="skins" className="h-full">
                        <SkinManager
                            key="skinmanager"
                            gameId={selectedGame.id}
                            streamSafe={streamSafe}
                        />
                    </PageTransition>
                )}
            </AnimatePresence>
        </div>
    );
};
