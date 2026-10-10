'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/',
    label: 'Runs',
    match: (p: string) => p === '/' || p.startsWith('/runs') || p.startsWith('/routes'),
    icon: <path d="M4 20c4 0 4-16 8-16s4 16 8 16" />,
  },
  {
    href: '/explore',
    label: 'Explore',
    match: (p: string) => p.startsWith('/explore'),
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    ),
  },
  {
    href: '/me',
    label: 'Me',
    match: (p: string) => p.startsWith('/me'),
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname() ?? '/';
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link key={t.href} href={t.href} className="tab" aria-current={active ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
