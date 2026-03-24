import React from "react";
import { Palette } from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { useAppStore } from "../../store/gameStore";
import { THEMES } from "../../lib/themes";
import { Select } from "../ui/Select";

export const ThemeSelector: React.FC = () => {
  const { theme: currentThemeId, setTheme } = useUiStore();
  const { appConfig, updateAppConfig } = useAppStore();

  const handleThemeChange = async (themeId: string) => {
    setTheme(themeId as any);

    // Persist to backend
    if (appConfig) {
      await updateAppConfig({
        ...appConfig,
        theme: themeId,
      });
    }
  };

  // Group themes by engine for the custom select
  const options = THEMES.map(t => ({
    value: t.id,
    label: t.name,
    group: `${t.engine} Engine`,
  }));

  const currentTheme = THEMES.find(t => t.id === currentThemeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label
          className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]"
        >
          Theme Engine
        </label>
        <div className="flex items-center gap-2">
           <div 
            className="w-3 h-3 rounded-full border border-border" 
            style={{ backgroundColor: currentTheme?.colors.background }} 
           />
           <div 
            className="w-3 h-3 rounded-full border border-border" 
            style={{ backgroundColor: currentTheme?.colors.primary }} 
           />
        </div>
      </div>

      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10">
          <Palette size={16} />
        </div>
        
        <Select
          value={currentThemeId}
          onChange={handleThemeChange}
          options={options}
          className="pl-12 w-full uppercase tracking-widest font-black text-[11px]"
        />
      </div>

      <p className="text-[9px] text-muted-foreground font-medium italic opacity-70">
        Active: {currentTheme?.engine} Engine — Curated for Sovereigns.
      </p>
    </div>
  );
};