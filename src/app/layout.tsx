
'use client';

import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { ProtectedLayout } from '@/components/protected-layout';
import React, { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

// export const metadata: Metadata = {
//   title: 'Tumen Tech TMS',
//   description: 'Transportation Management System by Tumen Tech',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <title>Tumen Tech TMS</title>
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-body antialiased`}>
        <AuthProvider>
          <ProtectedLayout>{children}</ProtectedLayout>
          {mounted && <Toaster />}
        </AuthProvider>
      </body>
    </html>
  );
}
