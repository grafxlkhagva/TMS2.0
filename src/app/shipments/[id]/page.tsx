
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, addDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Shipment, OrderItemCargo, ShipmentStatusType, PackagingType, OrderItem, Warehouse, Contract, SafetyBriefing, Driver, ShipmentUpdate, ShipmentUpdateStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from "date-fns"
import { useLoadScript, GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, FileText, Info, Phone, User, Truck, Calendar, Cuboid, Package, Check, Loader2, FileSignature, Send, ExternalLink, ShieldCheck, CheckCircle, Sparkles, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateChecklistAction, generateUnloadingChecklistAction } from './actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


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

const shipmentStatuses: ShipmentStatusType[] = ['Preparing', 'Ready For Loading', 'Loading', 'In Transit', 'Unloading', 'Delivered'];

const updateFormSchema = z.object({
  location: z.string().min(3, { message: 'Байршил дор хаяж 3 тэмдэгттэй байх ёстой.' }),
  distanceCovered: z.coerce.number().min(0, { message: 'Туулсан зам сөрөг утгатай байж болохгүй.' }),
  status: z.custom<ShipmentUpdateStatus>(),
  roadConditions: z.string().min(3, { message: 'Замын нөхцөл байдлыг оруулна уу.' }),
  notes: z.string().optional(),
});
type UpdateFormValues = z.infer<typeof updateFormSchema>;


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
  const { user } = useAuth();

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [orderItem, setOrderItem] = React.useState<OrderItem | null>(null);
  const [contract, setContract] = React.useState<Contract | null>(null);
  const [safetyBriefing, setSafetyBriefing] = React.useState<SafetyBriefing | null>(null);
  const [cargo, setCargo] = React.useState<OrderItemCargo[]>([]);
  const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
  const [startWarehouse, setStartWarehouse] = React.useState<Warehouse | null>(null);
  const [endWarehouse, setEndWarehouse] = React.useState<Warehouse | null>(null);
  const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);
  const [briefingPublicUrl, setBriefingPublicUrl] = React.useState('');
  const [assignedDriver, setAssignedDriver] = React.useState<Driver | null>(null);
  const [generatedChecklist, setGeneratedChecklist] = React.useState<string[] | null>(null);
  const [checkedItems, setCheckedItems] = React.useState<Set<number>>(new Set());
  const [generatedUnloadingChecklist, setGeneratedUnloadingChecklist] = React.useState<string[] | null>(null);
  const [checkedUnloadingItems, setCheckedUnloadingItems] = React.useState<Set<number>>(new Set());
  const [shipmentUpdates, setShipmentUpdates] = React.useState<ShipmentUpdate[]>([]);


  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = React.useState(false);
  const [isGeneratingUnloadingChecklist, setIsGeneratingUnloadingChecklist] = React.useState(false);
  const [statusChange, setStatusChange] = React.useState<{ newStatus: ShipmentStatusType; oldStatus: ShipmentStatusType; } | null>(null);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = React.useState(false);

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      location: '',
      distanceCovered: 0,
      status: 'On Schedule',
      roadConditions: '',
      notes: '',
    },
  });

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
          driverRef: docSnap.data().driverRef as DocumentReference | undefined,
        } as Shipment;
        
        if (!shipmentData.checklist) {
          shipmentData.checklist = {
            contractSigned: false,
            safetyBriefingCompleted: false,
            loadingChecklistCompleted: false,
            unloadingChecklistCompleted: false,
            deliveryDocumentsSigned: false,
          }
        }
        setShipment(shipmentData);
        
        if (shipmentData.driverRef) {
            const driverSnap = await getDoc(shipmentData.driverRef);
            if (driverSnap.exists()) {
                setAssignedDriver({ id: driverSnap.id, ...driverSnap.data() } as Driver);
            }
        } else {
            setAssignedDriver(null);
        }

        if (shipmentData.orderItemRef) {
            const orderItemSnap = await getDoc(shipmentData.orderItemRef);
            if (orderItemSnap.exists()) {
                setOrderItem(orderItemSnap.data() as OrderItem);
            }
        }
        
        const [cargoSnapshot, packagingSnapshot, contractSnapshot, safetyBriefingSnapshot, updatesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', shipmentData.orderItemId))),
          getDocs(query(collection(db, 'packaging_types'), orderBy('name'))),
          getDocs(query(collection(db, 'contracts'), where('shipmentId', '==', shipmentData.id))),
          getDocs(query(collection(db, 'safety_briefings'), where('shipmentId', '==', shipmentData.id))),
          getDocs(query(collection(db, 'shipment_updates'), where('shipmentId', '==', shipmentData.id))),
        ]);
        
        const updatesData = updatesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate()} as ShipmentUpdate));
        updatesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setShipmentUpdates(updatesData);
        
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

        if (!safetyBriefingSnapshot.empty) {
            const briefingsData = safetyBriefingSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
                signedAt: doc.data().signedAt ? doc.data().signedAt.toDate() : undefined,
            } as SafetyBriefing));

            briefingsData.sort((a, b) => b.createdAt.getTime() - a.getTime());
            
            const latestBriefing = briefingsData[0];
            setSafetyBriefing(latestBriefing);

             if (latestBriefing.status === 'signed' && !shipmentData.checklist.safetyBriefingCompleted) {
              const shipmentRef = doc(db, 'shipments', shipmentData.id);
              await updateDoc(shipmentRef, { 'checklist.safetyBriefingCompleted': true });
              setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, safetyBriefingCompleted: true }}) : null);
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

  React.useEffect(() => {
    if (typeof window !== 'undefined' && safetyBriefing?.id) {
      setBriefingPublicUrl(`${window.location.origin}/safety-briefing/${safetyBriefing.id}`);
    }
  }, [safetyBriefing?.id]);
  
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

  const handleCreateSafetyBriefing = async () => {
    if (!shipment) return;
    setIsUpdating(true);
    try {
      const briefingRef = await addDoc(collection(db, 'safety_briefings'), {
        shipmentId: shipment.id,
        shipmentRef: doc(db, 'shipments', shipment.id),
        driverInfo: shipment.driverInfo,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({ title: "Заавар үүслээ, хуудсыг дахин ачааллаж байна." });
      fetchShipmentData();
    } catch (error) {
       console.error("Error creating safety briefing", error);
       toast({ variant: "destructive", title: "Алдаа", description: "Аюулгүй ажиллагааны заавар үүсгэхэд алдаа гарлаа."});
    } finally {
      setIsUpdating(false);
    }
  };

  const copyBriefingLinkToClipboard = () => {
    navigator.clipboard.writeText(briefingPublicUrl);
    toast({ title: "Хуулагдлаа", description: "Зааврын холбоосыг санах ойд хууллаа." });
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

  const confirmStatusUpdate = async () => {
    if (!shipment || !statusChange) return;
    const { newStatus } = statusChange;

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
      setStatusChange(null);
    }
  }
  
  const handleAssignDriverToShipment = async () => {
    if (!shipment || !db) return;
    setIsUpdating(true);
    try {
        const phone = shipment.driverInfo.phone;
        const q = query(collection(db, 'Drivers'), where('phone_number', '==', phone));
        const driverSnapshot = await getDocs(q);

        if (driverSnapshot.empty) {
            toast({
                variant: 'destructive',
                title: 'Жолооч олдсонгүй',
                description: 'Энэ утасны дугаартай жолооч системд бүртгэлгүй байна. Захиалгын дэлгэрэнгүйгээс жолоочийг бүртгэнэ үү.',
            });
            return;
        }

        const driverDoc = driverSnapshot.docs[0];
        const driver = { id: driverDoc.id, ...driverDoc.data() } as Driver;

        const shipmentRef = doc(db, 'shipments', shipment.id);
        const driverRef = doc(db, 'Drivers', driver.id);
        await updateDoc(shipmentRef, {
            driverId: driver.id,
            driverRef: driverRef,
        });

        setShipment(prev => prev ? { ...prev, driverId: driver.id, driverRef: driverRef } : null);
        setAssignedDriver(driver);
        toast({ title: 'Амжилттай', description: `${driver.display_name} жолоочийг тээвэрт оноолоо.` });

    } catch (error) {
        console.error("Error assigning driver:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч онооход алдаа гарлаа.' });
    } finally {
        setIsUpdating(false);
    }
  };

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
  
  function StatusTimeline({ 
    currentStatus,
    onStatusClick
  }: { 
    currentStatus: ShipmentStatusType;
    onStatusClick: (newStatus: ShipmentStatusType) => void;
  }) {
    const currentIndex = shipmentStatuses.indexOf(currentStatus);

    return (
        <div className="flex justify-between items-start px-4 pt-2">
            {shipmentStatuses.map((status, index) => (
                <React.Fragment key={status}>
                    <div 
                        className={cn("flex flex-col items-center cursor-pointer group")}
                        onClick={() => {
                           if (index !== currentIndex) {
                               onStatusClick(status);
                           }
                        }}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                            index <= currentIndex ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border group-hover:border-primary"
                        )}>
                           {index < currentIndex ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                        </div>
                        <p className={cn(
                           "text-xs mt-2 text-center w-20 transition-colors", 
                           index <= currentIndex ? "font-semibold text-primary" : "text-muted-foreground group-hover:text-primary"
                        )}>
                           {statusTranslations[status]}
                        </p>
                    </div>
                    {index < shipmentStatuses.length - 1 && (
                         <div className={cn(
                             "flex-1 h-1 mt-4 transition-colors",
                             index < currentIndex ? "bg-primary" : "bg-border",
                             index === currentIndex && "bg-gradient-to-r from-primary to-border",
                         )}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}

 const handleStatusChange = (newStatus: ShipmentStatusType) => {
    if (!shipment) return;
    setStatusChange({ newStatus, oldStatus: shipment.status });
 }

 const handleGenerateChecklist = async () => {
    if (!shipment || !cargo.length) return;
    setIsGeneratingChecklist(true);
    setGeneratedChecklist(null);
    setCheckedItems(new Set());
    try {
      const cargoInfo = cargo.map(c => `${c.quantity} ${c.unit} ${c.name} (${getPackagingTypeName(c.packagingTypeId)})`).join(', ');
      const vehicleInfo = `${shipment.vehicleInfo.vehicleType}, ${shipment.vehicleInfo.trailerType}`;

      const response = await generateChecklistAction({ cargoInfo, vehicleInfo });
      if (response.success && response.data) {
        setGeneratedChecklist(response.data.checklistItems);
      } else {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: response.error || 'Чеклист үүсгэхэд алдаа гарлаа.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Чеклист үүсгэхэд алдаа гарлаа.',
      });
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const handleGenerateUnloadingChecklist = async () => {
    if (!shipment || !cargo.length) return;
    setIsGeneratingUnloadingChecklist(true);
    setGeneratedUnloadingChecklist(null);
    setCheckedUnloadingItems(new Set());
    try {
      const cargoInfo = cargo.map(c => `${c.quantity} ${c.unit} ${c.name} (${getPackagingTypeName(c.packagingTypeId)})`).join(', ');
      const vehicleInfo = `${shipment.vehicleInfo.vehicleType}, ${shipment.vehicleInfo.trailerType}`;

      const response = await generateUnloadingChecklistAction({ cargoInfo, vehicleInfo });
      if (response.success && response.data) {
        setGeneratedUnloadingChecklist(response.data.checklistItems);
      } else {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: response.error || 'Буулгах чеклист үүсгэхэд алдаа гарлаа.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Буулгах чеклист үүсгэхэд алдаа гарлаа.',
      });
    } finally {
      setIsGeneratingUnloadingChecklist(false);
    }
  };

  const handleChecklistItem = (index: number) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleCheckUnloadingItem = (index: number) => {
    setCheckedUnloadingItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
   const handleUpdateSubmit = async (values: UpdateFormValues) => {
    if (!shipment || !user) return;
    setIsSubmittingUpdate(true);
    try {
        await addDoc(collection(db, 'shipment_updates'), {
            ...values,
            shipmentId: shipment.id,
            shipmentRef: doc(db, 'shipments', shipment.id),
            createdAt: serverTimestamp(),
            createdBy: {
                uid: user.uid,
                name: `${user.lastName} ${user.firstName}`,
            },
        });
        toast({ title: "Амжилттай", description: "Явцын мэдээ нэмэгдлээ." });
        updateForm.reset();
        fetchShipmentData();
    } catch (error) {
        console.error("Error adding shipment update:", error);
        toast({ variant: "destructive", title: "Алдаа", description: "Явцын мэдээ нэмэхэд алдаа гарлаа."});
    } finally {
        setIsSubmittingUpdate(false);
    }
  }

 const renderCurrentStageChecklist = () => {
    if (!shipment) return null;
    
    const checklist = shipment.checklist;

    switch (shipment.status) {
      case 'Preparing':
        const isPreparingComplete = checklist.contractSigned && checklist.safetyBriefingCompleted;
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Бэлтгэл ажлын чеклист</h3>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Гэрээ баталгаажуулалт</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="contractSigned" checked={checklist.contractSigned} disabled={true}/>
                        <label htmlFor="contractSigned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Гэрээ баталгаажсан ({contract?.status === 'signed' ? 'Тийм' : 'Үгүй'})
                        </label>
                    </div>
                </CardContent>
                <CardFooter>
                    {contract ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/contracts/${contract.id}`}><ExternalLink className="mr-2 h-3 w-3" /> Гэрээ харах/Илгээх</Link>
                        </Button>
                    ) : (
                        <Button size="sm" onClick={handleCreateContract} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileSignature className="mr-2 h-4 w-4"/>} Гэрээ үүсгэх
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Аюулгүй ажиллагааны заавар</CardTitle>
                </CardHeader>
                 <CardContent>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="safetyBriefingCompleted" checked={checklist.safetyBriefingCompleted} disabled={true}/>
                        <label htmlFor="safetyBriefingCompleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Заавартай танилцсан ({safetyBriefing?.status === 'signed' ? 'Тийм' : 'Үгүй'})
                        </label>
                    </div>
                </CardContent>
                <CardFooter>
                     {safetyBriefing ? (
                        <Button variant="outline" size="sm" asChild>
                           <Link href={`/safety-briefings/${safetyBriefing.id}`}><ExternalLink className="mr-2 h-3 w-3" /> Заавар харах/Илгээх</Link>
                        </Button>
                    ) : (
                        <Button size="sm" onClick={handleCreateSafetyBriefing} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>} Заавар үүсгэх
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Жолоочид ажил үүсгэх</CardTitle>
                </CardHeader>
                 <CardContent>
                    {assignedDriver ? (
                        <div className="flex items-center gap-4 p-2 rounded-md bg-muted">
                           <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                           <div>
                                <p className="font-semibold">{assignedDriver.display_name}</p>
                                <p className="text-sm text-muted-foreground">{assignedDriver.phone_number}</p>
                           </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Жолоочийг системд бүртгэсний дараа энэ товчийг дарж тээвэрт онооно.
                        </p>
                    )}
                </CardContent>
                <CardFooter>
                     {shipment.driverId ? (
                        <Button size="sm" disabled={true} variant="outline" className="bg-green-100 text-green-800">
                           <CheckCircle className="mr-2 h-4 w-4"/> Оногдсон
                        </Button>
                    ) : (
                         <Button size="sm" onClick={handleAssignDriverToShipment} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} 
                            Жолоочид ажил үүсгэх
                        </Button>
                    )}
                </CardFooter>
            </Card>
            
            <Button className="mt-4" onClick={() => handleStatusChange('Ready For Loading')} disabled={!isPreparingComplete || isUpdating}>
                Ачихад бэлэн болгох
            </Button>
          </div>
        );

        case 'Ready For Loading':
            const allItemsChecked = generatedChecklist && checkedItems.size === generatedChecklist.length;
            return (
                <div className="space-y-4">
                    <h3 className="font-semibold">Ачилтын чеклист (AI)</h3>
                    {!generatedChecklist && (
                        <Button onClick={handleGenerateChecklist} disabled={isGeneratingChecklist}>
                            {isGeneratingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Чеклист үүсгэх
                        </Button>
                    )}
                     {isGeneratingChecklist && <Skeleton className="h-24 w-full" />}
                     {generatedChecklist && (
                        <div className="space-y-2 rounded-md border p-4">
                            {generatedChecklist.map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`checklist-item-${index}`} 
                                        onCheckedChange={() => handleChecklistItem(index)}
                                        checked={checkedItems.has(index)}
                                    />
                                    <label htmlFor={`checklist-item-${index}`} className="text-sm font-medium leading-none">
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button onClick={() => handleStatusChange('Loading')} disabled={!allItemsChecked || isUpdating}>
                        Ачилт эхлүүлэх
                    </Button>
                </div>
            )

        case 'Loading':
            return (
                 <div className="space-y-4">
                     <h3 className="font-semibold">Ачилт хийгдэж байна</h3>
                     <Button onClick={() => handleStatusChange('In Transit')} disabled={isUpdating}>
                        Тээвэр эхлүүлэх
                     </Button>
                 </div>
            )
        
        case 'In Transit':
             return (
                 <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-4">Явцын мэдээ нэмэх</h3>
                        <Form {...updateForm}>
                            <form onSubmit={updateForm.handleSubmit(handleUpdateSubmit)} className="space-y-4 p-4 border rounded-lg">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={updateForm.control} name="location" render={({ field }) => ( <FormItem><FormLabel>Байршил</FormLabel><FormControl><Input placeholder="Дархан" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={updateForm.control} name="distanceCovered" render={({ field }) => ( <FormItem><FormLabel>Туулсан зам (км)</FormLabel><FormControl><Input type="number" placeholder="100" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={updateForm.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Төлөв</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="On Schedule">Хэвийн</SelectItem><SelectItem value="Delayed">Саатсан</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                    <FormField control={updateForm.control} name="roadConditions" render={({ field }) => ( <FormItem><FormLabel>Замын нөхцөл</FormLabel><FormControl><Input placeholder="Хэвийн, үзэгдэх орчин сайн" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <FormField control={updateForm.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Нэмэлт тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <Button type="submit" disabled={isSubmittingUpdate}>
                                    {isSubmittingUpdate ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                                    Мэдээ нэмэх
                                </Button>
                            </form>
                        </Form>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-4">Явцын түүх</h3>
                        <div className="space-y-4">
                            {shipmentUpdates.length > 0 ? (
                                shipmentUpdates.map(update => (
                                    <Card key={update.id}>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                <span>{update.location} ({update.distanceCovered} км)</span>
                                                 <Badge variant={update.status === 'Delayed' ? 'warning' : 'success'}>{update.status === 'Delayed' ? 'Саатсан' : 'Хэвийн'}</Badge>
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                               {format(update.createdAt, 'yyyy-MM-dd HH:mm')} - {update.createdBy.name}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 text-sm">
                                           <p><strong>Замын нөхцөл:</strong> {update.roadConditions}</p>
                                           {update.notes && <p><strong>Тэмдэглэл:</strong> {update.notes}</p>}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Явцын мэдээлэл олдсонгүй.</p>
                            )}
                        </div>
                    </div>
                    <Button onClick={() => handleStatusChange('Unloading')} disabled={isUpdating}>
                        Буулгах цэгт ирсэн
                    </Button>
                 </div>
             )

        case 'Unloading':
            const allUnloadingItemsChecked = generatedUnloadingChecklist && checkedUnloadingItems.size === generatedUnloadingChecklist.length;
             return (
                <div className="space-y-4">
                    <h3 className="font-semibold">Буулгалтын чеклист (AI)</h3>
                     {!generatedUnloadingChecklist && (
                        <Button onClick={handleGenerateUnloadingChecklist} disabled={isGeneratingUnloadingChecklist}>
                            {isGeneratingUnloadingChecklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Буулгалтын чеклист үүсгэх
                        </Button>
                    )}
                     {isGeneratingUnloadingChecklist && <Skeleton className="h-24 w-full" />}
                     {generatedUnloadingChecklist && (
                        <div className="space-y-2 rounded-md border p-4">
                            {generatedUnloadingChecklist.map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`unloading-checklist-item-${index}`} 
                                        onCheckedChange={() => handleCheckUnloadingItem(index)}
                                        checked={checkedUnloadingItems.has(index)}
                                    />
                                    <label htmlFor={`unloading-checklist-item-${index}`} className="text-sm font-medium leading-none">
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button onClick={() => handleStatusChange('Delivered')} disabled={!allUnloadingItemsChecked || isUpdating}>
                        Хүргэлт дууссан
                    </Button>
                </div>
            )
        
        case 'Delivered':
            return (
                 <div className="space-y-4">
                    <h3 className="font-semibold">Хүргэлтийн баталгаажуулалт</h3>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="deliveryDocumentsSigned" checked={checklist.deliveryDocumentsSigned} onCheckedChange={(checked) => handleUpdateChecklist('deliveryDocumentsSigned', !!checked)} disabled={isUpdating}/>
                        <label htmlFor="deliveryDocumentsSigned" className="text-sm font-medium leading-none">Хүргэлтийн баримт баталгаажсан</label>
                    </div>
                     <Alert variant="success">
                        <CheckCircle className="h-4 w-4"/>
                        <AlertTitle>Тээвэрлэлт амжилттай</AlertTitle>
                        <AlertDescription>Энэ тээвэрлэлт амжилттай дууссан байна.</AlertDescription>
                    </Alert>
                 </div>
            )

      default:
        return <p className="text-sm text-muted-foreground">Энэ үе шатанд хийх үйлдэл алга.</p>;
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
                <Card><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
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
                <CardTitle>Тээврийн явц</CardTitle>
                <CardDescription>Статус дээр дарж явцыг урагшлуулах эсвэл буцаах боломжтой.</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusTimeline currentStatus={shipment.status} onStatusClick={(newStatus) => setStatusChange({ newStatus, oldStatus: shipment.status })}/>
              </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Диспач удирдлага</CardTitle>
                    <CardDescription>
                       Одоогийн "{statusTranslations[shipment.status]}" үе шатанд хийгдэх үйлдлүүд.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderCurrentStageChecklist()}
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

            <Card>
                <CardHeader>
                    <CardTitle>Ачааны мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cargo.map((c, i) => (
                        <div key={i} className="p-3 border rounded-md grid grid-cols-1 gap-4">
                            <DetailItem icon={Cuboid} label="Ачааны нэр" value={c.name} />
                            <DetailItem icon={Package} label="Тоо хэмжээ" value={`${c.quantity} ${c.unit}`} />
                            <DetailItem icon={Info} label="Баглаа боодол" value={getPackagingTypeName(c.packagingTypeId)} />
                            <DetailItem icon={FileText} label="Тэмдэглэл" value={c.notes} />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
      
       <AlertDialog open={!!statusChange} onOpenChange={() => setStatusChange(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Та статусыг өөрчлөхдөө итгэлтэй байна уу?</AlertDialogTitle>
                <AlertDialogDescription>
                    Та тээврийн явцыг "{statusTranslations[statusChange?.oldStatus || 'Preparing']}" төлвөөс 
                    "{statusTranslations[statusChange?.newStatus || 'Preparing']}" төлөв рүү шилжүүлэх гэж байна.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setStatusChange(null)}>Цуцлах</AlertDialogCancel>
                <AlertDialogAction onClick={confirmStatusUpdate} disabled={isUpdating}>
                    {isUpdating ? "Шинэчилж байна..." : "Тийм, шилжүүлэх"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
