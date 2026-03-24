import { motion, HTMLMotionProps } from "framer-motion";
import React from "react";

interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};
