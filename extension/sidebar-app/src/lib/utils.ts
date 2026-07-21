export const copyToClipboard = async (text: string, onSuccess: () => void) => {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess();
  } catch (err) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      onSuccess();
    } catch (fallbackErr) {
      console.error("Copy failed", fallbackErr);
    }
  }
};
