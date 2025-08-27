
'use client';

import * as React from 'react';
import { doc, getDoc, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Contract, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import PrintButton from '@/components/print/PrintButton';
import ContractPrintLayout from '@/components/contract-print-layout';
import { Timestamp } from 'firebase/firestore';

function DetailItem({ label, value }: { label: string, value?: string | React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="font-medium">{value}</div>
    </div>
  );
}

const toDateSafe = (date: any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string' || typeof date === 'number') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    // Return a default or invalid date if parsing fails, to avoid crashes.
    return new Date(); 
};

const cleanDataForPdf = (data: any): any => {
    if (data === null || data === undefined || React.isValidElement(data)) {
        return data;
    }

    if (data instanceof Timestamp) {
        return data.toDate();
    }
    if (data instanceof Date) {
        return data;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'firestore') && typeof data.path === 'string') {
        return undefined; // It's a DocumentReference, remove it
    }

    if (Array.isArray(data)) {
        return data.map(item => cleanDataForPdf(item));
    }

    if (typeof data === 'object') {
        const cleaned: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (key.endsWith('Ref')) {
                    continue; // Skip keys ending with 'Ref'
                }
                const value = data[key];
                const cleanedValue = cleanDataForPdf(value);
                if (cleanedValue !== undefined) {
                    cleaned[key] = cleanedValue;
                }
            }
        }
        return cleaned;
    }

    return data;
};


export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const printRef = React.useRef<HTMLDivElement>(null);

  const [contract, setContract] = React.useState<Contract | null>(null);
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [orderItem, setOrderItem] = React.useState<OrderItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [contractPublicUrl, setContractPublicUrl] = React.useState('');

  React.useEffect(() => {
    if (!id || !db) return;
    setIsLoading(true);

    const fetchContract = async () => {
      try {
        const docRef = doc(db, 'contracts', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ олдсонгүй.' });
          router.push('/shipments');
          return;
        }

        const contractData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: toDateSafe(docSnap.data().createdAt),
          signedAt: docSnap.data().signedAt ? toDateSafe(docSnap.data().signedAt) : undefined,
          estimatedDeliveryDate: toDateSafe(docSnap.data().estimatedDeliveryDate),
        } as Contract;
        setContract(contractData);

        if (!contractData.shipmentId) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээнд холбогдох тээвэрлэлтийн мэдээлэл олдсонгүй.' });
            setIsLoading(false);
            return;
        }

        const shipmentRef = doc(db, 'shipments', contractData.shipmentId);
        const shipmentSnap = await getDoc(shipmentRef);
        if (!shipmentSnap.exists()) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлтийн мэдээлэл олдсонгүй.' });
            setIsLoading(false);
            return;
        }
        
        const shipmentData = {
            ...shipmentSnap.data(),
            orderItemRef: shipmentSnap.data().orderItemRef as DocumentReference | undefined
        } as Shipment;
        setShipment(shipmentData);

        if (!shipmentData.orderItemRef) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрт холбогдох захиалгын мэдээлэл олдсонгүй.' });
            setIsLoading(false);
            return;
        }
        
        const orderItemSnap = await getDoc(shipmentData.orderItemRef);
        if (orderItemSnap.exists()) {
            setOrderItem(orderItemSnap.data() as OrderItem);
        } else {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалгын дэлгэрэнгүй мэдээлэл олдсонгүй.' });
        }

      } catch (error) {
        console.error("Error fetching contract:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [id, router, toast]);
  
   React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setContractPublicUrl(`${window.location.origin}/sign/${id}`);
    }
  }, [id]);


  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractPublicUrl);
    toast({ title: "Хуулагдлаа", description: "Гэрээний холбоосыг санах ойд хууллаа." });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3 mt-2" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!contract || !shipment || !orderItem) {
    return (
        <div className="container mx-auto py-6">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Алдаа</CardTitle>
                    <CardDescription>
                        Гэрээний мэдээллийг дуудахад алдаа гарлаа. Шаардлагатай тээвэрлэлт эсвэл захиалгын мэдээлэл олдсонгүй.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push(`/shipments/${contract.shipmentId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Тээвэрлэлт рүү буцах
        </Button>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold">Тээвэрлэлтийн гэрээ</h1>
                <p className="text-muted-foreground">
                Тээвэрлэлт: {shipment.shipmentNumber}
                </p>
            </div>
             <div className="flex items-center gap-2">
                <PrintButton 
                    targetRef={printRef} 
                    fileName={`Contract-${shipment.shipmentNumber}.pdf`}
                />
                <Button><Edit className="mr-2 h-4 w-4"/> Загвар засах</Button>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Гэрээний урьдчилсан харагдац</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="prose prose-sm max-w-none border rounded-md p-6 bg-muted/20">
                     <ContractPrintLayout 
                        contract={contract}
                        shipment={shipment}
                        orderItem={orderItem}
                     />
                   </div>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6 sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>Гэрээний төлөв</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Статус" value={<Badge variant={contract.status === 'signed' ? 'success' : 'secondary'}>{contract.status === 'signed' ? 'Гарын үсэг зурсан' : 'Хүлээгдэж буй'}</Badge>} />
                    <DetailItem label="Жолооч" value={contract.driverInfo.name} />
                    <DetailItem label="Үүсгэсэн огноо" value={format(contract.createdAt, 'yyyy-MM-dd')} />
                    {contract.signedAt && (
                         <DetailItem label="Зурсан огноо" value={format(contract.signedAt, 'yyyy-MM-dd HH:mm')} />
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Жолоочид илгээх</CardTitle>
                    <CardDescription>Энэ холбоосыг жолооч руу илгээж, гэрээг цахимаар баталгаажуулна уу.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input value={contractPublicUrl} readOnly />
                        <Button onClick={copyToClipboard} variant="outline" disabled={!contractPublicUrl}>Хуулах</Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" disabled={!contractPublicUrl}>
                        <Link href={contractPublicUrl} target="_blank">
                            <FileSignature className="mr-2 h-4 w-4" />
                            Холбоосыг нээх
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
      
       {/* Hidden component for printing */}
      <div className="print-only">
        <div ref={printRef}>
            <ContractPrintLayout 
                contract={cleanDataForPdf(contract)}
                shipment={cleanDataForPdf(shipment)}
                orderItem={cleanDataForPdf(orderItem)}
            />
        </div>
      </div>
    </div>
  );
}
