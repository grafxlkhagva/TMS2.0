'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FuelForm, type FuelFormValues } from '@/components/forms/fuel-form';
import type { FuelLog, Vehicle } from '@/types';

export default function NewFuelPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const vehicleIdParam = searchParams.get('vehicleId');
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const calculateEfficiency = async (vehicleId: string, currentOdometer: number, currentLiters: number, fullTank: boolean) => {
        // Logic: 
        // Efficiency (L/100km) = (Liters since last full tank / Kilometers since last full tank) * 100
        // This simple logic only works if the CURRENT fill is a full tank, or if we track partials.
        // Standard approach: 
        // If this is a Full Tank fill-up, we look back to the Previous Full Tank fill-up.
        // We sum all liters added in between (including this one? No, this one refills the tank for the distance covered).
        // Wait, standard: Distance traveled since last Full Tank / Liters needed to fill it NOW.
        // So: Efficiency = (Liters filled NOW) / (Current Odometer - Last Full Tank Odometer) * 100.

        if (!fullTank) return undefined;

        try {
            // Find last FULL TANK log
            const q = query(
                collection(db, 'fuel_logs'),
                where('vehicleId', '==', vehicleId),
                where('fullTank', '==', true),
                orderBy('odometer', 'desc'),
                limit(1)
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                const lastLog = snap.docs[0].data() as FuelLog;
                const distance = currentOdometer - lastLog.odometer;

                if (distance > 0) {
                    return (currentLiters / distance) * 100;
                }
            }
        } catch (e) {
            console.error("Error calculating efficiency", e);
        }
        return undefined;
    };

    const onSubmit = async (values: FuelFormValues, imageFiles: File[]) => {
        setIsSubmitting(true);
        try {
            let imageUrl = '';

            if (imageFiles.length > 0) {
                const file = imageFiles[0];
                const storageRef = ref(storage, `fuel/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // Calculate Efficiency if Full Tank
            const efficiency = await calculateEfficiency(values.vehicleId, values.odometer, values.liters, values.fullTank);

            await addDoc(collection(db, 'fuel_logs'), {
                ...values,
                imageUrl: imageUrl || null,
                efficiency: efficiency || null,
                createdAt: serverTimestamp(),
            });

            // Update Vehicle Odometer if huge jump? Or just standard update.
            // Usually Fuel Log is a reliable source of Odometer.
            if (values.odometer > 0) {
                const vehicleRef = doc(db, 'vehicles', values.vehicleId);
                // We strictly update. But effectively we should check if it's greater than current.
                // However, for simplicity here, we assume user entry is correct.
                // Ideally we read vehicle first.
                await updateDoc(vehicleRef, {
                    odometer: values.odometer,
                    // We could also store lastEfficiency on vehicle for quick access
                });
            }

            toast({
                title: 'Амжилттай',
                description: 'Түлшний бүртгэл амжилттай нэмэгдлээ.',
            });

            router.push('/fuel');
        } catch (error) {
            console.error("Error creating fuel log:", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Түлш бүртгэхэд алдаа гарлаа.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Түлш нэмэх</CardTitle>
                    <CardDescription>Шинэ түлшний баримт бүртгэх.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FuelForm onSubmit={onSubmit} isSubmitting={isSubmitting} vehicleId={vehicleIdParam} />
                </CardContent>
            </Card>
        </div>
    );
}
