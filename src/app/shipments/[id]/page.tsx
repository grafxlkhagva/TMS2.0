'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, addDoc, serverTimestamp, DocumentReference, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Shipment, OrderItemCargo, ShipmentStatusType, PackagingType, OrderItem, Warehouse, Contract, SafetyBriefing, Driver, ShipmentUpdate, ShipmentUpdateStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from "date-fns"
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, FileText, Info, Phone, User, Truck, Calendar, Cuboid, Package, Check, Loader2, FileSignature, Send, ExternalLink, ShieldCheck, CheckCircle, Sparkles, PlusCircle, Trash2, Camera, Pen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateChecklistAction, generateUnloadingChecklistAction } from './actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Modular Components
import { ShipmentInfoSidebar } from '@/components/shipments/detail/shipment-info-sidebar';
import { ShipmentStatusTimeline } from '@/components/shipments/detail/shipment-status-timeline';
import { ShipmentMap } from '@/components/shipments/detail/shipment-map';
import { ShipmentFinancials } from '@/components/shipments/detail/shipment-financials';


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
  delayReason: z.string().optional(),
});
type UpdateFormValues = z.infer<typeof updateFormSchema>;



const libraries: ('places')[] = ['places'];

const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: 'var(--radius)',
};

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
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);


  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      location: '',
      distanceCovered: 0,
      status: 'On Schedule',
      roadConditions: '',
      notes: '',
      delayReason: '',
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
          createdAt: toDateSafe(docSnap.data().createdAt),
          estimatedDeliveryDate: toDateSafe(docSnap.data().estimatedDeliveryDate),
          orderItemRef: docSnap.data().orderItemRef as DocumentReference | undefined,
          driverRef: docSnap.data().driverRef as DocumentReference | undefined,
        } as Shipment;

        if (!shipmentData.checklist) {
          shipmentData.checklist = {
            contractSigned: false,
            safetyBriefingCompleted: false,
            sentDriverInfoToCustomer: false,
            sentLoadingInfoToCustomer: false,
            receivedEbarimtAccount: false,
            providedAccountToFinance: false,
            loadingChecklistCompleted: false,
            unloadingChecklistCompleted: false,
            deliveryDocumentsSigned: false,
            loadingPhotoTaken: false,
            cargoDocumentsReceived: false,
            informedCustomerOnLoad: false,
            unloadingPhotoTaken: false,
            informedCustomerOnUnload: false,
            unloadingDocumentsAttached: false,
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

        const cargoSnapshot = await getDocs(query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', shipmentData.orderItemId)))
        const cargoData = await Promise.all(cargoSnapshot.docs.map(async d => d.data() as OrderItemCargo));
        setCargo(cargoData);

        const [packagingSnapshot, contractSnapshot, safetyBriefingSnapshot, updatesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'packaging_types'), orderBy('name'))),
          getDocs(query(collection(db, 'contracts'), where('shipmentId', '==', shipmentData.id))),
          getDocs(query(collection(db, 'safety_briefings'), where('shipmentId', '==', shipmentData.id))),
          getDocs(query(collection(db, 'shipment_updates'), where('shipmentId', '==', shipmentData.id))),
        ]);

        const updatesData = updatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: toDateSafe(doc.data().createdAt) } as ShipmentUpdate));
        updatesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setShipmentUpdates(updatesData);

        const packagingData = packagingSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PackagingType));
        setPackagingTypes(packagingData);

        if (!contractSnapshot.empty) {
          const contractsData = contractSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toDateSafe(doc.data().createdAt),
            signedAt: doc.data().signedAt ? toDateSafe(doc.data().signedAt) : undefined,
            estimatedDeliveryDate: toDateSafe(doc.data().estimatedDeliveryDate),
          } as Contract));

          contractsData.sort((a, b) => b.createdAt.getTime() - a.getTime());

          const latestContract = contractsData[0];
          setContract(latestContract);

          if (latestContract.status === 'signed' && !shipmentData.checklist.contractSigned) {
            const shipmentRef = doc(db, 'shipments', shipmentData.id);
            await updateDoc(shipmentRef, { 'checklist.contractSigned': true });
            setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, contractSigned: true } }) : null);
          }
        }

        if (!safetyBriefingSnapshot.empty) {
          const briefingsData = safetyBriefingSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toDateSafe(doc.data().createdAt),
            signedAt: doc.data().signedAt ? toDateSafe(doc.data().signedAt) : undefined,
          } as SafetyBriefing));

          briefingsData.sort((a, b) => b.createdAt.getTime() - a.getTime());

          const latestBriefing = briefingsData[0];
          setSafetyBriefing(latestBriefing);

          if (latestBriefing.status === 'signed' && !shipmentData.checklist.safetyBriefingCompleted) {
            const shipmentRef = doc(db, 'shipments', shipmentData.id);
            await updateDoc(shipmentRef, { 'checklist.safetyBriefingCompleted': true });
            setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, safetyBriefingCompleted: true } }) : null);
          }
        }

        if (shipmentData.routeRefs) {
          const [startWarehouseDoc, endWarehouseDoc] = await Promise.all([
            getDoc(shipmentData.routeRefs.startWarehouseRef),
            getDoc(shipmentData.routeRefs.endWarehouseRef)
          ]);
          if (startWarehouseDoc.exists()) setStartWarehouse({ id: startWarehouseDoc.id, ...startWarehouseDoc.data() } as Warehouse);
          if (endWarehouseDoc.exists()) setEndWarehouse({ id: endWarehouseDoc.id, ...endWarehouseDoc.data() } as Warehouse);
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
      toast({ variant: "destructive", title: "Алдаа", description: "Гэрээ үүсгэхэд алдаа гарлаа." });
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
      toast({ variant: "destructive", title: "Алдаа", description: "Аюулгүй ажиллагааны заавар үүсгэхэд алдаа гарлаа." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManualContractSign = async () => {
    if (!shipment || !contract) return;
    setIsUpdating(true);
    try {
      const batch = writeBatch(db);
      const contractRef = doc(db, 'contracts', contract.id);
      const shipmentRef = doc(db, 'shipments', shipment.id);

      batch.update(contractRef, { status: 'signed', signedAt: serverTimestamp() });
      batch.update(shipmentRef, { 'checklist.contractSigned': true });

      await batch.commit();

      setContract(prev => prev ? ({ ...prev, status: 'signed' }) : null);
      setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, contractSigned: true } }) : null);

      toast({ title: 'Амжилттай', description: 'Гэрээг баталгаажууллаа.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ баталгаажуулахад алдаа гарлаа.' });
    } finally {
      setIsUpdating(false);
    }
  }

  const handleManualBriefingSign = async () => {
    if (!shipment || !safetyBriefing) return;
    setIsUpdating(true);
    try {
      const batch = writeBatch(db);
      const briefingRef = doc(db, 'safety_briefings', safetyBriefing.id);
      const shipmentRef = doc(db, 'shipments', shipment.id);

      batch.update(briefingRef, { status: 'signed', signedAt: serverTimestamp() });
      batch.update(shipmentRef, { 'checklist.safetyBriefingCompleted': true });

      await batch.commit();

      // Optimistically update UI
      setSafetyBriefing(prev => prev ? ({ ...prev, status: 'signed', signedAt: new Date() }) : null);
      setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, safetyBriefingCompleted: true } }) : null);

      toast({ title: 'Амжилттай', description: 'Аюулгүй ажиллагааны зааврыг баталгаажууллаа.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Заавар баталгаажуулахад алдаа гарлаа.' });
    } finally {
      setIsUpdating(false);
    }
  }


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
      setShipment(prev => prev ? ({ ...prev, checklist: { ...prev.checklist, [key]: value } }) : null);
      toast({ title: 'Амжилттай', description: 'Үйлдэл тэмдэглэгдлээ.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Чеклист шинэчлэхэд алдаа гарлаа.' });
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
      toast({ title: 'Амжилттай', description: `Тээврийн явц '${statusTranslations[newStatus]}' төлөвт шилжлээ.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Төлөв шинэчлэхэд алдаа гарлаа.' });
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
    switch (status) {
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


  const handleStatusChange = (newStatus: ShipmentStatusType) => {
    if (!shipment) return;
    setStatusChange({ newStatus, oldStatus: shipment.status });
  }

  const handleGenerateChecklist = async () => {
    if (!shipment || !cargo || cargo.length === 0) return;
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
    if (!shipment || !cargo || cargo.length === 0) return;
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
      const dataToSave = {
        ...values,
        shipmentId: shipment.id,
        shipmentRef: doc(db, 'shipments', shipment.id),
        createdAt: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
      };
      const docRef = await addDoc(collection(db, 'shipment_updates'), dataToSave);

      const newUpdate: ShipmentUpdate = {
        id: docRef.id,
        ...dataToSave,
        createdAt: new Date(), // Use local time for optimistic update
      } as ShipmentUpdate;

      setShipmentUpdates(prev => [newUpdate, ...prev]);

      toast({ title: "Амжилттай", description: "Явцын мэдээ нэмэгдлээ." });
      updateForm.reset();
    } catch (error) {
      console.error("Error adding shipment update:", error);
      toast({ variant: "destructive", title: "Алдаа", description: "Явцын мэдээ нэмэхэд алдаа гарлаа." });
    } finally {
      setIsSubmittingUpdate(false);
    }
  }

  const handleDeleteShipment = async () => {
    if (!shipment) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);

      // Delete associated contracts
      const contractsQuery = query(collection(db, 'contracts'), where('shipmentId', '==', shipment.id));
      const contractsSnapshot = await getDocs(contractsQuery);
      contractsSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete associated safety briefings
      const briefingsQuery = query(collection(db, 'safety_briefings'), where('shipmentId', '==', shipment.id));
      const briefingsSnapshot = await getDocs(briefingsQuery);
      briefingsSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete associated shipment updates
      const updatesQuery = query(collection(db, 'shipment_updates'), where('shipmentId', '==', shipment.id));
      const updatesSnapshot = await getDocs(updatesQuery);
      updatesSnapshot.forEach(doc => batch.delete(doc.ref));

      // Update the related order_item status back to 'Assigned'
      if (shipment.orderItemRef) {
        batch.update(shipment.orderItemRef, { status: 'Assigned' });
      }

      // Delete the shipment itself
      batch.delete(doc(db, 'shipments', shipment.id));

      await batch.commit();

      toast({ title: 'Амжилттай', description: 'Тээвэрлэлт устгагдлаа.' });
      router.push(`/orders/${shipment.orderId}`);

    } catch (error) {
      console.error("Error deleting shipment:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт устгахад алдаа гарлаа.' });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }


  const renderCurrentStageChecklist = () => {
    if (!shipment) return null;

    const checklist = shipment.checklist;

    switch (shipment.status) {
      case 'Preparing':
        const isPreparingComplete = checklist.contractSigned && checklist.safetyBriefingCompleted && checklist.sentDriverInfoToCustomer && checklist.sentLoadingInfoToCustomer && checklist.receivedEbarimtAccount && checklist.providedAccountToFinance;
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Бэлтгэл ажлын чеклист</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Гэрээ баталгаажуулалт</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="contractSigned" checked={checklist.contractSigned} disabled={true} />
                    <label htmlFor="contractSigned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Гэрээ баталгаажсан ({contract?.status === 'signed' ? 'Тийм' : 'Үгүй'})
                    </label>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  {contract ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/contracts/${contract.id}`}><ExternalLink className="mr-2 h-3 w-3" /> Гэрээ харах/Илгээх</Link>
                      </Button>
                      {contract.status !== 'signed' && (
                        <Button size="sm" onClick={handleManualContractSign} disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Баталгаажуулах
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button size="sm" onClick={handleCreateContract} disabled={isUpdating}>
                      {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />} Гэрээ үүсгэх
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
                    <Checkbox id="safetyBriefingCompleted" checked={checklist.safetyBriefingCompleted} disabled={true} />
                    <label htmlFor="safetyBriefingCompleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Заавартай танилцсан ({safetyBriefing?.status === 'signed' ? 'Тийм' : 'Үгүй'})
                    </label>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  {safetyBriefing ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/safety-briefings/${safetyBriefing.id}`}><ExternalLink className="mr-2 h-3 w-3" /> Заавар харах/Илгээх</Link>
                      </Button>
                      {safetyBriefing.status !== 'signed' && (
                        <Button size="sm" onClick={handleManualBriefingSign} disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Танилцуулсан
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button size="sm" onClick={handleCreateSafetyBriefing} disabled={isUpdating}>
                      {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Заавар үүсгэх
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
                      <CheckCircle className="mr-2 h-4 w-4" /> Оногдсон
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleAssignDriverToShipment} disabled={isUpdating}>
                      {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Жолоочид ажил үүсгэх
                    </Button>
                  )}
                </CardFooter>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Бусад үйлдлүүд</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2"><Checkbox id="sentDriverInfoToCustomer" checked={checklist.sentDriverInfoToCustomer} onCheckedChange={(checked) => handleUpdateChecklist('sentDriverInfoToCustomer', !!checked)} disabled={isUpdating} /><label htmlFor="sentDriverInfoToCustomer" className="text-sm font-medium">Захиалагчид тээвэрчний мэдээлэл өгсөн</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="sentLoadingInfoToCustomer" checked={checklist.sentLoadingInfoToCustomer} onCheckedChange={(checked) => handleUpdateChecklist('sentLoadingInfoToCustomer', !!checked)} disabled={isUpdating} /><label htmlFor="sentLoadingInfoToCustomer" className="text-sm font-medium">Захиалагчид ачилтын талбайн мэдээлэл өгсөн</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="receivedEbarimtAccount" checked={checklist.receivedEbarimtAccount} onCheckedChange={(checked) => handleUpdateChecklist('receivedEbarimtAccount', !!checked)} disabled={isUpdating} /><label htmlFor="receivedEbarimtAccount" className="text-sm font-medium">Жолоочоос Ибаримт баталгаажуулах данс авсан</label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="providedAccountToFinance" checked={checklist.providedAccountToFinance} onCheckedChange={(checked) => handleUpdateChecklist('providedAccountToFinance', !!checked)} disabled={isUpdating} /><label htmlFor="providedAccountToFinance" className="text-sm font-medium">Санхүүд дансны мэдээлэл өгсөн</label></div>
                </CardContent>
              </Card>
            </div>

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
        const isLoadChecklistComplete = checklist.loadingPhotoTaken && checklist.cargoDocumentsReceived && checklist.informedCustomerOnLoad;
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Ачилт хийгдэж байна</h3>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center space-x-2"><Checkbox id="loadingPhotoTaken" checked={checklist.loadingPhotoTaken} onCheckedChange={(checked) => handleUpdateChecklist('loadingPhotoTaken', !!checked)} disabled={isUpdating} /><label htmlFor="loadingPhotoTaken" className="text-sm font-medium">Ачсан байдал зураг авсан</label></div>
                <div className="flex items-center space-x-2"><Checkbox id="cargoDocumentsReceived" checked={checklist.cargoDocumentsReceived} onCheckedChange={(checked) => handleUpdateChecklist('cargoDocumentsReceived', !!checked)} disabled={isUpdating} /><label htmlFor="cargoDocumentsReceived" className="text-sm font-medium">Ачааны дагалдах бичиг баримт авсан</label></div>
                <div className="flex items-center space-x-2"><Checkbox id="informedCustomerOnLoad" checked={checklist.informedCustomerOnLoad} onCheckedChange={(checked) => handleUpdateChecklist('informedCustomerOnLoad', !!checked)} disabled={isUpdating} /><label htmlFor="informedCustomerOnLoad" className="text-sm font-medium">Захиалагчид мэдээ өгсөн</label></div>
              </CardContent>
            </Card>
            <Button onClick={() => handleStatusChange('In Transit')} disabled={!isLoadChecklistComplete || isUpdating}>
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
                    <FormField control={updateForm.control} name="location" render={({ field }) => (<FormItem><FormLabel>Байршил</FormLabel><FormControl><Input placeholder="Дархан" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={updateForm.control} name="distanceCovered" render={({ field }) => (<FormItem><FormLabel>Туулсан зам (км)</FormLabel><FormControl><Input type="number" placeholder="100" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={updateForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Төлөв</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="On Schedule">Хэвийн</SelectItem><SelectItem value="Delayed">Саатсан</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={updateForm.control} name="roadConditions" render={({ field }) => (<FormItem><FormLabel>Замын нөхцөл</FormLabel><FormControl><Input placeholder="Хэвийн, үзэгдэх орчин сайн" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  {updateForm.watch('status') === 'Delayed' && (
                    <FormField control={updateForm.control} name="delayReason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Саатлын шалтгаан</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Шалтгаан сонгох..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Weather">Цаг агаар (Шороон шуурга, цас)</SelectItem>
                            <SelectItem value="Mechanical">Техникийн саатал (Эвдрэл)</SelectItem>
                            <SelectItem value="Traffic">Замын түгжрэл / Засвар</SelectItem>
                            <SelectItem value="CustomerWait">Захиалагчийн саатал (Хүлээлгэсэн)</SelectItem>
                            <SelectItem value="Custom">Бусад</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormField control={updateForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Нэмэлт тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={isSubmittingUpdate}>
                    {isSubmittingUpdate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
                        {update.delayReason && <p className="text-destructive font-bold"><strong>Шалтгаан:</strong> {update.delayReason}</p>}
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
        const isUnloadChecklistComplete = checklist.unloadingPhotoTaken && checklist.unloadingDocumentsAttached && checklist.informedCustomerOnUnload;

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

            <Card>
              <CardHeader><CardTitle className="text-base">Буулгалтын нэмэлт үйлдлүүд</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2"><Checkbox id="unloadingPhotoTaken" checked={checklist.unloadingPhotoTaken} onCheckedChange={(checked) => handleUpdateChecklist('unloadingPhotoTaken', !!checked)} disabled={isUpdating} /><label htmlFor="unloadingPhotoTaken" className="text-sm font-medium">Буулгасан байдлын зураг авсан</label></div>
                <div className="flex items-center space-x-2"><Checkbox id="unloadingDocumentsAttached" checked={checklist.unloadingDocumentsAttached} onCheckedChange={(checked) => handleUpdateChecklist('unloadingDocumentsAttached', !!checked)} disabled={isUpdating} /><label htmlFor="unloadingDocumentsAttached" className="text-sm font-medium">Ачааны дагалдах бичиг баримт хавсаргасан</label></div>
                <div className="flex items-center space-x-2"><Checkbox id="informedCustomerOnUnload" checked={checklist.informedCustomerOnUnload} onCheckedChange={(checked) => handleUpdateChecklist('informedCustomerOnUnload', !!checked)} disabled={isUpdating} /><label htmlFor="informedCustomerOnUnload" className="text-sm font-medium">Захиалагчид мэдээлэл өгсөн</label></div>
              </CardContent>
            </Card>

            <Button onClick={() => handleStatusChange('Delivered')} disabled={!allUnloadingItemsChecked || !isUnloadChecklistComplete || isUpdating}>
              Хүргэлт дууссан
            </Button>
          </div>
        )

      case 'Delivered':
        const isEPODComplete = checklist.deliveryDocumentsSigned && checklist.unloadingPhotoTaken;
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Хүргэлтийн баталгаажуулалт (ePOD)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={cn(checklist.unloadingPhotoTaken ? "border-green-500 bg-green-50/30" : "")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Camera className="mr-2 h-4 w-4" /> Хүргэлтийн зураг
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                    {checklist.unloadingPhotoTaken ? (
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">Зураг баталгаажсан</p>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleUpdateChecklist('unloadingPhotoTaken', true)} disabled={isUpdating}>
                          Зураг оруулах
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">Ачаа буулгасан байдлын зураг</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(checklist.deliveryDocumentsSigned ? "border-green-500 bg-green-50/30" : "")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Pen className="mr-2 h-4 w-4" /> Дижитал гарын үсэг
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                    {checklist.deliveryDocumentsSigned ? (
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">Гарын үсэг зурагдсан</p>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleUpdateChecklist('deliveryDocumentsSigned', true)} disabled={isUpdating}>
                          Гарын үсэг зурах
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">Хүлээн авагчийн гарын үсэг</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {isEPODComplete ? (
              <Alert variant="success" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Тээвэрлэлт амжилттай</AlertTitle>
                <AlertDescription className="text-green-700">Бүх баримт бичиг баталгаажсан байна. Тээвэрлэлт албан ёсоор хаагдлаа.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="warning" className="bg-warning/10 border-warning">
                <Info className="h-4 w-4 text-warning" />
                <AlertTitle>Дутуу мэдээлэл</AlertTitle>
                <AlertDescription>Хүргэлтийг бүрэн дуусгахын тулд зураг болон гарын үсэг шаардлагатай.</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/shipments/${id}/report`}>
                  <FileText className="mr-2 h-4 w-4" /> Тайлан харах
                </Link>
              </Button>
              {isEPODComplete && (
                <Button variant="success" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" /> Хаах
                </Button>
              )}
            </div>
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
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Устгах
          </Button>
        </div>
        {shipment.status !== 'Delivered' && shipment.estimatedDeliveryDate < new Date() && (
          <Alert variant="destructive" className="mt-4 bg-destructive/5 border-destructive animate-pulse">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Анхааруулга: Тээвэрлэлт саатсан</AlertTitle>
            <AlertDescription>
              Төлөвлөсөн хүргэх огноо ({format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')}) өнгөрсөн байна. Шуурхай арга хэмжээ авна уу.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ShipmentMap
            isMapLoaded={isMapLoaded}
            loadError={loadError}
            hasApiKey={hasApiKey}
            startWarehouse={startWarehouse}
            endWarehouse={endWarehouse}
          />

          <ShipmentStatusTimeline
            currentStatus={shipment.status}
            statusTranslations={statusTranslations}
            onStatusClick={(newStatus) => setStatusChange({ newStatus, oldStatus: shipment.status })}
          />

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
          <ShipmentFinancials
            orderItem={orderItem}
            driverPrice={assignedDriver?.driverPrice || orderItem?.driverPrice || 0}
          />

          <ShipmentInfoSidebar
            shipment={shipment}
            cargo={cargo}
            packagingTypes={packagingTypes}
            statusTranslations={statusTranslations}
            getStatusBadgeVariant={getStatusBadgeVariant}
          />
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Та "{shipment?.shipmentNumber}" дугаартай тээвэрлэлтийг устгах гэж байна. Энэ үйлдэл нь холбогдох гэрээ, зааварчилгаа, явцын мэдээллийг хамт устгах бөгөөд захиалгын тээвэрлэлтийн статусыг буцаах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShipment} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? "Устгаж байна..." : "Тийм, устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
