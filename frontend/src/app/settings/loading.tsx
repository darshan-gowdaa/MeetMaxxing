export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-3xl animate-pulse">
      <div className="h-[36px] w-32 bg-surface-container-highest rounded-full" />
      <div className="flex flex-col gap-6">
        <div className="h-[148px] w-full bg-surface-container-highest rounded-[24px]" />
        <div className="h-[200px] w-full bg-surface-container-highest rounded-[24px]" />
      </div>
    </div>
  );
}
