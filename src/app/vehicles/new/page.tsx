'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleForm, type VehicleFormValues } from '@/components/forms/vehicle-form';

export default function NewVehiclePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit(values: VehicleFormValues, imageFiles: File[]) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэвтэрч орсоны дараа үргэлжлүүлнэ үү.' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Улсын дугаар үүсгэх (хоосон байж болно)
      const licensePlateChars = `${values.licensePlateChar1 || ''}${values.licensePlateChar2 || ''}${values.licensePlateChar3 || ''}`;
      const licensePlate = values.licensePlateDigits 
        ? `${values.licensePlateDigits} ${licensePlateChars}`.trim() 
        : '';

      const trailerLicensePlateChars = `${values.trailerLicensePlateChar1 || ''}${values.trailerLicensePlateChar2 || ''}`;
      const trailerLicensePlate = values.trailerLicensePlateDigits ? `${values.trailerLicensePlateDigits} ${trailerLicensePlateChars}` : '';

      // Extract specific fields to spread the rest
      const {
        licensePlateChar1, licensePlateChar2, licensePlateChar3,
        trailerLicensePlateChar1, trailerLicensePlateChar2,
        specs, dates, odometer,
        ...restOfValues
      } = values;

      // Prepare specs and dates, removing undefined
      const cleanSpecs = specs ? Object.fromEntries(Object.entries(specs).filter(([_, v]) => v !== undefined && v !== '')) : {};
      const cleanDates = dates ? Object.fromEntries(Object.entries(dates).filter(([_, v]) => v !== undefined)) : {};

      // Make болон Model нэр татах (хоосон байж болно)
      const { getDoc, doc } = await import('firebase/firestore');
      let makeName = '';
      let modelName = '';
      
      if (values.makeId) {
        const makeSnap = await getDoc(doc(db, 'vehicle_makes', values.makeId));
        makeName = makeSnap.exists() ? makeSnap.data().name : '';
      }
      
      if (values.modelId) {
        const modelSnap = await getDoc(doc(db, 'vehicle_models', values.modelId));
        modelName = modelSnap.exists() ? modelSnap.data().name : '';
      }

      const docRef = await addDoc(collection(db, 'vehicles'), {
        ...restOfValues,
        licensePlate,
        licensePlateDigits: values.licensePlateDigits || '',
        licensePlateChars: [values.licensePlateChar1 || '', values.licensePlateChar2 || '', values.licensePlateChar3 || ''],
        trailerLicensePlate,
        trailerLicensePlateDigits: values.trailerLicensePlateDigits || '',
        trailerLicensePlateChars: values.trailerLicensePlateDigits ? [values.trailerLicensePlateChar1, values.trailerLicensePlateChar2] : [],
        makeName,
        modelName,
        status: 'Available',
        driverId: null,
        driverName: null,
        imageUrls: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
        odometer: odometer || 0,
        specs: cleanSpecs,
        dates: Object.keys(cleanDates).length > 0 ? cleanDates : null
      });

      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(file => {
          const storageRef = ref(storage, `vehicle_images/${docRef.id}/${Date.now()}_${file.name}`);
          return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });
        const urls = await Promise.all(uploadPromises);
        await updateDoc(docRef, { imageUrls: urls });
      }

      toast({
        title: 'Амжилттай!',
        description: `Тээврийн хэрэгслийг системд бүртгэлээ.`,
      });
      router.push('/vehicles');
    } catch (error) {
      console.error("Error adding vehicle:", error)
      toast({
        variant: "destructive",
        title: 'Алдаа',
        description: `Тээврийн хэрэгсэл бүртгэхэд алдаа гарлаа.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/vehicles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Шинэ тээврийн хэрэгсэл</h1>
        <p className="text-muted-foreground">
          Үндсэн мэдээллийг бөглөж шинээр тээврийн хэрэгсэл бүртгэнэ үү.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <VehicleForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}
