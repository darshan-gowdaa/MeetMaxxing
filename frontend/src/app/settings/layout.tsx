'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiUserLine, RiSettings3Line, RiKey2Line, RiNotification3Line, RiPaletteLine } from '@remixicon/react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();

 const links = [
 { href: '/settings/profile', label: 'Profile', icon: RiUserLine },
 { href: '/settings', label: 'General Preferences', icon: RiSettings3Line, exact: true },
 { href: '/settings/api-keys', label: 'API Keys', icon: RiKey2Line },
 { href: '/settings/notifications', label: 'Notifications', icon: RiNotification3Line },
 { href: '/settings/appearance', label: 'Appearance', icon: RiPaletteLine },
 ];

  return (
  <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto md:gap-6 lg:gap-10 pb-24">
  <nav className="w-full md:w-64 shrink-0 flex flex-col gap-3 sticky top-0 md:top-[80px] z-40 bg-bg/85 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none pt-4 md:pt-8 pb-3 md:pb-0 px-4 md:pl-8 md:pr-0 border-b border-border/50 md:border-none self-start transition-all">
  <h2 className="text-2xl font-black mb-1 md:mb-4 px-1 md:px-4 text-text tracking-tight">Settings</h2>
  <ul className="flex flex-nowrap md:flex-col gap-2 overflow-x-auto hide-scrollbar px-1 md:px-0 pb-1 md:pb-0">
 {links.map(link => {
 const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
 return (
 <li key={link.href} className="shrink-0">
 <Link 
 href={link.href} 
 className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium text-sm transition-colors whitespace-nowrap ${
 isActive 
 ? 'bg-primary-container text-on-primary-container shadow-sm' 
 : 'bg-surface hover:bg-surface2 text-text-muted hover:text-text'
 }`}
 >
 <link.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} /> {link.label}
 </Link>
 </li>
 );
 })}
  </ul>
  </nav>
  <main className="flex-1 min-w-0 px-4 md:px-8 md:pr-8 pt-6 md:pt-8">
  {children}
  </main>
  </div>
 );
}
