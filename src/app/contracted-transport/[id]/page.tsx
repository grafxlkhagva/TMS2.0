
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, CircleDollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContractedTransport, Region, Warehouse, ServiceType, PackagingType, SystemUser, ContractedTransportFrequency } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const frequencyTranslations: Record<ContractedTransportFrequency, string> = {
    Daily: 'Өдөр бүр',
    Weekly: '7 хоног тутам',
    Monthly: 'Сар тутам',
    Custom: 'Бусад'
};

const statusDetails = {
    Active: { text: 'Идэвхтэй', variant: 'success', icon: CheckCircle },
    Expired: { text: 'Хугацаа дууссан', variant: 'secondary', icon: Clock },
    Cancelled: { text: 'Цуцлагдсан', variant: 'destructive', icon: XCircle }
} as const;

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="font-medium">{value}</div>
        </div>
    </div>
  );
}


export default function ContractedTransportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [contract, setContract] = React.useState<ContractedTransport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [relatedData, setRelatedData] = React.useState({
      startRegionName: '',
      endRegionName: '',
      startWarehouseName: '',
      endWarehouseName: '',
      packagingTypeName: '',
      transportManagerName: '',
  });


  const fetchContractData = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const contractDocRef = doc(db, 'contracted_transports', id);
      const contractDocSnap = await getDoc(contractDocRef);

      if (!contractDocSnap.exists()) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээт тээвэр олдсонгүй.' });
        router.push('/contracted-transport');
        return;
      }
      
      const data = contractDocSnap.data();
      const fetchedContract = {
          id: contractDocSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
      } as ContractedTransport;
      setContract(fetchedContract);
      
      const [
          startRegionSnap, 
          endRegionSnap, 
          startWarehouseSnap, 
          endWarehouseSnap, 
          packagingTypeSnap,
          managerSnap
      ] = await Promise.all([
          getDoc(doc(db, 'regions', fetchedContract.route.startRegionId)),
          getDoc(doc(db, 'regions', fetchedContract.route.endRegionId)),
          getDoc(doc(db, 'warehouses', fetchedContract.route.startWarehouseId)),
          getDoc(doc(db, 'warehouses', fetchedContract.route.endWarehouseId)),
          getDoc(doc(db, 'packaging_types', fetchedContract.cargoInfo.packagingTypeId)),
          getDoc(doc(db, 'users', fetchedContract.transportManagerId)),
      ]);

      setRelatedData({
          startRegionName: startRegionSnap.data()?.name || '',
          endRegionName: endRegionSnap.data()?.name || '',
          startWarehouseName: startWarehouseSnap.data()?.name || '',
          endWarehouseName: endWarehouseSnap.data()?.name || '',
          packagingTypeName: packagingTypeSnap.data()?.name || '',
          transportManagerName: `${managerSnap.data()?.lastName || ''} ${managerSnap.data()?.firstName || ''}`,
      })

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  React.useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

  if (isLoading) {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6"><Skeleton className="h-8 w-24 mb-4" /><Skeleton className="h-8 w-1/3" /></div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-40 w-full"/></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-20 w-full"/></CardContent></Card>
                </div>
                <div className="space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-32 w-full"/></CardContent></Card>
                </div>
            </div>
        </div>
    )
  }

  if (!contract) return null;
  
  const statusInfo = statusDetails[contract.status] || { text: contract.status, variant: 'secondary', icon: Clock };


  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/contracted-transport">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-headline font-bold">{contract.title}</h1>
                <p className="text-muted-foreground font-mono">
                Гэрээний дугаар: {contract.contractNumber}
                </p>
            </div>
             <Button asChild>
                <Link href={`/contracted-transport/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Засварлах
                </Link>
            </Button>
        </div>
      </div>
       <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Чиглэл ба Ачааны мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                        <DetailItem icon={MapPin} label="Ачих цэг" value={`${relatedData.startRegionName}, ${relatedData.startWarehouseName}`}/>
                        <DetailItem icon={MapPin} label="Буулгах цэг" value={`${relatedData.endRegionName}, ${relatedData.endWarehouseName}`}/>
                        <DetailItem icon={Truck} label="Нийт зам" value={`${contract.route.totalDistance} км`}/>
                    </div>
                    <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                        <DetailItem icon={Package} label="Ачааны нэр" value={contract.cargoInfo.name}/>
                        <DetailItem icon={Package} label="Нэгж" value={contract.cargoInfo.unit}/>
                        <DetailItem icon={Package} label="Баглаа боодол" value={relatedData.packagingTypeName}/>
                        <DetailItem icon={Package} label="Ачааны тэмдэглэл" value={contract.cargoInfo.notes}/>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6 sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={User} label="Харилцагч" value={contract.customerName} />
                    <DetailItem icon={User} label="Тээврийн менежер" value={relatedData.transportManagerName} />
                    <Separator/>
                    <DetailItem icon={Calendar} label="Гэрээний хугацаа" value={`${format(contract.startDate, 'yyyy-MM-dd')} - ${format(contract.endDate, 'yyyy-MM-dd')}`} />
                    <DetailItem icon={Calendar} label="Давтамж" value={contract.frequency === 'Custom' ? `${frequencyTranslations[contract.frequency]} (${contract.customFrequencyDetails})` : frequencyTranslations[contract.frequency]} />
                     <Separator/>
                    <DetailItem icon={CircleDollarSign} label="Нэг удаагийн тээврийн хөлс" value={`${contract.pricePerShipment.toLocaleString()}₮`} />
                     <Separator/>
                    <DetailItem icon={statusInfo.icon} label="Статус" value={<Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>} />
                    <DetailItem icon={Calendar} label="Бүртгэсэн огноо" value={format(contract.createdAt, 'yyyy-MM-dd HH:mm')} />
                </CardContent>
            </Card>
        </div>
       </div>
    </div>
  );
}
