"use client";

/**
 * MD3 Circular Progress — indeterminate loading indicator.
 * Matches the exact Material Design 3 spec:
 * • SVG arc with rounded stroke-linecap
 * • Outer ring rotates continuously
 * • Arc grows then shrinks (stroke-dasharray animation)
 */
export function Md3LoadingIndicator({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = {
    sm: "w-5 h-5",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${sizeMap[size]} ${className} relative flex items-center justify-center`}
    >
      <svg
        className="animate-[md3-circular-rotate_1.4s_linear_infinite]"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-primary animate-[md3-arc-dash_1.4s_ease-in-out_infinite]"
        />
      </svg>
    </div>
  );
}



