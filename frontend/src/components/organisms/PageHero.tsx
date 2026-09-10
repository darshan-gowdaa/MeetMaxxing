"use client";

import React from "react";

export interface PageHeroStat {
  loading?: boolean;
  value: React.ReactNode;
  label: string;
}

export interface PageHeroProps {
  icon: React.ElementType;
  pretitle: string;
  title: string;
  titleHighlight: string;
  description: string;
  stats: PageHeroStat[];
  action?: React.ReactNode;
}

export default function PageHero({
  icon: Icon,
  pretitle,
  title,
  titleHighlight,
  description,
  stats,
  action,
}: PageHeroProps) {
  return (
    <div className="relative rounded-[28px] sm:rounded-[32px] bg-surface-container border border-border overflow-hidden p-5 sm:p-6 md:p-10">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-widest">
            <Icon className="w-3.5 h-3.5" />
            {pretitle}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-text leading-tight">
            {title}
            <span className="text-primary"> {titleHighlight}</span>
          </h1>
          <p className="text-[13px] sm:text-[14px] text-text-muted max-w-md leading-relaxed">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto mt-1 sm:mt-0">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center flex-1 sm:flex-none min-w-0 sm:min-w-[6rem] px-3 sm:px-4 h-18 sm:h-20 rounded-[20px] bg-surface2 border border-border">
              {stat.loading ? (
                <div className="w-8 h-8 rounded-xl md3-skeleton mb-1" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-text">
                  {stat.value}
                </span>
              )}
              <span className="text-[10px] text-text-muted font-medium mt-1">{stat.label}</span>
            </div>
          ))}
          {action && (
            <div className="col-span-2 sm:col-auto w-full sm:w-auto">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
