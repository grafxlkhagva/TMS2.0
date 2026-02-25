'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="animate-pulse text-muted-foreground">Дахин чиглүүлж байна...</span>
    </div>
  );
}
