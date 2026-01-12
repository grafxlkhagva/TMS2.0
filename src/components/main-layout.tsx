'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { ProtectedLayout } from '@/components/protected-layout';

export function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuthProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
      {mounted && <Toaster />}
    </AuthProvider>
  );
}
