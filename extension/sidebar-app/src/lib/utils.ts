export const copyToClipboard = async (text: string, onSuccess: () => void) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      onSuccess();
      return;
    }
  } catch (err) {
    // fall through to the legacy path below
  }
  // Legacy fallback for non-secure contexts / older browsers.
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
    if (ok) onSuccess();
    else console.error("Copy failed");
  } catch (err) {
    console.error("Copy failed", err);
  }
};
