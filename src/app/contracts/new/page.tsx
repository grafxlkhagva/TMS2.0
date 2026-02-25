'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/patterns/page-container';
import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';
import { NewContractWizard } from '@/components/contracts/new-contract-wizard';
import { useAuth } from '@/hooks/use-auth';

export default function NewContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [wizardOpen, setWizardOpen] = React.useState(true);

  const handleComplete = () => {
    router.push('/contracts');
  };

  const handleClose = (open: boolean) => {
    setWizardOpen(open);
    if (!open) router.push('/contracts');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Шинэ гэрээ"
        description="Загвар сонгоод системийн талбаруудаас мэдээлэл татаж гэрээ үүсгэнэ"
        actions={
          <Button variant="outline" asChild>
            <Link href="/contracts">
              Буцах
            </Link>
          </Button>
        }
      />

      <NewContractWizard
        open={wizardOpen}
        onOpenChange={handleClose}
        onComplete={handleComplete}
        createdBy={{
          uid: user?.uid || '',
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        }}
      />
    </PageContainer>
  );
}
