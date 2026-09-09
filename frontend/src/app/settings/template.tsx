export default function SettingsTemplate({ children }: { children: React.ReactNode }) {
  // unified md3 expressive page enter animation for all settings tabs
  return (
    <div className="w-full animate-page-enter">
      {children}
    </div>
  );
}
