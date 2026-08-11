"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

export const CountUp = ({ to }: { to: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startTime: number;
    const duration = 1500;

    let frameId: number;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOutQuint = 1 - Math.pow(1 - progress, 5);
            setCount(Math.floor(easeOutQuint * to));

            if (progress < 1) frameId = requestAnimationFrame(animate);
          };
          frameId = requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [to]);

  return <span ref={ref}>{count}</span>;
};
