"use client";

import React from "react";
import { RiCheckLine as Check, RiAlertLine as AlertTriangle } from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";

export type BtnState = "idle" | "loading" | "success" | "error";

/** Official 4-color Gmail logo (Blue/Green/Yellow/Red envelope M) */
export function GmailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Gmail logo"
    >
      {/* Blue segment (left base/flap) */}
      <path
        d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z"
        fill="#4285F4"
      />
      {/* Green segment (right base/flap) */}
      <path
        d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z"
        fill="#34A853"
      />
      {/* Yellow segment (top right fold) */}
      <path
        d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z"
        fill="#FBBC04"
      />
      {/* Red segment (main central M shape) */}
      <path
        d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z"
        fill="#EA4335"
      />
      {/* Dark red/maroon segment (top left fold) */}
      <path
        d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z"
        fill="#C5221F"
      />
    </svg>
  );
}

/** Official 4-color Google Calendar logo (Blue/Green/Yellow/Red calendar icon with "31") */
export function GoogleCalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Google Calendar logo"
    >
      {/* White background base plate */}
      <path d="M390.736 121.264H121.264V390.736H390.736V121.264Z" fill="white" />
      {/* Red corner fold (Bottom Right) */}
      <path d="M390.736 512L512 390.736L451.368 380.392L390.736 390.736L379.67 446.196L390.736 512Z" fill="#EA4335" />
      {/* Green corner fold (Bottom Left) */}
      <path d="M0 390.736V471.578C0 493.912 18.088 512 40.42 512H121.264L133.714 451.368L121.264 390.736L55.198 380.392L0 390.736Z" fill="#188038" />
      {/* Blue corner fold (Top Right) */}
      <path d="M512 121.264V40.42C512 18.088 493.912 0 471.58 0H390.736C383.36 30.072 379.671 52.2027 379.67 66.392C379.67 80.58 383.359 98.8707 390.736 121.264C417.556 128.944 437.767 132.784 451.368 132.784C464.969 132.784 485.18 128.945 512 121.264Z" fill="#1967D2" />
      {/* Yellow quadrant (Mid-Right) */}
      <path d="M512 121.264H390.736V390.736H512V121.264Z" fill="#FBBC04" />
      {/* Green quadrant (Bottom-Center) */}
      <path d="M390.736 390.736H121.264V512H390.736V390.736Z" fill="#34A853" />
      {/* Blue main/top-left block */}
      <path d="M390.736 0H40.422C18.088 0 0 18.088 0 40.42V390.736H121.264V121.264H390.736V0Z" fill="#4285F4" />
      {/* Number "3" and "1" Paths in Google Blue */}
      <path d="M176.54 330.308C166.468 323.504 159.494 313.568 155.688 300.428L179.066 290.796C181.186 298.88 184.891 305.145 190.182 309.592C195.436 314.038 201.836 316.228 209.314 316.228C216.959 316.228 223.527 313.903 229.018 309.254C234.51 304.606 237.272 298.678 237.272 291.504C237.272 284.16 234.375 278.164 228.582 273.516C222.788 268.868 215.512 266.544 206.822 266.544H193.314V243.404H205.44C212.917 243.404 219.216 241.382 224.336 237.338C229.456 233.298 232.016 227.772 232.016 220.732C232.016 214.468 229.726 209.482 225.146 205.744C220.566 202.004 214.77 200.118 207.73 200.118C200.86 200.118 194.954 202.004 190.012 205.776C185.07 209.548 181.652 215.11 179.758 222.464L156.938 213.112C160.058 200.804 167.34 190.868 178.784 183.304C190.228 175.74 204.094 171.958 220.382 171.958C232.69 171.958 243.088 174.686 251.576 180.142C260.064 185.598 264.308 193.006 264.308 202.366C264.308 209.11 261.984 215.008 257.336 220.06C252.688 225.112 246.658 228.608 239.246 230.548V232.072C247.936 234.012 254.91 238.072 260.168 244.252C265.426 250.432 268.055 258.112 268.055 267.292C268.055 277.624 264.442 286.29 257.216 293.29C249.99 300.29 240.406 305.144 228.464 307.852V308.236C239.696 311.112 248.51 316.592 254.906 324.676C261.302 332.76 264.5 342.344 264.5 353.428C264.5 363.38 260.916 371.99 253.748 379.258C246.58 386.526 236.932 392.052 224.804 395.836C212.676 399.62 199.198 401.512 184.37 401.512C167.3 401.512 152.26 398.71 139.25 393.106C126.24 387.502 116.35 379.162 109.58 368.086L132.188 353.428C136.628 361.028 143.208 367.056 151.928 371.512C160.648 375.968 171.106 378.196 183.302 378.196C193.934 378.196 203.042 376.66 210.626 373.588C218.21 370.516 224.036 366.19 228.104 360.61C232.172 355.03 234.206 348.334 234.206 340.522C234.206 331.666 231.134 324.498 224.99 319.018C218.846 313.538 210.65 310.222 200.402 309.07L176.54 330.308Z" fill="#1967D2" />
      <path d="M309.927 396.676V184.18H338.457V396.676H309.927Z" fill="#1967D2" />
    </svg>
  );
}

/** Official 4-color Google Meet camera logo */
export function GoogleMeetIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 622 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Google Meet logo"
    >
      <path d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z" fill="#00832D" />
      <path d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z" fill="#0066DA" />
      <path d="M145.556 0L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 0Z" fill="#E94235" />
      <path d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z" fill="#2684FC" />
      <path d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317" fill="#00AC47" />
      <path d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z" fill="#00AC47" />
      <path d="M450.825 0H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0 450.825 0" fill="#FFBA00" />
    </svg>
  );
}

/** Authentic colored Adobe Red PDF document icon */
export function PdfColorIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PDF file format"
    >
      <path
        d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        fill="#EA4335"
        fillOpacity="0.18"
        stroke="#EA4335"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="#EA4335"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5" y="11" width="14" height="7.5" rx="1.8" fill="#EA4335" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="4.8"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="0.3px"
      >
        PDF
      </text>
    </svg>
  );
}

/** Official colored Markdown (.md) icon */
export function MarkdownColorIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Markdown file format"
    >
      <rect width="16" height="16" rx="3.5" fill="#0284C7" />
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.5 4h2.2l1.8 2.25L8.3 4h2.2v8h-1.8V7.2L7 9.35H6.4L4.3 7.2V12H2.5V4zm11 4.5l-2.25-2.5v1.8H9.5v1.4h1.75V11L13.5 8.5z"
      />
    </svg>
  );
}

export interface ActionButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: BtnState;
  successLabel: string;
  errorLabel?: string;
  onClick: () => void;
  variant?: "filled-tonal" | "tonal";
  className?: string;
}

export function ActionButton({
  label,
  icon: Icon,
  state,
  successLabel,
  errorLabel = "Failed — retry",
  onClick,
  variant = "filled-tonal",
  className = "",
}: ActionButtonProps) {
  if (state === "loading") {
    return (
      <button
        type="button"
        disabled
        className={`min-h-[44px] sm:min-h-0 touch-manipulation inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm bg-secondary-container/70 text-on-secondary-container cursor-wait opacity-90 ${className}`}
      >
        <Md3LoadingIndicator size="sm" />
        <span>{label}…</span>
      </button>
    );
  }

  if (state === "success") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`min-h-[44px] sm:min-h-0 touch-manipulation inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-success-container text-on-success-container shadow-sm cursor-pointer hover:brightness-105 ${className}`}
      >
        <Check className="w-4 h-4 text-success" />
        <span>{successLabel}</span>
      </button>
    );
  }

  if (state === "error") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`min-h-[44px] sm:min-h-0 touch-manipulation inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-risk-container text-on-risk-container shadow-sm hover:brightness-105 cursor-pointer ${className}`}
      >
        <AlertTriangle className="w-4 h-4 text-risk" />
        <span>{errorLabel}</span>
      </button>
    );
  }

  const variantStyle =
    variant === "tonal"
      ? "bg-surface-container-high text-text hover:bg-surface-container-highest border border-outline-variant/15"
      : "bg-secondary-container text-on-secondary-container hover:brightness-105 border border-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] sm:min-h-0 touch-manipulation inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 cursor-pointer ${variantStyle} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
