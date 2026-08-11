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
      className={`flex flex-col items-center justify-center w-full gap-3 py-6 px-4 rounded-[24px] border-2 transition-all spring-sm ${
        selected
          ? 'border-primary bg-primary-container text-on-primary-container'
          : 'border-border bg-surface2 hover:bg-surface3 text-text-muted hover:border-primary/50'
      }`}
    >
      <Icon className={`w-7 h-7 ${selected ? 'text-primary' : 'text-text-muted'}`} />
      <div className="flex flex-col gap-1 text-center">
        <span className={`text-[14px] font-bold ${selected ? 'text-primary' : 'text-text'}`}>
          {label}
        </span>
        {description && <span className="text-[12px] opacity-80 leading-snug">{description}</span>}
      </div>
    </button>
  );
}
