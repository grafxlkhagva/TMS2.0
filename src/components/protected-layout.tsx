
'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname.startsWith('/sign/') || pathname.startsWith('/safety-briefing/') || pathname === '/login' || pathname === '/signup';

  if (isPublicPage) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
