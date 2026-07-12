"use client";

import React from "react";
import { motion } from "framer-motion";

interface AnimatedButtonProps extends React.ComponentProps<typeof motion.button> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "text";
  size?: "sm" | "md" | "lg";
  href?: string;
}

export const AnimatedButton = ({
  children,
  variant = "primary",
  size = "md",
  href,
  className,
  ...props
}: AnimatedButtonProps) => {
  const baseStyles = "flex items-center justify-center gap-2 rounded-lg transition-all duration-200";

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantStyles = {
    primary:
      "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold shadow-md hover:shadow-lg",
    secondary:
      "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-primary)] font-bold shadow-md hover:shadow-lg",
    text:
      "bg-transparent text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium",
  };

  const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim();

  const buttonContent = (
    <motion.button
      whileHover={{ y: -2, boxShadow: variant === "text" ? "none" : "0 8px 16px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.97, y: 0 }}
      className={combinedClassName}
      {...props}
    >
      {children}
    </motion.button>
  );

  if (href) {
    return <a href={href}>{buttonContent}</a>;
  }

  return buttonContent;
};
