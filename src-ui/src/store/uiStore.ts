import { create } from "zustand";

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
}

export const useUiStore = create<UiState>(set => ({
  alert: { isOpen: false, options: { message: "" }, resolve: () => {} },
  confirm: { isOpen: false, options: { message: "" }, resolve: () => {} },
  prompt: { isOpen: false, options: { message: "" }, resolve: () => {} },

  showAlert: (message, title = "Alert") => {
    return new Promise(resolve => {
      set({ alert: { isOpen: true, options: { message, title }, resolve } });
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
}));
