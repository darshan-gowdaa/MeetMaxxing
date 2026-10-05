"use client";

import { motion } from 'framer-motion';
import AnimatedNumber from "@/components/atoms/AnimatedNumber";

export const BlurWord = ({ word, index }: { word: string; index: number }) => {
  return (
    <motion.span
      initial={{ filter: 'blur(8px)', opacity: 0, y: 16 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
      className="inline-block mr-[0.25em]"
    >
      {word}
    </motion.span>
  );
};

export const RollingNumber = ({ value }: { value: number }) => {
  return (
    <span className="tabular-nums inline-block">
      <AnimatedNumber value={value} />
    </span>
  );
};

export const CountUp = ({ to }: { to: number }) => <RollingNumber value={to} />;
