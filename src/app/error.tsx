'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Алдаа гарлаа</h2>
      <p className="text-center text-muted-foreground max-w-md">
        {error.message || 'Тодорхойгүй алдаа. Дахин оролдоно уу.'}
      </p>
      <Button onClick={reset}>Дахин оролдох</Button>
    </div>
  );
}
