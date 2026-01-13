

'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Customer } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { customerService } from '@/services/customerService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

// Components
import { CustomerInfoCard } from '@/components/customers/CustomerInfoCard';
import { CustomerEmployeesList } from '@/components/customers/CustomerEmployeesList';
import { CustomerStats } from '@/components/customers/CustomerStats';
import { CustomerOrdersTab } from '@/components/customers/CustomerOrdersTab';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchCustomerData = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await customerService.getCustomerById(id);
      if (data) {
        setCustomer(data);
      } else {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагч олдсонгүй.' });
        router.push('/customers');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  React.useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const handleCustomerUpdate = (updatedData: Partial<Customer>) => {
    setCustomer(prev => prev ? { ...prev, ...updatedData } : null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/customers')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Харилцагчдын жагсаалт
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border">
              <AvatarImage src={customer.logoUrl} alt={customer.name} />
              <AvatarFallback className="text-2xl">
                {customer.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-headline font-bold">{customer.name}</h1>
              <p className="text-muted-foreground">
                Харилцагчийн дэлгэрэнгүй мэдээлэл.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/customers/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Мэдээлэл засах
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Тойм</TabsTrigger>
          <TabsTrigger value="employees">Ажилтнууд</TabsTrigger>
          <TabsTrigger value="orders">Захиалгын Түүх</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CustomerInfoCard customer={customer} onUpdate={handleCustomerUpdate} />
          <CustomerStats isLoading={false} />
        </TabsContent>

        <TabsContent value="employees">
          <CustomerEmployeesList customerId={id} />
        </TabsContent>

        <TabsContent value="orders">
          <CustomerOrdersTab customerId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
