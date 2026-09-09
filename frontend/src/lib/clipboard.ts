/**
 * Clipboard helper with a legacy fallback for non-secure contexts and older
 * browsers, where `navigator.clipboard` is unavailable (e.g. HTTP origins or
 * some embedded browsers). Returns true if a copy was attempted successfully.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof text !== "string") return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path below
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
