
'use client';

import * as React from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Contract, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, FileSignature } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';


function DetailItem({ label, value }: { label: string, value?: string | React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="font-medium">{value}</div>
    </div>
  );
}


export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [contract, setContract] = React.useState<Contract | null>(null);
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [orderItem, setOrderItem] = React.useState<OrderItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [contractPublicUrl, setContractPublicUrl] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setContractPublicUrl(`${window.location.origin}/sign/${id}`);

    const fetchContract = async () => {
      try {
        const docRef = doc(db, 'contracts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const contractData = {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt.toDate(),
          } as Contract;
          setContract(contractData);

          const shipmentSnap = await getDoc(contractData.shipmentRef as DocumentReference);
          if (shipmentSnap.exists()) {
             const shipmentData = shipmentSnap.data() as Shipment;
             setShipment(shipmentData);

             if (shipmentData.orderItemRef) {
                const orderItemSnap = await getDoc(shipmentData.orderItemRef as DocumentReference);
                if (orderItemSnap.exists()) {
                    setOrderItem(orderItemSnap.data() as OrderItem);
                } else {
                     toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалгын мэдээлэл олдсонгүй.' });
                }
             } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрт холбогдох захиалгын мэдээлэл олдсонгүй.' });
             }
          }

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ олдсонгүй.' });
          router.push('/shipments');
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
    return null;
  }
  
  const finalPrice = orderItem.finalPrice || 0;

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
                <Button variant="outline"><Download className="mr-2 h-4 w-4"/> PDF Татах</Button>
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
                <CardContent className="prose prose-sm max-w-none">
                    <h2 className="text-center">Тээвэрлэлтийн гэрээ №{shipment.shipmentNumber}</h2>
                    <p className="text-right">Огноо: {format(contract.createdAt, 'yyyy-MM-dd')}</p>
                    <p>
                        Энэхүү гэрээг нэг талаас "Түмэн Тех ТМС" (цаашид "Захиалагч" гэх), нөгөө талаас 
                        жолооч <strong>{contract.driverInfo.name}</strong> (Утас: {contract.driverInfo.phone}) 
                        (цаашид "Гүйцэтгэгч" гэх) нар дараах нөхцлөөр харилцан тохиролцож байгуулав.
                    </p>
                    <h3>1. Гэрээний зүйл</h3>
                    <p>
                        Захиалагч нь дор дурдсан ачааг, заасан чиглэлийн дагуу тээвэрлүүлэх ажлыг Гүйцэтгэгчид даалгаж,
                        Гүйцэтгэгч нь уг ажлыг хэлэлцэн тохирсон үнээр, хугацаанд нь чанартай гүйцэтгэх үүргийг хүлээнэ.
                    </p>
                    <ul>
                        <li><strong>Чиглэл:</strong> {shipment.route.startWarehouse} &rarr; {shipment.route.endWarehouse}</li>
                        <li><strong>Хүргэх хугацаа:</strong> {format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')}</li>
                    </ul>
                    <h3>2. Гэрээний үнэ, төлбөрийн нөхцөл</h3>
                    <p>
                       Тээвэрлэлтийн нийт хөлс нь <strong>{finalPrice.toLocaleString()}₮</strong> (НӨАТ орсон / ороогүй) байна. 
                       Төлбөрийг тээвэрлэлт дууссаны дараа ажлын 3 хоногт багтаан Гүйцэтгэгчийн данс руу шилжүүлнэ.
                    </p>
                    <h3>3. Талуудын үүрэг</h3>
                    <p>...</p>

                    {contract.status === 'signed' && contract.signedAt && (
                        <div>
                            <h3>4. Баталгаажилт</h3>
                            <p>Гүйцэтгэгч нь дээрх нөхцлүүдийг зөвшөөрч, цахим хэлбэрээр гарын үсэг зурж баталгаажуулав.</p>
                            <div className="border p-4 rounded-md bg-muted mt-4">
                                <p className="font-semibold">Цахим гарын үсэг:</p>
                                {contract.signatureDataUrl && <img src={contract.signatureDataUrl} alt="Signature" className="h-24 w-auto bg-white mix-blend-darken" />}
                                <p className="text-xs text-muted-foreground mt-2">Огноо: {format(contract.signedAt, 'yyyy-MM-dd HH:mm:ss')}</p>
                            </div>
                        </div>
                    )}
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
    </div>
  );
}
