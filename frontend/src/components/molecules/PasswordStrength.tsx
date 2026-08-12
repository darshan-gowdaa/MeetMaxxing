import React from 'react';
import { RiCheckLine, RiCloseLine } from '@remixicon/react';

export const isValidPassword = (p: string) => {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
};

export const PasswordStrength = ({ password, visible }: { password: string; visible: boolean }) => {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const getBarColor = (idx: number) => {
    if (idx > score) return 'bg-transparent';
    if (score < 3) return 'bg-risk';
    if (score === 3) return 'bg-primary';
    return 'bg-success';
  };

  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out shrink-0 w-full ${visible ? 'h-[72px] sm:h-[48px] opacity-100 mt-3' : 'h-0 opacity-0 mt-0'}`}>
      <div className="flex flex-col gap-2 px-1">
        <div className="flex gap-1 h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className={`h-full transition-colors duration-500 ease-out flex-1 ${getBarColor(idx)}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
          <RequirementItem met={hasLength} text="At least 8 characters" />
          <RequirementItem met={hasUpper} text="1 uppercase letter" />
          <RequirementItem met={hasNumber} text="1 number" />
          <RequirementItem met={hasSpecial} text="1 special character" />
        </div>
      </div>
    </div>
  );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1.5 text-[12px] font-bold transition-colors duration-300 ${met ? 'text-success' : 'text-text-muted'}`}>
    {met ? <RiCheckLine className="w-3.5 h-3.5" /> : <RiCloseLine className="w-3.5 h-3.5 opacity-50" />}
    {text}
  </div>
);
