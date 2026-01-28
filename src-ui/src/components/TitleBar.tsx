import React, { useEffect, useState } from "react";
import { Minus, Square, X, Maximize2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "../lib/utils";
import { Tooltip } from "./ui/Tooltip";

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.warn("TitleBar: Not running in Tauri environment");
      }
    };

    checkMaximized();

    // Listen for resize events to update state if maximized externally
    const handleResize = () => {
      checkMaximized();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const minimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      if (maximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      setIsMaximized(!maximized);
    } catch (e) {
      console.error(e);
    }
  };

  const close = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "m") {
          e.preventDefault();
          minimize();
        } else if (e.key === "q") {
          e.preventDefault();
          close();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "h-12 w-full bg-slate-950/50 backdrop-blur-md flex flex-none items-center justify-between px-4 select-none z-50 border-b border-white/5"
      )}
    >
      {/* Title / Icon Area */}
      <div className="flex items-center gap-3 pointer-events-none text-slate-400">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10">
          Y
        </div>
        <span className="text-sm font-medium tracking-wide text-slate-300">
          YAGO
        </span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full">
        <Tooltip content="Minimize" position="bottom" className="h-full">
          <button
            onClick={minimize}
            className="h-full px-4 hover:bg-white/5 text-slate-400 hover:text-white transition-colors outline-none focus-visible:bg-white/10 flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
        </Tooltip>
        
        <Tooltip content={isMaximized ? "Restore" : "Maximize"} position="bottom" className="h-full">
          <button
            onClick={toggleMaximize}
            className="h-full px-4 hover:bg-white/5 text-slate-400 hover:text-white transition-colors outline-none focus-visible:bg-white/10 flex items-center justify-center"
          >
            {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
          </button>
        </Tooltip>

        <Tooltip content="Close" position="bottom" className="h-full">
          <button
            onClick={close}
            className="h-full px-4 hover:bg-red-500 text-slate-400 hover:text-white transition-colors outline-none focus-visible:bg-red-500 flex items-center justify-center group"
          >
            <X
              size={18}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default TitleBar;
