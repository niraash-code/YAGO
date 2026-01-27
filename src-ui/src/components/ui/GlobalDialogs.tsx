import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  X,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { cn } from "../../lib/utils";

const Overlay = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    {children}
  </motion.div>
);

const DialogBase = ({
  title,
  icon: Icon,
  children,
}: {
  title?: string;
  icon?: any;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0, y: 10 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.95, opacity: 0, y: 10 }}
    onClick={e => e.stopPropagation()}
    className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5"
  >
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className="p-2 bg-slate-800 rounded-full text-indigo-400">
            <Icon size={24} />
          </div>
        )}
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <div className="text-slate-300 leading-relaxed text-base">{children}</div>
    </div>
  </motion.div>
);

export const GlobalDialogs: React.FC = () => {
  const { alert, confirm, prompt, closeAlert, closeConfirm, closePrompt } =
    useUiStore();
  const promptInputRef = useRef<HTMLInputElement>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    if (prompt.isOpen) {
      setPromptValue(prompt.options.defaultValue || "");
      setTimeout(() => promptInputRef.current?.focus(), 100);
    }
  }, [prompt.isOpen, prompt.options.defaultValue]);

  return (
    <AnimatePresence>
      {/* Alert Dialog */}
      {alert.isOpen && (
        <Overlay>
          <DialogBase title={alert.options.title} icon={AlertCircle}>
            <p className="mb-6">{alert.options.message}</p>
            <div className="flex justify-end">
              <button
                onClick={closeAlert}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </DialogBase>
        </Overlay>
      )}

      {/* Confirm Dialog */}
      {confirm.isOpen && (
        <Overlay>
          <DialogBase title={confirm.options.title} icon={HelpCircle}>
            <p className="mb-6 whitespace-pre-wrap">
              {confirm.options.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => closeConfirm(false)}
                className="px-4 py-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg font-medium transition-colors"
              >
                {confirm.options.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
              >
                {confirm.options.confirmLabel || "Confirm"}
              </button>
            </div>
          </DialogBase>
        </Overlay>
      )}

      {/* Prompt Dialog */}
      {prompt.isOpen && (
        <Overlay>
          <DialogBase title={prompt.options.title} icon={MessageSquare}>
            <p className="mb-4">{prompt.options.message}</p>
            <form
              onSubmit={e => {
                e.preventDefault();
                closePrompt(promptValue);
              }}
            >
              <input
                ref={promptInputRef}
                type="text"
                value={promptValue}
                onChange={e => setPromptValue(e.target.value)}
                placeholder={prompt.options.placeholder}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 mb-6 font-medium"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => closePrompt(null)}
                  className="px-4 py-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!promptValue.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
            </form>
          </DialogBase>
        </Overlay>
      )}
    </AnimatePresence>
  );
};
