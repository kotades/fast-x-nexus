"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  speed?: number; // Characters per second
  className?: string;
}

export const TypewriterText = ({ text, speed = 15, className = "" }: TypewriterTextProps) => {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText((prevText) => prevText + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, 1000 / speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, speed, text]);

  return (
    <span className={className}>
      {currentText}
      <motion.span
        className="inline-block w-1 h-[1em] ml-0.5 bg-current"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
};
