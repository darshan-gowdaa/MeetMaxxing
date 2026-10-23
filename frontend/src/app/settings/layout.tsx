'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  RiUserLine, 
  RiSettings3Line, 
  RiApps2Line,
  RiKey2Line, 
  RiNotification3Line, 
  RiPaletteLine 
} from '@remixicon/react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: '/settings/profile', label: 'Profile', icon: RiUserLine },
    { href: '/settings', label: 'General Preferences', icon: RiSettings3Line, exact: true },
    { href: '/settings/appearance', label: 'Appearance', icon: RiPaletteLine },
    { href: '/settings/notifications', label: 'Notifications', icon: RiNotification3Line },
    { href: '/settings/integrations', label: 'Integrations', icon: RiApps2Line },
    { href: '/settings/api-keys', label: 'API Keys', icon: RiKey2Line },
  ];

  return (
    <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto md:gap-6 lg:gap-8 pb-24">
      <nav className="w-full md:w-64 shrink-0 flex flex-col gap-2 sm:gap-3 sticky top-16 md:top-[80px] z-30 pt-3 md:pt-8 pb-3 md:pb-0 px-3 sm:px-4 md:pl-8 md:pr-0 self-start transition-all">
        <h2 className="text-xl sm:text-2xl font-black mb-1 md:mb-4 px-1 md:px-4 text-text tracking-tight">Settings</h2>
        <ul className="flex flex-nowrap md:flex-col gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar touch-pan-x bg-surface-container-low/70 backdrop-blur-xl rounded-[32px] p-2.5 sm:p-3 border border-outline-variant/15 shadow-none">
          {links.map(link => {
            const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <li key={link.href} className="shrink-0">
                <Link 
                  href={link.href} 
                  className={`whitespace-nowrap text-sm ${
                    isActive 
                      ? 'bg-primary-container text-on-primary-container font-semibold rounded-full shadow-none px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]' 
                      : 'text-text-muted hover:text-text hover:bg-surface-container-high/60 rounded-full px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]'
                  }`}
                >
                  <link.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-primary-container' : 'text-text-muted'}`} /> {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
