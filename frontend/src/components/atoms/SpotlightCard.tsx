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
      className={`relative overflow-hidden border border-border bg-primary-glow transition-colors spring-colors hover:border-border-strong hover:bg-primary-dim ${className}`}
      style={{ borderRadius }}
    >
      {pos && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(250px circle at ${pos.x}px ${pos.y}px, var(--primary-glow-hover) 0%, transparent 100%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full p-6 md:p-8">{children}</div>
    </div>
  );
};
