'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="mn">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
        <h1 className="text-xl font-semibold">Системийн алдаа</h1>
        <p className="text-center text-gray-600 max-w-md">
          {error.message || 'Тодорхойгүй алдаа.'}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Дахин оролдох
        </button>
      </body>
    </html>
  );
}
