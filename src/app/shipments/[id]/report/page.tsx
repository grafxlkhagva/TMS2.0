
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Shipment, OrderItemCargo, PackagingType, ShipmentUpdate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileDown } from 'lucide-react';
import ShipmentReportLayout from '@/components/shipment-report-layout';

export default function ShipmentReportPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { toast } = useToast();
    const reportRef = React.useRef<HTMLDivElement>(null);

    const [shipment, setShipment] = React.useState<Shipment | null>(null);
    const [cargo, setCargo] = React.useState<OrderItemCargo[]>([]);
    const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
    const [shipmentUpdates, setShipmentUpdates] = React.useState<ShipmentUpdate[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const shipmentDocRef = doc(db, 'shipments', id);
                const shipmentDocSnap = await getDoc(shipmentDocRef);

                if (!shipmentDocSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт олдсонгүй.' });
                    router.push('/shipments');
                    return;
                }

                const shipmentData = {
                    id: shipmentDocSnap.id,
                    ...shipmentDocSnap.data(),
                    createdAt: shipmentDocSnap.data().createdAt.toDate(),
                } as Shipment;
                setShipment(shipmentData);

                const [cargoSnap, packagingSnap, updatesSnap] = await Promise.all([
                    getDocs(query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', shipmentData.orderItemId))),
                    getDocs(query(collection(db, 'packaging_types'))),
                    getDocs(query(collection(db, 'shipment_updates'), where('shipmentId', '==', id)))
                ]);

                setCargo(cargoSnap.docs.map(d => d.data() as OrderItemCargo));
                setPackagingTypes(packagingSnap.docs.map(d => ({ id: d.id, ...d.data() } as PackagingType)));
                setShipmentUpdates(updatesSnap.docs.map(d => ({id: d.id, ...d.data(), createdAt: d.data().createdAt.toDate()} as ShipmentUpdate)));
                
            } catch (error) {
                console.error("Error fetching report data:", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Тайлангийн мэдээлэл татахад алдаа гарлаа.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, router, toast]);

    const handlePrint = () => {
        window.print();
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <div className="border rounded-lg p-8">
                   <Skeleton className="h-6 w-1/2 mx-auto mb-2" />
                   <Skeleton className="h-5 w-1/3 mx-auto mb-8" />
                   <Skeleton className="h-32 w-full mb-6" />
                   <Skeleton className="h-48 w-full" />
                </div>
            </div>
        )
    }

    if (!shipment) {
        return null; // Or some error component
    }

    return (
        <div className="bg-muted">
            <div className="container mx-auto py-6">
                 <div className="mb-6 flex justify-between items-center print:hidden">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/shipments/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Дэлгэрэнгүй рүү буцах
                        </Link>
                    </Button>
                    <Button onClick={handlePrint}>
                        <FileDown className="mr-2 h-4 w-4"/> Тайлан татах/хэвлэх
                    </Button>
                </div>
                <div className="bg-white shadow-lg rounded-lg">
                    <ShipmentReportLayout 
                        ref={reportRef}
                        shipment={shipment}
                        cargo={cargo}
                        packagingTypes={packagingTypes}
                        shipmentUpdates={shipmentUpdates}
                    />
                </div>
            </div>
        </div>
    )
}
