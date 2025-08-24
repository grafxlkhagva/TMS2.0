
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, addDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Shipment, OrderItemCargo, ShipmentStatusType, PackagingType, OrderItem, Warehouse, Contract } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from "date-fns"
import { useLoadScript, GoogleMap, DirectionsRenderer } from '@react-google-maps/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, FileText, Info, Phone, User, Truck, Calendar, Cuboid, Package, Check, Loader2, FileSignature, Send, ExternalLink, ShieldCheck, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const statusTranslations: Record<ShipmentStatusType, string> = {
    Preparing: 'Бэлтгэл',
    'Ready For Loading': 'Ачихад бэлэн',
    Loading: 'Ачиж буй',
    'In Transit': 'Тээвэрлэж буй',
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

const libraries: ('places')[] = ['places'];

const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: 'var(--radius)',
};

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [orderItem, setOrderItem] = React.useState<OrderItem | null>(null);
  const [contract, setContract] = React.useState<Contract | null>(null);
  const [cargo, setCargo] = React.useState<OrderItemCargo[]>([]);
  const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
  const [startWarehouse, setStartWarehouse] = React.useState<Warehouse | null>(null);
  const [endWarehouse, setEndWarehouse] = React.useState<Warehouse | null>(null);
  const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded: isMapLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
    preventGoogleFontsLoading: true,
    preventLoading: !hasApiKey,
  });
  
  const fetchShipmentData = React.useCallback(async () => {
    if (!id || !db) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, 'shipments', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const shipmentData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt.toDate(),
          estimatedDeliveryDate: docSnap.data().estimatedDeliveryDate.toDate(),
          orderItemRef: docSnap.data().orderItemRef as DocumentReference | undefined,
        } as Shipment;
        
        // Initialize checklist if it doesn't exist
        if (!shipmentData.checklist) {
          shipmentData.checklist = {
            contractSigned: false,
            safetyBriefingCompleted: false,
            loadingChecklistCompleted: false,
          }
        }
        setShipment(shipmentData);

        if (shipmentData.orderItemRef) {
            const orderItemSnap = await getDoc(shipmentData.orderItemRef);
            if (orderItemSnap.exists()) {
                setOrderItem(orderItemSnap.data() as OrderItem);
            }
        }
        
        const [cargoSnapshot, packagingSnapshot, contractSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', shipmentData.orderItemId))),
          getDocs(query(collection(db, 'packaging_types'), orderBy('name'))),
          getDocs(query(collection(db, 'contracts'), where('shipmentId', '==', shipmentData.id)))
        ]);
        
        const cargoData = cargoSnapshot.docs.map(d => d.data() as OrderItemCargo);
        setCargo(cargoData);

        const packagingData = packagingSnapshot.docs.map(d => ({id: d.id, ...d.data()} as PackagingType));
        setPackagingTypes(packagingData);
        
        if (!contractSnapshot.empty) {
            const contractsData = contractSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
                signedAt: doc.data().signedAt ? doc.data().signedAt.toDate() : undefined,
                estimatedDeliveryDate: doc.data().estimatedDeliveryDate.toDate(),
            } as Contract));

            contractsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            
            const latestContract = contractsData[0];
            setContract(latestContract);

            if (latestContract.status === 'signed' && !shipmentData.checklist.contractSigned) {
              const shipmentRef = doc(db, 'shipments', shipmentData.id);
              await updateDoc(shipmentRef, { 'checklist.contractSigned': true });
              setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, contractSigned: true }}) : null);
            }
        }
        
        if (shipmentData.routeRefs) {
            const [startWarehouseDoc, endWarehouseDoc] = await Promise.all([
                getDoc(shipmentData.routeRefs.startWarehouseRef),
                getDoc(shipmentData.routeRefs.endWarehouseRef)
            ]);
            if(startWarehouseDoc.exists()) setStartWarehouse({id: startWarehouseDoc.id, ...startWarehouseDoc.data()} as Warehouse);
            if(endWarehouseDoc.exists()) setEndWarehouse({id: endWarehouseDoc.id, ...endWarehouseDoc.data()} as Warehouse);
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
  }, [id, router, toast]);
  
  React.useEffect(() => {
    fetchShipmentData();
  }, [fetchShipmentData]);

  React.useEffect(() => {
    if (isMapLoaded && startWarehouse && endWarehouse && !directions) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: startWarehouse.geolocation,
          destination: endWarehouse.geolocation,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          } else {
            console.error(`Directions request failed due to ${status}`);
          }
        }
      );
    }
  }, [isMapLoaded, startWarehouse, endWarehouse, directions]);
  
  const handleCreateContract = async () => {
    if (!shipment || !orderItem || !db) return;
    setIsUpdating(true);
    try {
        const contractRef = await addDoc(collection(db, 'contracts'), {
            shipmentId: shipment.id,
            shipmentRef: doc(db, 'shipments', shipment.id),
            shipmentNumber: shipment.shipmentNumber,
            orderId: shipment.orderId,
            orderRef: doc(db, 'orders', shipment.orderId),
            driverInfo: shipment.driverInfo,
            routeInfo: {
                start: `${shipment.route.startRegion}, ${shipment.route.startWarehouse}`,
                end: `${shipment.route.endRegion}, ${shipment.route.endWarehouse}`
            },
            vehicleInfo: {
                type: `${shipment.vehicleInfo.vehicleType}, ${shipment.vehicleInfo.trailerType}`
            },
            price: orderItem.finalPrice || 0,
            priceWithVAT: orderItem.withVAT || false,
            estimatedDeliveryDate: shipment.estimatedDeliveryDate,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        toast({ title: "Гэрээ үүслээ", description: "Гэрээний хуудас руу шилжиж байна." });
        router.push(`/contracts/${contractRef.id}`);

    } catch (error) {
        console.error("Error creating contract", error);
        toast({ variant: "destructive", title: "Алдаа", description: "Гэрээ үүсгэхэд алдаа гарлаа."});
    } finally {
        setIsUpdating(false);
    }
  }

  const handleUpdateChecklist = async (key: keyof Shipment['checklist'], value: boolean) => {
    if (!shipment) return;
    setIsUpdating(true);
    try {
      const shipmentRef = doc(db, 'shipments', shipment.id);
      await updateDoc(shipmentRef, { [`checklist.${key}`]: value });
      setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, [key]: value }}) : null);
      toast({ title: 'Амжилттай', description: 'Үйлдэл тэмдэглэгдлээ.'});
    } catch (error) {
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Чеклист шинэчлэхэд алдаа гарлаа.'});
    } finally {
      setIsUpdating(false);
    }
  }

  const handleStatusUpdate = async (newStatus: ShipmentStatusType) => {
     if (!shipment) return;
    setIsUpdating(true);
    try {
      const shipmentRef = doc(db, 'shipments', shipment.id);
      await updateDoc(shipmentRef, { status: newStatus });
      setShipment(prev => prev ? ({ ...prev, status: newStatus }) : null);
      toast({ title: 'Амжилттай', description: `Тээврийн явц '${statusTranslations[newStatus]}' төлөвт шилжлээ.`});
    } catch (error) {
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Төлөв шинэчлэхэд алдаа гарлаа.'});
    } finally {
      setIsUpdating(false);
    }
  }
  
  const getStatusBadgeVariant = (status: ShipmentStatusType) => {
    switch(status) {
      case 'Delivered': return 'success';
      case 'In Transit': case 'Loading': case 'Unloading': return 'default';
      case 'Delayed': return 'warning';
      case 'Cancelled': return 'destructive';
      case 'Preparing': case 'Ready For Loading':
      default: return 'secondary';
    }
  };

  const getPackagingTypeName = (id: string) => {
    return packagingTypes.find(p => p.id === id)?.name || id;
  }
  
  const renderDispatchControls = () => {
    if (!shipment) return null;
    const { status, checklist } = shipment;
    
    switch (status) {
      case 'Preparing':
        const canMoveToLoading = checklist.contractSigned && checklist.safetyBriefingCompleted;
        return (
          <Card>
            <CardHeader><CardTitle>Бэлтгэл үе шат</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                {checklist.contractSigned ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />}
                <label className="flex-1 text-sm font-medium">Гэрээ баталгаажуулах</label>
                {contract?.status === 'signed' ? (
                  <Button variant="outline" size="sm" asChild><Link href={`/contracts/${contract.id}`}><ExternalLink className="mr-2 h-4 w-4" /> Гэрээ харах</Link></Button>
                ) : (
                  <Button size="sm" onClick={handleCreateContract} disabled={isUpdating || !orderItem}>{isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Гэрээ илгээх</Button>
                )}
              </div>
               <div className="flex items-center space-x-2 p-3 border rounded-md">
                <Checkbox id="safetyBriefing" checked={checklist.safetyBriefingCompleted} onCheckedChange={(checked) => handleUpdateChecklist('safetyBriefingCompleted', !!checked)} disabled={isUpdating} />
                <label htmlFor="safetyBriefing" className="text-sm font-medium leading-none">Аюулгүй ажиллагааны зааварчилгаатай танилцсан</label>
              </div>
              <Button className="w-full" disabled={!canMoveToLoading || isUpdating} onClick={() => handleStatusUpdate('Ready For Loading')}>
                 {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Ачихад бэлэн болгох
              </Button>
            </CardContent>
          </Card>
        );
      case 'Ready For Loading':
         const canStartLoading = checklist.loadingChecklistCompleted;
        return (
           <Card>
             <CardHeader><CardTitle>Ачихад бэлэн</CardTitle></CardHeader>
             <CardContent className="space-y-4">
               <div className="flex items-center space-x-2 p-3 border rounded-md">
                <Checkbox id="loadingChecklist" checked={checklist.loadingChecklistCompleted} onCheckedChange={(checked) => handleUpdateChecklist('loadingChecklistCompleted', !!checked)} disabled={isUpdating} />
                <label htmlFor="loadingChecklist" className="text-sm font-medium leading-none">Ачилтын үеийн чеклисттэй танилцсан</label>
              </div>
               <Button className="w-full" disabled={!canStartLoading || isUpdating} onClick={() => handleStatusUpdate('Loading')}>
                 {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />} Ачилт эхлүүлэх
              </Button>
             </CardContent>
           </Card>
        );
      case 'Loading':
        return (
          <Card>
            <CardHeader><CardTitle>Ачиж байна</CardTitle></CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => handleStatusUpdate('In Transit')} disabled={isUpdating}>
                 {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />} Тээвэр эхлүүлэх
              </Button>
            </CardContent>
          </Card>
        );
      // Add other statuses here...
      default:
        return (
            <Card>
                <CardHeader><CardTitle>Тээврийн явц</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Одоогийн төлөв: <span className="font-semibold">{statusTranslations[status]}</span></p>
                </CardContent>
            </Card>
        );
    }
  }

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
                <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
            <div className="space-y-6"><Card className="h-fit"><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card></div>
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Маршрутын зураглал</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                   {!hasApiKey ? (
                     <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground p-4 text-center">
                        Google Maps API түлхүүр тохируулагдаагүй байна. Газрын зургийг харуулах боломжгүй.
                     </div>
                   ) : loadError ? (
                     <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive-foreground">
                        Газрын зураг ачаалахад алдаа гарлаа.
                     </div>
                   ) : !isMapLoaded ? (
                      <Skeleton className="h-full w-full" />
                   ) : (
                      <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={{ lat: 47.91976, lng: 106.91763 }} // Default center
                          zoom={5}
                          options={{ streetViewControl: false, mapTypeControl: false }}
                      >
                           {directions && <DirectionsRenderer options={{ directions }} />}
                      </GoogleMap>
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
                            <DetailItem icon={Info} label="Баглаа боодол" value={getPackagingTypeName(c.packagingTypeId)} />
                            <DetailItem icon={FileText} label="Тэмдэглэл" value={c.notes} />
                        </div>
                    ))}
                </CardContent>
            </Card>

        </div>
        
        <div className="space-y-6 lg:sticky top-6">
             {renderDispatchControls()}
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
