import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ThemeId } from "../lib/themes";

interface DialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  defaultValue?: string;
}

interface UiState {
  alert: { isOpen: boolean; options: DialogOptions; resolve: () => void };
  confirm: {
    isOpen: boolean;
    options: DialogOptions;
    resolve: (value: boolean) => void;
  };
  prompt: {
    isOpen: boolean;
    options: DialogOptions;
    resolve: (value: string | null) => void;
  };

  // Theme state
  theme: ThemeId;

  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (
    message: string,
    title?: string,
    options?: { confirmLabel?: string; cancelLabel?: string }
  ) => Promise<boolean>;
  showPrompt: (
    message: string,
    defaultValue?: string,
    title?: string
  ) => Promise<string | null>;

  closeAlert: () => void;
  closeConfirm: (value: boolean) => void;
  closePrompt: (value: string | null) => void;

  // Theme actions
  setTheme: (theme: ThemeId) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, _get) => ({
      alert: { isOpen: false, options: { message: "" }, resolve: () => {} },
      confirm: { isOpen: false, options: { message: "" }, resolve: () => {} },
      prompt: { isOpen: false, options: { message: "" }, resolve: () => {} },

      // Theme initial state
      theme: "rose-pine",

      showAlert: (message, title = "Alert") => {
        return new Promise(resolve => {
          set({
            alert: { isOpen: true, options: { message, title }, resolve },
          });
        });
      },

      showConfirm: (message, title = "Confirm", options) => {
        return new Promise(resolve => {
          set({
            confirm: {
              isOpen: true,
              options: { message, title, ...options },
              resolve,
            },
          });
        });
      },

      showPrompt: (message, defaultValue = "", title = "Input") => {
        return new Promise(resolve => {
          set({
            prompt: {
              isOpen: true,
              options: { message, title, defaultValue },
              resolve,
            },
          });
        });
      },

      closeAlert: () =>
        set(state => {
          state.alert.resolve();
          return { alert: { ...state.alert, isOpen: false } };
        }),

      closeConfirm: value =>
        set(state => {
          state.confirm.resolve(value);
          return { confirm: { ...state.confirm, isOpen: false } };
        }),

      closePrompt: value =>
        set(state => {
          state.prompt.resolve(value);
          return { prompt: { ...state.prompt, isOpen: false } };
        }),

      // Theme actions
      setTheme: theme => {
        set({ theme });
        const root = document.documentElement;
        root.setAttribute("data-theme", theme);
      },
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        theme: state.theme,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          const root = document.documentElement;
          if (state.theme) root.setAttribute("data-theme", state.theme);
        }
      },
    }
  )
);