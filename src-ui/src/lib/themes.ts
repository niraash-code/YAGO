export const THEMES = [
  // Rosé Pine Engine
  {
    id: "rose-pine",
    name: "Rosé Pine",
    engine: "Rosé Pine",
    colors: {
      background: "#191724",
      primary: "#ebbcba",
    },
  },
  {
    id: "rose-pine-moon",
    name: "Rosé Pine Moon",
    engine: "Rosé Pine",
    colors: {
      background: "#232136",
      primary: "#ea9a97",
    },
  },
  {
    id: "rose-pine-dawn",
    name: "Rosé Pine Dawn",
    engine: "Rosé Pine",
    colors: {
      background: "#faf4ed",
      primary: "#d7827e",
    },
  },
  // Catppuccin Engine
  {
    id: "ctp-mocha",
    name: "Catppuccin Mocha",
    engine: "Catppuccin",
    colors: {
      background: "#1e1e2e",
      primary: "#cba6f7",
    },
  },
  {
    id: "ctp-macchiato",
    name: "Catppuccin Macchiato",
    engine: "Catppuccin",
    colors: {
      background: "#24273a",
      primary: "#f5bde6",
    },
  },
  // Tokyo Night Engine
  {
    id: "tokyo-storm",
    name: "Tokyo Night Storm",
    engine: "Tokyo Night",
    colors: {
      background: "#24283b",
      primary: "#7aa2f7",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    engine: "Tokyo Night",
    colors: {
      background: "#1a1b26",
      primary: "#bb9af7",
    },
  },
  // Elite Gamer Palettes
  {
    id: "nord",
    name: "Nord Arctic",
    engine: "Elite",
    colors: {
      background: "#2e3440",
      primary: "#88c0d0",
    },
  },
  {
    id: "dracula",
    name: "Dracula Vampire",
    engine: "Elite",
    colors: {
      background: "#282a36",
      primary: "#bd93f9",
    },
  },
  {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    engine: "Elite",
    colors: {
      background: "#282828",
      primary: "#fabd2f",
    },
  },
  {
    id: "one-dark",
    name: "One Dark Pro",
    engine: "Elite",
    colors: {
      background: "#282c34",
      primary: "#61afef",
    },
  },
  // Gacha Sovereign Spectrum
  {
    id: "sakura",
    name: "Sakura Blossom",
    engine: "Gacha",
    colors: {
      background: "#fff5f7",
      primary: "#ff8da1",
    },
  },
  {
    id: "astral",
    name: "Astral Express",
    engine: "Gacha",
    colors: {
      background: "#0b0e1a",
      primary: "#f1c40f",
    },
  },
  {
    id: "hollow",
    name: "Hollow Zero",
    engine: "Gacha",
    colors: {
      background: "#050505",
      primary: "#a3ff00",
    },
  },
  {
    id: "synthwave",
    name: "Synthwave Neon",
    engine: "Gacha",
    colors: {
      background: "#2b0652",
      primary: "#ff00ff",
    },
  },
];

export type ThemeId = (typeof THEMES)[number]["id"];