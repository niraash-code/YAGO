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
        "h-12 w-full bg-background flex flex-none items-center justify-between px-4 select-none z-50 border-b border-border"
      )}
    >
      <div className="flex items-center gap-3 pointer-events-none text-muted-foreground">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground shadow-sm">
          Y
        </div>
        <span className="text-xs font-black tracking-widest uppercase">
          YAGO
        </span>
      </div>

      <div className="flex items-center h-full gap-1">
        <Tooltip content="Minimize" position="bottom" className="h-full">
          <button
            onClick={minimize}
            className="h-8 w-10 hover:bg-card text-muted-foreground hover:text-foreground transition-colors outline-none flex items-center justify-center rounded"
          >
            <Minus size={16} />
          </button>
        </Tooltip>

        <Tooltip
          content={isMaximized ? "Restore" : "Maximize"}
          position="bottom"
          className="h-full"
        >
          <button
            onClick={toggleMaximize}
            className="h-8 w-10 hover:bg-card text-muted-foreground hover:text-foreground transition-colors outline-none flex items-center justify-center rounded"
          >
            {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
          </button>
        </Tooltip>

        <Tooltip content="Close" position="bottom" className="h-full">
          <button
            onClick={close}
            className="h-8 w-10 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground transition-colors outline-none flex items-center justify-center group rounded"
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
