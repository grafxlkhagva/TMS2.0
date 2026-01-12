'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDoc, runTransaction } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MaintenanceForm, type MaintenanceFormValues } from '@/components/forms/maintenance-form';

export default function NewMaintenancePage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const preselectedVehicleId = searchParams.get('vehicleId') || undefined;

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    async function onSubmit(values: MaintenanceFormValues, imageFiles: File[]) {
        if (!user) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэвтэрч орсоны дараа үргэлжлүүлнэ үү.' });
            return;
        }
        setIsSubmitting(true);
        try {
            if (!db) throw new Error("Firestore not initialized");

            // Upload images first? Or after doc creation? 
            // Usually after to put in folders by ID.
            // But we can generate ID or use a temp folder.
            // Let's create doc first.

            const docData = {
                ...values,
                attachments: [],
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: `${user.lastName} ${user.firstName}`,
            };

            const docRef = await addDoc(collection(db, 'maintenances'), docData);

            // Handle Image Uploads
            if (imageFiles.length > 0) {
                const uploadPromises = imageFiles.map(file => {
                    const storageRef = ref(storage, `maintenance_attachments/${docRef.id}/${Date.now()}_${file.name}`);
                    return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
                });
                const urls = await Promise.all(uploadPromises);
                await updateDoc(docRef, { attachments: urls });
            }

            // Update Vehicle Odometer if necessary
            // We should check current odometer first.
            // Using a transaction would be best but allow simple update for now to avoid complexity if offline persistence is on/etc.
            // But let's try to be safe.
            const vehicleRef = doc(db, 'vehicles', values.vehicleId);
            const vehicleSnap = await getDoc(vehicleRef);

            if (vehicleSnap.exists()) {
                const vehicleData = vehicleSnap.data();
                const currentOdometer = vehicleData.odometer || 0;

                if (values.odometer > currentOdometer) {
                    await updateDoc(vehicleRef, {
                        odometer: values.odometer,
                        lastOdometerUpdate: serverTimestamp()
                    });
                }
            }

            toast({
                title: 'Амжилттай!',
                description: `Засварын бүртгэлийг хадгаллаа.`,
            });
            router.push('/maintenances');
        } catch (error) {
            console.error("Error adding maintenance:", error)
            toast({
                variant: "destructive",
                title: 'Алдаа',
                description: `Засварын бүртгэл хадгалахад алдаа гарлаа.`,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="outline" size="sm" asChild className="mb-4">
                    <Link href="/maintenances">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Буцах
                    </Link>
                </Button>
                <h1 className="text-3xl font-headline font-bold">Шинэ засвар бүртгэх</h1>
                <p className="text-muted-foreground">
                    Техникийн засвар, үйлчилгээний мэдээллийг оруулна уу.
                </p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <MaintenanceForm
                        onSubmit={onSubmit}
                        isSubmitting={isSubmitting}
                        preselectedVehicleId={preselectedVehicleId}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
