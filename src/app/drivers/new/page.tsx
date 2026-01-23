
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, Camera, Upload } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DriverStatus } from '@/types';
import { useAuth } from '@/hooks/use-auth';

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
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const driverStatuses: DriverStatus[] = ['Active', 'Inactive', 'On Leave'];

const formSchema = z.object({
  display_name: z.string().min(2, { message: 'Нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone_number: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  status: z.custom<DriverStatus>(val => driverStatuses.includes(val as DriverStatus)),
});

type FormValues = z.infer<typeof formSchema>;

import { DriverForm, DriverFormValues } from '@/components/forms/driver-form';

export default function NewDriverPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit(values: DriverFormValues, avatarFile: File | null, licenseFiles: { front: File | null; back: File | null }) {
    if (!db || !storage || !user) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Системтэй холбогдож чадсангүй.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanedValues = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, 'Drivers'), {
        ...cleanedValues,
        photo_url: '',
        licenseImageFrontUrl: '',
        licenseImageBackUrl: '',
        created_time: serverTimestamp(),
        edited_time: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
      });

      const updates: any = {};

      if (avatarFile) {
        const storageRef = ref(storage, `driver_avatars/${docRef.id}/${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        updates.photo_url = await getDownloadURL(snapshot.ref);
      }

      // Үнэмлэхний урд тал
      if (licenseFiles.front) {
        const storageRef = ref(storage, `driver_licenses/${docRef.id}/front_${licenseFiles.front.name}`);
        const snapshot = await uploadBytes(storageRef, licenseFiles.front);
        updates.licenseImageFrontUrl = await getDownloadURL(snapshot.ref);
      }

      // Үнэмлэхний ар тал
      if (licenseFiles.back) {
        const storageRef = ref(storage, `driver_licenses/${docRef.id}/back_${licenseFiles.back.name}`);
        const snapshot = await uploadBytes(storageRef, licenseFiles.back);
        updates.licenseImageBackUrl = await getDownloadURL(snapshot.ref);
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'Drivers', docRef.id), updates);
      }

      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${values.display_name} нэртэй жолоочийг системд бүртгэлээ.`,
      });

      router.push('/drivers');

    } catch (error) {
      console.error('Error creating driver:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Жолооч бүртгэхэд алдаа гарлаа.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/drivers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Шинэ жолооч бүртгэх</h1>
        <p className="text-muted-foreground">
          Жолоочийн дэлгэрэнгүй мэдээллийг оруулна уу.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DriverForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}
