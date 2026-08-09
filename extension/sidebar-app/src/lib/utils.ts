export const copyToClipboard = async (text: string, onSuccess: () => void) => {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess();
  } catch (err) {
    console.error("Copy failed", err);
  }
};
