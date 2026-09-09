"use client";

import { useRouter } from "next/navigation";
import { RiArrowLeftLine } from "@remixicon/react";

/**
 * Client island for the 404 page — "Go back" uses the browser history so a
 * mistyped deep-link can return the user to wherever they came from.
 */
export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex h-14 px-8 border border-border text-text font-bold rounded-full items-center justify-center gap-2 hover:bg-surface2 transition-colors spring-colors"
    >
      <RiArrowLeftLine className="w-4 h-4" aria-hidden="true" />
      Go back
    </button>
  );
}
