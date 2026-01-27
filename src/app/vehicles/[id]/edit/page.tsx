'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleForm, type VehicleFormValues } from '@/components/forms/vehicle-form';
import type { Vehicle } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'vehicles', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Need to convert Firestore Timestamps to Dates if necessary
          // Although VehicleForm converts them in defaultValues
          const data = docSnap.data();
          const vehicleData = { id: docSnap.id, ...data } as Vehicle;
          // Ensure dates object exists if not present
          if (!vehicleData.dates) vehicleData.dates = {};
          if (!vehicleData.specs) vehicleData.specs = {};

          // Convert timestamps to dates for the type safety if passing to form?
          // VehicleForm does: initialData?.dates?.purchase ? new Date(initialData.dates.purchase) : undefined
          // Firestore returns Timestamp objects which have toDate(). 
          // Type assertion `as Vehicle` implies Dates but Firestore gives Timestamps.
          // Let's manually convert the known date fields to Date objects if they are Timestamps
          // Helper function? 
          const convertTimestamp = (ts: any) => ts && typeof ts.toDate === 'function' ? ts.toDate() : (ts ? new Date(ts) : undefined);

          if (vehicleData.dates) {
            vehicleData.dates.purchase = convertTimestamp(vehicleData.dates.purchase);
            vehicleData.dates.warrantyExpiry = convertTimestamp(vehicleData.dates.warrantyExpiry);
            vehicleData.dates.registrationExpiry = convertTimestamp(vehicleData.dates.registrationExpiry);
            vehicleData.dates.insuranceExpiry = convertTimestamp(vehicleData.dates.insuranceExpiry);
            vehicleData.dates.roadPermitExpiry = convertTimestamp(vehicleData.dates.roadPermitExpiry);
            vehicleData.dates.inspectionExpiry = convertTimestamp(vehicleData.dates.inspectionExpiry);
          }

          setVehicle(vehicleData);
        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл олдсонгүй.' });
          router.push('/vehicles');
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, toast, router]);

  async function onSubmit(values: VehicleFormValues, imageFiles: File[], removedImageUrls: string[]) {
    if (!id || !vehicle) return;
    setIsSubmitting(true);
    try {
      // 1. Delete removed images
      if (removedImageUrls.length > 0) {
        await Promise.all(removedImageUrls.map(async (url) => {
          try {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef);
          } catch (e) {
            console.error("Error deleting image:", e);
            // Continue even if fail
          }
        }));
      }

      // 2. Upload new images
      let newImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(file => {
          const storageRef = ref(storage, `vehicle_images/${id}/${Date.now()}_${file.name}`);
          return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });
        newImageUrls = await Promise.all(uploadPromises);
      }

      // Combine URLs: Filter removed ones from existing, then add new ones
      const currentImages = vehicle.imageUrls || [];
      const keptImages = currentImages.filter(url => !removedImageUrls.includes(url));
      const finalImageUrls = [...keptImages, ...newImageUrls];

      const licensePlateChars = `${values.licensePlateChar1}${values.licensePlateChar2}${values.licensePlateChar3}`;
      const licensePlate = `${values.licensePlateDigits} ${licensePlateChars}`;

      const trailerLicensePlateChars = `${values.trailerLicensePlateChar1 || ''}${values.trailerLicensePlateChar2 || ''}`;
      const trailerLicensePlate = values.trailerLicensePlateDigits ? `${values.trailerLicensePlateDigits} ${trailerLicensePlateChars}` : '';

      // Extract specific fields 
      const {
        licensePlateChar1, licensePlateChar2, licensePlateChar3,
        trailerLicensePlateChar1, trailerLicensePlateChar2,
        specs, dates, odometer,
        ...restOfValues
      } = values;

      // Clean specs/dates
      const cleanSpecs = specs ? Object.fromEntries(Object.entries(specs).filter(([_, v]) => v !== undefined && v !== '')) : {};
      const cleanDates = dates ? Object.fromEntries(Object.entries(dates).filter(([_, v]) => v !== undefined)) : {};

      // Fetch make/model names if changed (or just always fetch to be safe/consistent)
      // Optimization: check if ID changed. But simplifying: just fetch.
      const { getDoc, doc } = await import('firebase/firestore');
      const makeSnap = await getDoc(doc(db, 'vehicle_makes', values.makeId));
      const modelSnap = await getDoc(doc(db, 'vehicle_models', values.modelId));

      const makeName = makeSnap.exists() ? makeSnap.data().name : '';
      const modelName = modelSnap.exists() ? modelSnap.data().name : '';

      const dataToUpdate: any = {
        ...restOfValues,
        licensePlate,
        licensePlateDigits: values.licensePlateDigits,
        licensePlateChars: [values.licensePlateChar1, values.licensePlateChar2, values.licensePlateChar3],
        trailerLicensePlate,
        trailerLicensePlateDigits: values.trailerLicensePlateDigits,
        trailerLicensePlateChars: values.trailerLicensePlateDigits ? [values.trailerLicensePlateChar1, values.trailerLicensePlateChar2] : [],
        makeName, // Update names in case they changed
        modelName,
        imageUrls: finalImageUrls,
        updatedAt: serverTimestamp(),
        odometer: odometer || 0,
        specs: cleanSpecs,
        dates: Object.keys(cleanDates).length > 0 ? cleanDates : null
      };

      await updateDoc(doc(db, 'vehicles', id), dataToUpdate);

      toast({
        title: 'Амжилттай!',
        description: `Тээврийн хэрэгслийн мэдээллийг шинэчиллээ.`,
      });
      router.push('/vehicles');
    } catch (error) {
      console.error("Error updating vehicle:", error)
      toast({
        variant: "destructive",
        title: 'Алдаа',
        description: `Тээврийн хэрэгсэл шинэчлэхэд алдаа гарлаа.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id || !vehicle) return;
    setIsDeleting(true);
    try {
      // Зургуудыг устгах
      if (vehicle.imageUrls && vehicle.imageUrls.length > 0) {
        await Promise.all(vehicle.imageUrls.map(async (url) => {
          try {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef);
          } catch (e) {
            console.error("Error deleting image:", e);
          }
        }));
      }

      // Firestore-оос устгах
      await deleteDoc(doc(db, 'vehicles', id));

      toast({
        title: 'Амжилттай устгалаа',
        description: `${vehicle.licensePlate} дугаартай тээврийн хэрэгслийг устгалаа.`,
      });
      router.push('/vehicles');
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Тээврийн хэрэгсэл устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6"><Skeleton className="h-8 w-1/4 mb-4" /><Skeleton className="h-4 w-1/2" /></div>
        <Card>
          <CardContent className="pt-6 space-y-8">
            <Skeleton className="h-24 w-full" />
            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/vehicles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Буцах
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Устгах
          </Button>
        </div>
        <h1 className="text-3xl font-headline font-bold">Тээврийн хэрэгсэл засах</h1>
        <p className="text-muted-foreground">
          Тээврийн хэрэгслийн мэдээллийг шинэчлэх.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {vehicle && <VehicleForm initialData={vehicle} onSubmit={onSubmit} isSubmitting={isSubmitting} />}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              "{vehicle?.licensePlate}" дугаартай тээврийн хэрэгслийг устгах гэж байна. 
              Энэ үйлдлийг буцаах боломжгүй бөгөөд холбоотой бүх зураг устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
