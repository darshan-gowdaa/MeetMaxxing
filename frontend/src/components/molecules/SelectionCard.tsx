import React from 'react';

export function SelectionCard({
  id,
  selected,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  id: string;
  selected: boolean;
  onClick: (id: string) => void;
  icon: React.ElementType;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick(id);
      }}
      role="radio"
      aria-checked={selected}
      className={`flex flex-row sm:flex-col items-center sm:justify-center w-full gap-4 sm:gap-3 py-3 sm:py-6 px-4 sm:px-4 rounded-[16px] sm:rounded-[24px] border-2 transition-all spring-sm text-left sm:text-center ${
        selected
          ? 'border-primary bg-primary-container text-on-primary-container'
          : 'border-border bg-surface2 hover:bg-surface3 text-text-muted hover:border-primary/50'
      }`}
    >
      <Icon className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 ${selected ? 'text-primary' : 'text-text-muted'}`} />
      <div className="flex flex-col gap-0.5 sm:gap-1 flex-1 sm:flex-none">
        <span className={`text-[14px] font-bold ${selected ? 'text-primary' : 'text-text'}`}>
          {label}
        </span>
        {description && <span className="text-[12px] opacity-80 leading-snug">{description}</span>}
      </div>
    </button>
  );
}
