export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl animate-pulse">
      <div className="h-10 w-48 bg-surface-container-highest rounded-full" />
      <div className="h-32 w-full bg-surface-container-highest rounded-[32px]" />
      <div className="h-48 w-full bg-surface-container-highest rounded-[32px]" />
    </div>
  );
}
