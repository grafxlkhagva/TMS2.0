
'use client';

import * as React from 'react';
import { doc, getDoc, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { SafetyBriefing, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileSignature, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import PrintButton from '@/components/print/PrintButton';
import SafetyBriefingLayout from '@/components/safety-briefing-layout';

function DetailItem({ label, value }: { label: string, value?: string | React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="font-medium">{value}</div>
    </div>
  );
}


export default function SafetyBriefingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const printRef = React.useRef<HTMLDivElement>(null);

  const [briefing, setBriefing] = React.useState<SafetyBriefing | null>(null);
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [orderItem, setOrderItem] = React.useState<OrderItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [briefingPublicUrl, setBriefingPublicUrl] = React.useState('');

  React.useEffect(() => {
    if (!id || !db) return;
    setIsLoading(true);

    const fetchBriefing = async () => {
      try {
        const docRef = doc(db, 'safety_briefings', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Заавар олдсонгүй.' });
          router.push('/shipments');
          return;
        }

        const briefingData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt.toDate(),
          signedAt: docSnap.data().signedAt ? docSnap.data().signedAt.toDate() : undefined,
        } as SafetyBriefing;
        setBriefing(briefingData);

        if (!briefingData.shipmentRef) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зааварт холбогдох тээвэрлэлтийн мэдээлэл олдсонгүй.' });
            setIsLoading(false);
            return;
        }

        const shipmentSnap = await getDoc(briefingData.shipmentRef);
        if (!shipmentSnap.exists()) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлтийн мэдээлэл олдсонгүй.' });
            setIsLoading(false);
            return;
        }
        
        const shipmentData = {
            id: shipmentSnap.id,
            ...shipmentSnap.data(),
            orderItemRef: shipmentSnap.data().orderItemRef as DocumentReference | undefined
        } as Shipment;
        setShipment(shipmentData);

        if (shipmentData.orderItemRef){
            const orderItemSnap = await getDoc(shipmentData.orderItemRef);
            if (orderItemSnap.exists()) {
                setOrderItem(orderItemSnap.data() as OrderItem);
            }
        }

      } catch (error) {
        console.error("Error fetching briefing:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefing();
  }, [id, router, toast]);
  
   React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setBriefingPublicUrl(`${window.location.origin}/safety-briefing/${id}`);
    }
  }, [id]);


  const copyToClipboard = () => {
    navigator.clipboard.writeText(briefingPublicUrl);
    toast({ title: "Хуулагдлаа", description: "Зааврын холбоосыг санах ойд хууллаа." });
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

  if (!briefing || !shipment) {
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
                        Зааврын мэдээллийг дуудахад алдаа гарлаа. Шаардлагатай тээвэрлэлтийн мэдээлэл олдсонгүй.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push(`/shipments/${briefing.shipmentId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Тээвэрлэлт рүү буцах
        </Button>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold">Аюулгүй ажиллагааны заавар</h1>
                <p className="text-muted-foreground">
                Тээвэрлэлт: {shipment.shipmentNumber}
                </p>
            </div>
             <div className="flex items-center gap-2">
                <PrintButton 
                    targetRef={printRef} 
                    fileName={`Safety-Briefing-${shipment.shipmentNumber}.pdf`}
                />
                <Button><Edit className="mr-2 h-4 w-4"/> Загвар засах</Button>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Зааврын урьдчилсан харагдац</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="prose prose-sm max-w-none border rounded-md p-6 bg-muted/20">
                     <SafetyBriefingLayout 
                        briefing={briefing}
                        shipment={shipment}
                     />
                   </div>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6 sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>Зааврын төлөв</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Статус" value={<Badge variant={briefing.status === 'signed' ? 'success' : 'secondary'}>{briefing.status === 'signed' ? 'Танилцсан' : 'Хүлээгдэж буй'}</Badge>} />
                    <DetailItem label="Жолооч" value={briefing.driverInfo.name} />
                    <DetailItem label="Үүсгэсэн огноо" value={format(briefing.createdAt, 'yyyy-MM-dd')} />
                    {briefing.signedAt && (
                         <DetailItem label="Танилцсан огноо" value={format(briefing.signedAt, 'yyyy-MM-dd HH:mm')} />
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Жолоочид илгээх</CardTitle>
                    <CardDescription>Энэ холбоосыг жолооч руу илгээж, заавартай танилцаж, баталгаажуулна.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input value={briefingPublicUrl} readOnly />
                        <Button onClick={copyToClipboard} variant="outline" disabled={!briefingPublicUrl}>Хуулах</Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" disabled={!briefingPublicUrl}>
                        <Link href={briefingPublicUrl} target="_blank">
                            <FileSignature className="mr-2 h-4 w-4" />
                            Холбоосыг нээх
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
      
       {/* Hidden component for printing */}
      <div className="hidden">
        <div ref={printRef}>
            <SafetyBriefingLayout 
                briefing={briefing}
                shipment={shipment}
            />
        </div>
      </div>
    </div>
  );
}
