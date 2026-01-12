'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MaintenanceForm, type MaintenanceFormValues } from '@/components/forms/maintenance-form';
import type { MaintenanceRecord } from '@/types';

export default function EditMaintenancePage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [maintenance, setMaintenance] = React.useState<MaintenanceRecord | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'maintenances', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const record = { id: docSnap.id, ...data } as MaintenanceRecord;

                    // Date conversions
                    if (data.date && typeof data.date.toDate === 'function') {
                        record.date = data.date.toDate();
                    } else if (data.date) {
                        record.date = new Date(data.date);
                    }

                    setMaintenance(record);
                } else {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Засварын бүртгэл олдсонгүй.' });
                    router.push('/maintenances');
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [id, toast, router]);

    async function onSubmit(values: MaintenanceFormValues, imageFiles: File[], removedImageUrls: string[]) {
        if (!id || !maintenance) return;
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
                    }
                }));
            }

            // 2. Upload new images
            let newImageUrls: string[] = [];
            if (imageFiles.length > 0) {
                const uploadPromises = imageFiles.map(file => {
                    const storageRef = ref(storage, `maintenance_attachments/${id}/${Date.now()}_${file.name}`);
                    return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
                });
                newImageUrls = await Promise.all(uploadPromises);
            }

            // Combine URLs
            const currentImages = maintenance.attachments || [];
            const keptImages = currentImages.filter(url => !removedImageUrls.includes(url));
            const finalImageUrls = [...keptImages, ...newImageUrls];

            const dataToUpdate: any = {
                ...values,
                attachments: finalImageUrls,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(doc(db, 'maintenances', id), dataToUpdate);

            // Update Vehicle Odometer logic check
            // Check if odometer changed and is higher than vehicle's current?
            if (values.odometer > 0) {
                const vehicleRef = doc(db, 'vehicles', values.vehicleId);
                const vehicleSnap = await getDoc(vehicleRef);
                if (vehicleSnap.exists()) {
                    const vData = vehicleSnap.data();
                    if ((vData.odometer || 0) < values.odometer) {
                        await updateDoc(vehicleRef, {
                            odometer: values.odometer,
                            lastOdometerUpdate: serverTimestamp()
                        });
                    }
                }
            }

            toast({
                title: 'Амжилттай!',
                description: `Засварын мэдээллийг шинэчиллээ.`,
            });
            router.push('/maintenances');
        } catch (error) {
            console.error("Error updating maintenance:", error)
            toast({
                variant: "destructive",
                title: 'Алдаа',
                description: `Засвар шинэчлэхэд алдаа гарлаа.`,
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
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </CardContent>
                </Card>
            </div>
        )
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
                <h1 className="text-3xl font-headline font-bold">Засвар засах</h1>
                <p className="text-muted-foreground">
                    Засварын мэдээллийг шинэчлэх.
                </p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    {maintenance && <MaintenanceForm initialData={maintenance} onSubmit={onSubmit} isSubmitting={isSubmitting} />}
                </CardContent>
            </Card>
        </div>
    );
}
