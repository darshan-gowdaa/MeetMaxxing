"use client";

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

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
  const ref = useRef<HTMLSpanElement>(null);
  /* Triggers strictly when the user has scrolled this section into view */
  const isInView = useInView(ref, { once: true, amount: 0.3, margin: "0px 0px -40px 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start: number | null = null;
    const duration = 1600;
    let reqId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      /* Eased curve makes the numbers roll fast initially and decelerate cleanly into place */
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(ease * value));

      if (progress < 1) {
        reqId = requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };

    reqId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(reqId);
  }, [isInView, value]);

  return (
    <span ref={ref} className="tabular-nums inline-block">
      {display}
    </span>
  );
};

/* Keep CountUp as backwards-compatible alias */
export const CountUp = ({ to }: { to: number }) => <RollingNumber value={to} />;

