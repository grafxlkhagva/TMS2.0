

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, Camera } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Driver, DriverStatus } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';

const driverStatuses: DriverStatus[] = ['Active', 'Inactive', 'On Leave'];

const formSchema = z.object({
  display_name: z.string().min(2, { message: 'Нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone_number: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  status: z.custom<DriverStatus>(val => driverStatuses.includes(val as DriverStatus)),
  isAvailableForContracted: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

import { DriverForm, DriverFormValues } from '@/components/forms/driver-form';

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [initialData, setInitialData] = React.useState<Driver | undefined>(undefined);

  React.useEffect(() => {
    if (!id || !db) return;
    const fetchDriver = async () => {
      try {
        const docRef = doc(db!, 'Drivers', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInitialData({ id: docSnap.id, ...docSnap.data() } as Driver);
        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч олдсонгүй.' });
          router.push(`/drivers`);
        }
      } catch (error) {
        console.error("Error fetching driver:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолоочийн мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDriver();
  }, [id, router, toast]);

  async function onSubmit(values: DriverFormValues, avatarFile: File | null, licenseFiles: { front: File | null; back: File | null }) {
    if (!id || !db || !storage) return;
    setIsSubmitting(true);
    try {
      const driverRef = doc(db, 'Drivers', id);
      const cleanedValues = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined)
      );

      let dataToUpdate: any = {
        ...cleanedValues,
        edited_time: serverTimestamp(),
      };

      if (avatarFile) {
        const storageRef = ref(storage, `driver_avatars/${id}/${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        dataToUpdate.photo_url = await getDownloadURL(snapshot.ref);
      }

      // Үнэмлэхний урд тал
      if (licenseFiles.front) {
        const storageRef = ref(storage, `driver_licenses/${id}/front_${licenseFiles.front.name}`);
        const snapshot = await uploadBytes(storageRef, licenseFiles.front);
        dataToUpdate.licenseImageFrontUrl = await getDownloadURL(snapshot.ref);
      }

      // Үнэмлэхний ар тал
      if (licenseFiles.back) {
        const storageRef = ref(storage, `driver_licenses/${id}/back_${licenseFiles.back.name}`);
        const snapshot = await uploadBytes(storageRef, licenseFiles.back);
        dataToUpdate.licenseImageBackUrl = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(driverRef, dataToUpdate);

      toast({
        title: 'Амжилттай шинэчиллээ',
        description: `${values.display_name} жолоочийн мэдээллийг шинэчиллээ.`,
      });

      router.push(`/drivers`);

    } catch (error) {
      console.error('Error updating driver:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Жолооч шинэчлэхэд алдаа гарлаа.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6"><Skeleton className="h-8 w-1/4 mb-4" /><Skeleton className="h-4 w-1/2" /></div>
        <Card>
          <CardContent className="pt-6 space-y-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end gap-2"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-24" /></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href={`/drivers`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Жолоочийн мэдээлэл засах</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Хувийн мэдээлэл</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <DriverForm initialData={initialData} onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}
