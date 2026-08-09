"use client";

/**
 * MD3 Circular Progress — indeterminate loading indicator.
 *
 * Matches the exact Material Design 3 spec:
 *   • SVG arc with rounded stroke-linecap
 *   • Outer ring rotates continuously
 *   • Arc grows then shrinks (stroke-dasharray animation)
 *   • Four-color cycling: primary → primary-container → tertiary → tertiary-container
 *   • Track (inactive) ring with visible gap to active arc
 */
export function Md3LoadingIndicator({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`md3-loading-indicator md3-loading-indicator-${size} ${className}`}
    />
  );
}



