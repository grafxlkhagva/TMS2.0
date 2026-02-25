
import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { MainLayout } from '@/components/main-layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'Tumen Tech TMS',
  description: 'Transportation Management System by Tumen Tech',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Tumen Tech TMS</title>
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-body antialiased`} suppressHydrationWarning>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><span className="animate-pulse">Ачааллаж байна...</span></div>}>
          <MainLayout>
            {children}
          </MainLayout>
        </Suspense>
      </body>
    </html>
  );
}
