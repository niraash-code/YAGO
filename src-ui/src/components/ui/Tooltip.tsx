import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactDOM from "react-dom";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 0.3,
  position = "top",
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.top;

        if (position === "bottom") {
          y = rect.bottom;
        } else if (position === "left") {
          x = rect.left;
          y = rect.top + rect.height / 2;
        } else if (position === "right") {
          x = rect.right;
          y = rect.top + rect.height / 2;
        }

        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay * 1000);
  };

  // Smart repositioning logic after tooltip is visible
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const margin = 12; // Safety margin from window edge
      let nudgeX = 0;
      let nudgeY = 0;

      // Check right edge
      if (tooltipRect.right > window.innerWidth - margin) {
        nudgeX = window.innerWidth - margin - tooltipRect.right;
      }
      // Check left edge
      if (tooltipRect.left < margin) {
        nudgeX = margin - tooltipRect.left;
      }
      // Check bottom edge
      if (tooltipRect.bottom > window.innerHeight - margin) {
        nudgeY = window.innerHeight - margin - tooltipRect.bottom;
      }
      // Check top edge
      if (tooltipRect.top < margin) {
        nudgeY = margin - tooltipRect.top;
      }

      if (nudgeX !== 0 || nudgeY !== 0) {
        setOffset({ x: nudgeX, y: nudgeY });
      }
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [isVisible]);

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const tooltipVariants = {
    initial: {
      opacity: 0,
      scale: 0.95,
      y: position === "top" ? 5 : position === "bottom" ? -5 : 0,
      x: position === "left" ? 5 : position === "right" ? -5 : 0,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: (position === "top" ? -8 : position === "bottom" ? 8 : 0) + offset.y,
      x: (position === "left" ? -8 : position === "right" ? 8 : 0) + offset.x,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
    },
  };

  const getTranslate = () => {
    if (position === "top") return "translate(-50%, -100%)";
    if (position === "bottom") return "translate(-50%, 0)";
    if (position === "left") return "translate(-100%, -50%)";
    if (position === "right") return "translate(0, -50%)";
    return "none";
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className={className}
    >
      {children}
      {isVisible &&
        ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              ref={tooltipRef}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={tooltipVariants}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: coords.y,
                left: coords.x,
                transform: getTranslate(),
                zIndex: 99999,
                pointerEvents: "none",
              }}
              className="px-3 py-1.5 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap">
                {content}
              </span>

              {/* Subtle indigo glow */}
              <div className="absolute inset-0 bg-indigo-500/10 blur-sm -z-10 rounded-lg" />
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
