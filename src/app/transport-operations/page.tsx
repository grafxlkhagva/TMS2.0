'use client';

import { PageContainer } from '@/components/patterns/page-container';
import { PageHeader } from '@/components/patterns/page-header';
import { EmptyState } from '@/components/patterns/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Route, ArrowLeftRight, FileSignature } from 'lucide-react';
import Link from 'next/link';

const quickLinks = [
  {
    href: '/transport-operations/end-to-end',
    icon: ArrowLeftRight,
    title: 'End-to-End',
    description: 'Захиалгаас хүргэлт хүртэлх цогц гүйцэтгэлийг удирдах',
  },
  {
    href: '/contracts',
    icon: FileSignature,
    title: 'Гэрээ',
    description: 'Тээврийн гэрээ, нөхцөл, хэрэгжилтийг удирдах',
  },
];

export default function TransportOperationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Тээврийн үйл ажиллагаа"
        description="Тээврийн өдөр тутмын үйл ажиллагааг удирдах, хянах, зохицуулах төв"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="mb-3 rounded-lg bg-primary/10 p-2.5 w-fit group-hover:bg-primary/20 transition-colors">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{link.title}</h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Route}
            title="Тээврийн үйл ажиллагааны тойм"
            description="Энд өдрийн нэгтгэл, идэвхтэй аялал, хуваарилалтын статистик зэрэг мэдээлэл харагдана. Модулийн хөгжүүлэлт дуусмагц идэвхжинэ."
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
