"use client";

import React, { useState, MouseEvent } from 'react';

export const SpotlightCard = ({
  children,
  borderRadius = '16px',
  className = '',
}: {
  children: React.ReactNode;
  borderRadius?: string;
  className?: string;
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setPos(null);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden border border-[rgba(168,199,250,0.15)] bg-[rgba(168,199,250,0.04)] transition-colors hover:border-[rgba(168,199,250,0.3)] hover:bg-[rgba(168,199,250,0.08)] ${className}`}
      style={{ borderRadius }}
    >
      {pos && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(250px circle at ${pos.x}px ${pos.y}px, rgba(168,199,250,0.15) 0%, transparent 100%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full p-6 md:p-8">{children}</div>
    </div>
  );
};
