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
      className={`flex flex-row sm:flex-col items-center sm:justify-center w-full gap-4 sm:gap-3 py-3 sm:py-6 px-4 sm:px-4 ${
        selected
          ? 'border-2 border-primary bg-primary-container text-on-primary-container rounded-[24px] shadow-none active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]'
          : 'border border-outline-variant/30 bg-surface-container hover:bg-surface-container-high text-text-muted hover:border-primary/40 rounded-[24px] active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]'
      } text-left sm:text-center`}
    >
      <Icon className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 ${selected ? 'text-on-primary-container' : 'text-text-muted'}`} />
      <div className="flex flex-col gap-0.5 sm:gap-1 flex-1 sm:flex-none">
        <span className={`text-[14px] font-bold ${selected ? 'text-on-primary-container' : 'text-text'}`}>
          {label}
        </span>
        {description && (
          <span className={`text-[12px] opacity-80 leading-snug ${selected ? 'text-on-primary-container' : 'text-text-muted'}`}>
            {description}
          </span>
        )}
      </div>
    </button>
  );
}
