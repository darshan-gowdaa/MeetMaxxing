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

  const getIndicatorColor = () => {
    if (score === 0) return 'bg-transparent';
    if (score < 3) return 'bg-risk';
    if (score === 3) return 'bg-primary';
    return 'bg-success';
  };

  return (
    <div className={`grid transition-all duration-300 ease-in-out shrink-0 w-full ${visible ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
      <div className="overflow-hidden flex flex-col gap-3 px-1">
        {/* MD3 Linear Progress Indicator */}
        <div className="relative h-1 w-full bg-surface-variant rounded-full overflow-hidden mt-1">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${getIndicatorColor()}`} 
            style={{ width: `${(score / 4) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pb-1">
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
