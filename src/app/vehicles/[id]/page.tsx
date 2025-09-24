
'use client';

import * as React from 'react';
import { doc, getDoc, getDocs, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Vehicle, VehicleType, TrailerType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, Hash, Car, Container, Droplet, StickyNote, User } from 'lucide-react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="font-medium">{value}</div>
        </div>
    </div>
  );
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [vehicleTypeName, setVehicleTypeName] = React.useState('');
  const [trailerTypeName, setTrailerTypeName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const fetchVehicle = async () => {
      try {
        const docRef = doc(db, 'vehicles', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Vehicle;
          setVehicle({
            id: docSnap.id,
            ...data,
          });

          if (data.vehicleTypeId) {
            const typeDoc = await getDoc(doc(db, 'vehicle_types', data.vehicleTypeId));
            if (typeDoc.exists()) setVehicleTypeName(typeDoc.data().name);
          }
          if (data.trailerTypeId) {
            const typeDoc = await getDoc(doc(db, 'trailer_types', data.trailerTypeId));
            if (typeDoc.exists()) setTrailerTypeName(typeDoc.data().name);
          }

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл олдсонгүй.' });
          router.push('/vehicles');
        }
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicle();
  }, [id, router, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
            <Skeleton className="h-8 w-24 mb-4" />
             <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
                <Skeleton className="h-96 w-full rounded-lg" />
            </div>
            <Card>
                <CardHeader> <Skeleton className="h-6 w-1/2" /> </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/vehicles')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
        </Button>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold">{vehicle.makeName} {vehicle.modelName}</h1>
                <p className="text-muted-foreground font-mono">
                    {vehicle.licensePlate}
                </p>
            </div>
             <Button asChild>
                <Link href={`/vehicles/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Мэдээлэл засах
                </Link>
            </Button>
        </div>
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
            <Card>
                <CardContent className="p-4">
                   <Carousel className="w-full">
                        <CarouselContent>
                           {(vehicle.imageUrls && vehicle.imageUrls.length > 0) ? (
                                vehicle.imageUrls.map((url, index) => (
                                    <CarouselItem key={index}>
                                        <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
                                             <Image src={url} alt={`${vehicle.makeName} ${vehicle.modelName} - зураг ${index + 1}`} fill className="object-contain" />
                                        </div>
                                    </CarouselItem>
                                ))
                           ) : (
                               <CarouselItem>
                                 <div className="aspect-video relative rounded-md overflow-hidden bg-muted flex items-center justify-center h-full text-muted-foreground">
                                    <Car className="h-24 w-24" />
                                </div>
                               </CarouselItem>
                           )}
                        </CarouselContent>
                         {(vehicle.imageUrls && vehicle.imageUrls.length > 1) && (
                            <>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                            </>
                         )}
                    </Carousel>
                </CardContent>
            </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Үзүүлэлтүүд</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem icon={Calendar} label="Үйлдвэрлэсэн / Орж ирсэн он" value={`${vehicle.year} / ${vehicle.importedYear}`} />
            <DetailItem icon={Hash} label="Арлын дугаар (VIN)" value={vehicle.vin} />
            <DetailItem icon={Car} label="Машины төрөл" value={vehicleTypeName} />
            <DetailItem icon={Container} label="Тэвшний төрөл" value={trailerTypeName} />
            <DetailItem icon={Hash} label="Даац / Хэмжээ" value={vehicle.capacity} />
            <DetailItem icon={Droplet} label="Шатахууны төрөл" value={vehicle.fuelType} />
            <DetailItem icon={User} label="Оноосон жолооч" value={vehicle.driverName || 'Оноогоогүй'} />
            <DetailItem icon={StickyNote} label="Тэмдэглэл" value={vehicle.notes} />
          </CardContent>
        </Card>
       </div>
    </div>
  );
}
