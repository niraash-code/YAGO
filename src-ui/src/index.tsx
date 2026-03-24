import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Initialize theme from localStorage before rendering
const initializeTheme = () => {
  try {
    const storedTheme = localStorage.getItem("ui-storage");
    const root = document.documentElement;

    if (storedTheme) {
      const uiState = JSON.parse(storedTheme);
      // Apply data-theme for the Full Spectrum Engine
      const theme = uiState.state?.theme || "rose-pine";
      root.setAttribute("data-theme", theme);
    } else {
      root.setAttribute("data-theme", "rose-pine");
    }
  } catch (error) {
    console.error("Failed to initialize theme:", error);
    document.documentElement.setAttribute("data-theme", "rose-pine");
  }
};

initializeTheme();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Disable default browser context menu globally
document.addEventListener(
  "contextmenu",
  e => {
    e.preventDefault();
  },
  false
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);