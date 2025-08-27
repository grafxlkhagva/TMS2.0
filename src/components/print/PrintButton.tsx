
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

type PrintButtonProps = {
  targetRef: React.RefObject<HTMLElement>;
  fileName: string;
  disabled?: boolean;
  orientation?: 'portrait' | 'landscape';
  buttonLabel?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};


export default function PrintButton({
  targetRef,
  fileName,
  disabled = false,
  orientation = 'portrait',
  buttonLabel = 'PDF Татах',
  buttonVariant = "outline",
}: PrintButtonProps) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleCreatePdf = async () => {
    setBusy(true);
    toast({
        title: 'Уучлаарай',
        description: 'Энэ үйлдэл одоогоор идэвхгүй байна.',
        variant: 'destructive',
    });
    setBusy(false);
  };

  return (
    <Button
      onClick={handleCreatePdf}
      disabled={busy || disabled}
      aria-label="PDF-ээр татах"
      className="no-print"
      variant={buttonVariant}
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Боловсруулж байна...
        </>
       ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {buttonLabel}
        </>
       )}
    </Button>
  );
}
