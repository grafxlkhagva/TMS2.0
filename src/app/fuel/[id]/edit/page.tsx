'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FuelForm, type FuelFormValues } from '@/components/forms/fuel-form';
import type { FuelLog } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EditFuelPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();

    const [log, setLog] = React.useState<FuelLog | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!id) return;
        const fetchLog = async () => {
            try {
                const docRef = doc(db, 'fuel_logs', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.date?.toDate) data.date = data.date.toDate();
                    setLog({ id: snap.id, ...data } as FuelLog);
                } else {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Түлшний бүртгэл олдсонгүй.' });
                    router.push('/fuel');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLog();
    }, [id, router, toast]);

    const onSubmit = async (values: FuelFormValues, imageFiles: File[], removedImageUrls: string[]) => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            let imageUrl = log?.imageUrl;

            // Handle new image
            if (imageFiles.length > 0) {
                const file = imageFiles[0];
                const storageRef = ref(storage, `fuel/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // Handle removed image
            if (removedImageUrls.length > 0) {
                imageUrl = null;
            }

            await updateDoc(doc(db, 'fuel_logs', id), {
                ...values,
                imageUrl: imageUrl,
                // We typically re-calculate efficiency if Liters/Odometer changed, but that's complex complex for Edit. 
                // For now, let's skip re-calc on edit to avoid chain reaction bugs.
            });

            toast({
                title: 'Амжилттай',
                description: 'Түлшний бүртгэл шинэчлэгдлээ.',
            });

            router.push('/fuel');
        } catch (error) {
            console.error("Error updating fuel log:", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Шинэчлэхэд алдаа гарлаа.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'fuel_logs', id));
            toast({ title: 'Амжилттай', description: 'Устгагдлаа.' });
            router.push('/fuel');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.' });
        }
    };

    if (isLoading) return <div className="container py-6"><Skeleton className="h-[500px]" /></div>;
    if (!log) return null;

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Түлшний бүртгэл засах</CardTitle>
                        <CardDescription>Мэдээлэл шинэчлэх.</CardDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Итгэлтэй байна уу?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Энэ бүртгэлийг устгах гэж байна.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Устгах</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                </CardHeader>
                <CardContent>
                    <FuelForm initialData={log} onSubmit={onSubmit} isSubmitting={isSubmitting} />
                </CardContent>
            </Card>
        </div>
    );
}
