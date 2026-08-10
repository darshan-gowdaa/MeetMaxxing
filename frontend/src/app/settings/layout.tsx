import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto gap-8 pt-4 pb-24">
      <nav className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <h2 className="text-xl font-bold mb-2 px-4 text-text">Settings</h2>
        <ul className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <li>
            <Link href="/settings" className="block px-4 py-3 rounded-full bg-surface hover:bg-surface2 transition-colors font-medium text-text-muted hover:text-text text-sm">
              General Preferences
            </Link>
          </li>
          <li>
            <Link href="/settings/api-keys" className="block px-4 py-3 rounded-full bg-surface hover:bg-surface2 transition-colors font-medium text-text-muted hover:text-text text-sm">
              API Keys
            </Link>
          </li>
        </ul>
      </nav>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
