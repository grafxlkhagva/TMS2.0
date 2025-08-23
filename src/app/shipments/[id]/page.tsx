

'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, DocumentData, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Shipment, OrderItem, OrderItemCargo, ShipmentStatusType, Warehouse } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from "date-fns"
import { useLoadScript, GoogleMap, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, FileText, Info, Phone, User, Truck, Calendar, Cuboid, Package, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const shipmentStatuses: ShipmentStatusType[] = ['Preparing', 'Loading', 'In Transit', 'Unloading', 'Delivered', 'Delayed', 'Cancelled'];

const statusTranslations: Record<ShipmentStatusType, string> = {
    Preparing: 'Бэлтгэгдэж буй',
    Loading: 'Ачиж буй',
    'In Transit': 'Тээвэрлэгдэж буй',
    Unloading: 'Буулгаж буй',
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

function StatusTimeline({ currentStatus }: { currentStatus: ShipmentStatusType }) {
    const statuses: ShipmentStatusType[] = ['Preparing', 'Loading', 'In Transit', 'Unloading', 'Delivered'];
    const currentIndex = statuses.indexOf(currentStatus);

    return (
        <div className="flex justify-between items-center px-4 pt-2">
            {statuses.map((status, index) => (
                <React.Fragment key={status}>
                    <div className="flex flex-col items-center">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2",
                            index <= currentIndex ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border"
                        )}>
                           {index < currentIndex ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                        </div>
                        <p className={cn("text-xs mt-2 text-center", index <= currentIndex ? "font-semibold text-primary" : "text-muted-foreground")}>
                           {statusTranslations[status]}
                        </p>
                    </div>
                    {index < statuses.length - 1 && (
                         <div className={cn(
                             "flex-1 h-1 mx-2",
                             index < currentIndex ? "bg-primary" : "bg-border"
                         )}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}


export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [cargo, setCargo] = React.useState<OrderItemCargo[]>([]);
  const [startWarehouse, setStartWarehouse] = React.useState<Warehouse | null>(null);
  const [endWarehouse, setEndWarehouse] = React.useState<Warehouse | null>(null);
  const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);
  const directionsService = React.useRef<google.maps.DirectionsService | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  
  const { isLoaded: isMapLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  });

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

           if (shipmentData.routeRefs) {
            const [startWhSnap, endWhSnap] = await Promise.all([
              getDoc(shipmentData.routeRefs.startWarehouseRef),
              getDoc(shipmentData.routeRefs.endWarehouseRef),
            ]);
            if(startWhSnap.exists()) setStartWarehouse(startWhSnap.data() as Warehouse);
            if(endWhSnap.exists()) setEndWarehouse(endWhSnap.data() as Warehouse);
          }

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

  React.useEffect(() => {
    if (isMapLoaded && startWarehouse?.geolocation && endWarehouse?.geolocation && !directions) {
      if (!directionsService.current) {
        directionsService.current = new google.maps.DirectionsService();
      }
      directionsService.current.route(
        {
          origin: startWarehouse.geolocation,
          destination: endWarehouse.geolocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          } else {
            console.error(`error fetching directions ${result}`);
          }
        }
      );
    }
  }, [isMapLoaded, startWarehouse, endWarehouse, directions]);
  
  const handleStatusChange = async (newStatus: ShipmentStatusType) => {
    if (!shipment) return;
    setIsUpdating(true);
    try {
        const shipmentRef = doc(db, 'shipments', shipment.id);
        await updateDoc(shipmentRef, { status: newStatus });
        
        let orderItemStatus: OrderItem['status'] | '' = '';
        if (newStatus === 'In Transit') orderItemStatus = 'In Transit';
        if (newStatus === 'Delivered') orderItemStatus = 'Delivered';
        if (newStatus === 'Cancelled') orderItemStatus = 'Cancelled';
        
        if (orderItemStatus) {
            const orderItemRef = doc(db, 'order_items', shipment.orderItemId);
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
      case 'Loading':
      case 'Unloading':
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
  
  const mapCenter = startWarehouse?.geolocation || { lat: 47.91976, lng: 106.91763 };

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
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SelectValue placeholder="Статус солих..." />}
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
                <CardTitle>Тээврийн явц</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline currentStatus={shipment.status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Маршрутын зураглал</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                   {isMapLoaded ? (
                        <GoogleMap
                            mapContainerClassName="w-full h-full"
                            center={mapCenter}
                            zoom={5}
                             options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                            }}
                        >
                           {directions ? (
                                <DirectionsRenderer options={{ directions }} />
                            ) : (
                                <>
                                    {startWarehouse?.geolocation && <Marker position={startWarehouse.geolocation} label="A" />}
                                    {endWarehouse?.geolocation && <Marker position={endWarehouse.geolocation} label="B" />}
                                </>
                            )}
                        </GoogleMap>
                    ) : (
                        <Skeleton className="h-full w-full" />
                    )}
                 </div>
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
                <CardTitle>Дэлгэрэнгүй</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem icon={FileText} label="Захиалгын дугаар" value={<Link href={`/orders/${shipment.orderId}`} className="text-primary hover:underline">{shipment.orderNumber}</Link>} />
                <DetailItem icon={User} label="Харилцагч" value={shipment.customerName} />
                <DetailItem icon={Info} label="Статус" value={<Badge variant={getStatusBadgeVariant(shipment.status)}>{statusTranslations[shipment.status]}</Badge>} />
                <DetailItem icon={Calendar} label="Үүсгэсэн огноо" value={format(shipment.createdAt, 'yyyy-MM-dd HH:mm')} />
                <DetailItem icon={Calendar} label="Хүргэх огноо (төлөвлөсөн)" value={format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')} />
                <Separator />
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
