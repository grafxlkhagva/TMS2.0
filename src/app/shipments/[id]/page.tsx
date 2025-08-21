

'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Shipment, OrderItem, OrderItemCargo, ShipmentStatusType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MapPin, FileText, Info, Phone, User, Truck, Calendar, Cuboid, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const shipmentStatuses: ShipmentStatusType[] = ['Preparing', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'];

const statusTranslations: Record<ShipmentStatusType, string> = {
    Preparing: 'Бэлтгэгдэж буй',
    'In Transit': 'Тээвэрлэгдэж буй',
    Delivered: 'Хүргэгдсэн',
    Delayed: 'Саатсан',
    Cancelled: 'Цуцлагдсан'
};


function DetailItem({ icon: Icon, label, value, subValue }: { icon: React.ElementType, label: string, value?: string | React.ReactNode, subValue?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="font-medium whitespace-pre-wrap">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </div>
    </div>
  );
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [cargo, setCargo] = React.useState<OrderItemCargo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const fetchShipment = async () => {
      try {
        const docRef = doc(db, 'shipments', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const shipmentData = {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt.toDate(),
            estimatedDeliveryDate: docSnap.data().estimatedDeliveryDate.toDate(),
          } as Shipment;
          setShipment(shipmentData);
          
          const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', shipmentData.orderItemId));
          const cargoSnapshot = await getDocs(cargoQuery);
          const cargoData = cargoSnapshot.docs.map(d => d.data() as OrderItemCargo);
          setCargo(cargoData);

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт олдсонгүй.' });
          router.push('/shipments');
        }
      } catch (error) {
        console.error("Error fetching shipment:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipment();
  }, [id, router, toast]);
  
  const handleStatusChange = async (newStatus: ShipmentStatusType) => {
    if (!shipment) return;
    setIsUpdating(true);
    try {
        const shipmentRef = doc(db, 'shipments', shipment.id);
        await updateDoc(shipmentRef, { status: newStatus });
        
        // Also update order item status if needed
        const orderItemRef = doc(db, 'order_items', shipment.orderItemId);
        let orderItemStatus = '';
        if (newStatus === 'In Transit') orderItemStatus = 'In Transit';
        if (newStatus === 'Delivered') orderItemStatus = 'Delivered';
        if (newStatus === 'Cancelled') orderItemStatus = 'Cancelled';
        
        if (orderItemStatus) {
            await updateDoc(orderItemRef, { status: orderItemStatus });
        }
        
        setShipment(prev => prev ? { ...prev, status: newStatus } : null);
        toast({ title: "Амжилттай", description: "Тээврийн статус шинэчлэгдлээ."})

    } catch (error) {
        console.error("Error updating status:", error);
        toast({ variant: "destructive", title: "Алдаа", description: "Статус шинэчлэхэд алдаа гарлаа."});
    } finally {
        setIsUpdating(false);
    }
  }
  
  const getStatusBadgeVariant = (status: ShipmentStatusType) => {
    switch(status) {
      case 'Delivered':
        return 'success';
      case 'In Transit':
        return 'default';
      case 'Delayed':
        return 'warning';
      case 'Cancelled':
        return 'destructive';
      case 'Preparing':
      default:
        return 'secondary';
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-4" />
             <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
            <Card className="h-fit"><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/shipments')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Тээвэрлэлтийн жагсаалт
        </Button>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold">Тээвэрлэлт: {shipment.shipmentNumber}</h1>
                <p className="text-muted-foreground">
                Тээвэрлэлтийн дэлгэрэнгүй мэдээлэл.
                </p>
            </div>
             <div className="flex items-center gap-2">
                 <Select onValueChange={(value) => handleStatusChange(value as ShipmentStatusType)} value={shipment.status} disabled={isUpdating}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Статус солих..." />
                    </SelectTrigger>
                    <SelectContent>
                        {shipmentStatuses.map(status => (
                            <SelectItem key={status} value={status}>
                                {statusTranslations[status]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ерөнхий мэдээлэл</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem icon={Truck} label="Тээврийн дугаар" value={shipment.shipmentNumber} />
                <DetailItem icon={FileText} label="Захиалгын дугаар" value={<Link href={`/orders/${shipment.orderId}`} className="text-primary hover:underline">{shipment.orderNumber}</Link>} />
                <DetailItem icon={User} label="Харилцагч" value={shipment.customerName} />
                <DetailItem icon={Info} label="Статус" value={<Badge variant={getStatusBadgeVariant(shipment.status)}>{statusTranslations[shipment.status]}</Badge>} />
                <DetailItem icon={Calendar} label="Үүсгэсэн огноо" value={format(shipment.createdAt, 'yyyy-MM-dd HH:mm')} />
                <DetailItem icon={Calendar} label="Хүргэх огноо (төлөвлөсөн)" value={format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')} />
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ачааны мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cargo.map((c, i) => (
                        <div key={i} className="p-3 border rounded-md grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DetailItem icon={Cuboid} label="Ачааны нэр" value={c.name} />
                            <DetailItem icon={Package} label="Тоо хэмжээ" value={`${c.quantity} ${c.unit}`} />
                            <DetailItem icon={Info} label="Баглаа боодол" value={c.packagingTypeId} />
                            <DetailItem icon={FileText} label="Тэмдэглэл" value={c.notes} />
                        </div>
                    ))}
                </CardContent>
            </Card>

        </div>
        
        <div className="space-y-6 lg:sticky top-6">
             <Card>
              <CardHeader>
                <CardTitle>Чиглэл ба жолоочийн мэдээлэл</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem icon={MapPin} label="Ачих цэг" value={shipment.route.startRegion} subValue={shipment.route.startWarehouse} />
                <DetailItem icon={MapPin} label="Буулгах цэг" value={shipment.route.endRegion} subValue={shipment.route.endWarehouse}/>
                <Separator />
                <DetailItem icon={Truck} label="Тээврийн хэрэгсэл" value={shipment.vehicleInfo.vehicleType} subValue={shipment.vehicleInfo.trailerType} />
                <Separator />
                <DetailItem icon={User} label="Жолоочийн нэр" value={shipment.driverInfo.name} />
                <DetailItem icon={Phone} label="Жолоочийн утас" value={shipment.driverInfo.phone} />
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
