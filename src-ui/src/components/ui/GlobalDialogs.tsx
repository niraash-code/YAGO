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
    className="fixed inset-0 z-[100] bg-background/90 flex items-center justify-center p-4"
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
    className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
  >
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className="p-2 bg-background rounded text-primary border border-border">
            <Icon size={24} />
          </div>
        )}
        <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter">
          {title}
        </h3>
      </div>
      <div className="text-muted-foreground leading-relaxed text-sm font-medium">
        {children}
      </div>
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
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-primary/20"
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
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded font-black text-xs uppercase tracking-widest transition-colors border border-border"
              >
                {confirm.options.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-primary/20"
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
                className="w-full bg-background border border-border rounded px-4 py-3 text-foreground focus:outline-none focus:border-primary mb-6 font-bold text-sm"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => closePrompt(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded font-black text-xs uppercase tracking-widest transition-colors border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!promptValue.trim()}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
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
