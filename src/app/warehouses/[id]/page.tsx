
'use client';

import * as React from 'react';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Warehouse, Region } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MapPin, FileText, Info, Phone, Building, User } from 'lucide-react';

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium whitespace-pre-wrap">{value}</p>
        </div>
    </div>
  );
}

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [warehouse, setWarehouse] = React.useState<Warehouse | null>(null);
  const [regionName, setRegionName] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  
  const { isLoaded: isMapLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  });

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const fetchWarehouse = async () => {
      try {
        const docRef = doc(db, 'warehouses', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Warehouse;
          setWarehouse({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          });

          if (data.regionId) {
            const regionDoc = await getDoc(doc(db, 'regions', data.regionId));
            if (regionDoc.exists()) {
              setRegionName(regionDoc.data().name);
            }
          }

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Агуулах олдсонгүй.' });
          router.push('/warehouses');
        }
      } catch (error) {
        console.error("Error fetching warehouse:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarehouse();
  }, [id, router, toast]);

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
                <Skeleton className="h-10 w-36" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
            <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/warehouses')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Агуулахын жагсаалт
        </Button>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold">{warehouse.name}</h1>
                <p className="text-muted-foreground">
                Агуулахын дэлгэрэнгүй мэдээлэл.
                </p>
            </div>
             <Button asChild>
                <Link href={`/warehouses/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Мэдээлэл засах
                </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Агуулахын мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem icon={MapPin} label="Бүс нутаг" value={regionName} />
            <DetailItem icon={MapPin} label="Агуулахын байршил" value={warehouse.location} />
            <DetailItem icon={Building} label="Эзэмшигч байгууллага" value={warehouse.customerName} />
            <DetailItem icon={User} label="Холбоо барих хүний нэр" value={warehouse.contactName} />
            <DetailItem icon={Info} label="Албан тушаал" value={warehouse.contactPosition} />
            <DetailItem icon={Phone} label="Холбоо барих мэдээлэл" value={warehouse.contactInfo} />
            <DetailItem icon={Info} label="Ачих буулгах нөхцөл" value={warehouse.conditions} />
            <DetailItem icon={FileText} label="Тэмдэглэл" value={warehouse.note} />
          </CardContent>
        </Card>
        
        <div className="h-[400px] w-full rounded-lg overflow-hidden border">
           {isMapLoaded && warehouse.geolocation ? (
                <GoogleMap
                    mapContainerClassName="w-full h-full"
                    center={warehouse.geolocation}
                    zoom={15}
                >
                    <Marker position={warehouse.geolocation} />
                </GoogleMap>
            ) : (
                 <Skeleton className="h-full w-full" />
            )}
        </div>
      </div>
    </div>
  );
}
