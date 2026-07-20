"use client";

/** MD3 Expressive shape-morphing loading indicator */
export function Md3LoadingIndicator({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cls = {
    sm: "md3-loading-indicator md3-loading-indicator-sm",
    md: "md3-loading-indicator md3-loading-indicator-md",
    lg: "md3-loading-indicator md3-loading-indicator-lg",
  }[size];

  return <span className={`${cls} ${className}`} aria-label="Loading" role="status" />;
}

/** MD3 Expressive skeleton placeholder */
export function Md3Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`md3-skeleton ${className}`} aria-hidden="true" />;
}
