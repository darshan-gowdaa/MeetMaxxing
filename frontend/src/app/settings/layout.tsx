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
 <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto gap-6 sm:gap-10 pt-4 pb-24 px-4 sm:px-8">
 <nav className="w-full md:w-64 shrink-0 flex flex-col gap-2">
 <h2 className="text-xl font-bold mb-2 px-4 text-text">Settings</h2>
 <ul className="flex flex-nowrap md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
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
 <main className="flex-1 min-w-0">
 {children}
 </main>
 </div>
 );
}
