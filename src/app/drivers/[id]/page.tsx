
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Driver, DriverStatus, Vehicle } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Phone, CheckCircle, XCircle, Clock, User, Car } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
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

function StatusBadge({ status }: { status: DriverStatus }) {
    const variant = status === 'Active' ? 'success' : status === 'On Leave' ? 'warning' : 'secondary';
    const text = status === 'Active' ? 'Идэвхтэй' : status === 'On Leave' ? 'Чөлөөнд' : 'Идэвхгүй';
    const Icon = status === 'Active' ? CheckCircle : status === 'On Leave' ? Clock : XCircle;
    return <Badge variant={variant}><Icon className="mr-1 h-3 w-3" />{text}</Badge>;
}

const toDateSafe = (date: any): Date => {
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
          return parsed;
      }
  }
  return new Date(); 
};


export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [driver, setDriver] = React.useState<Driver | null>(null);
  const [assignedVehicle, setAssignedVehicle] = React.useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const fetchDriverData = async () => {
      try {
        const driverDocRef = doc(db, 'Drivers', id);
        const driverDocSnap = await getDoc(driverDocRef);

        if (driverDocSnap.exists()) {
          const driverData = {
            id: driverDocSnap.id,
            ...driverDocSnap.data(),
            created_time: toDateSafe(driverDocSnap.data().created_time),
          } as Driver;
          setDriver(driverData);

          // Fetch assigned vehicle
          const vehicleQuery = query(collection(db, 'vehicles'), where('driverId', '==', id));
          const vehicleSnapshot = await getDocs(vehicleQuery);
          if (!vehicleSnapshot.empty) {
            const vehicleDoc = vehicleSnapshot.docs[0];
            setAssignedVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle);
          }

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч олдсонгүй.' });
          router.push('/drivers');
        }
      } catch (error) {
        console.error("Error fetching driver data:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriverData();
  }, [id, router, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <Skeleton className="h-10 w-36" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
                <CardHeader> <Skeleton className="h-6 w-1/2" /> </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
             <Card className="md:col-span-2">
                <CardHeader> <Skeleton className="h-6 w-1/2" /> </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/drivers')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Жолооч нарын жагсаалт
        </Button>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border">
                    <AvatarImage src={driver.photo_url} alt={driver.display_name} />
                    <AvatarFallback className="text-3xl">
                        {driver.display_name?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-3xl font-headline font-bold">{driver.display_name}</h1>
                    <p className="text-muted-foreground">
                        Жолоочийн дэлгэрэнгүй мэдээлэл.
                    </p>
                </div>
            </div>
             <Button asChild>
                <Link href={`/drivers/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Мэдээлэл засах
                </Link>
            </Button>
        </div>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Хувийн мэдээлэл</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem icon={Phone} label="Утасны дугаар" value={driver.phone_number} />
                <DetailItem icon={CheckCircle} label="Статус" value={<StatusBadge status={driver.status} />} />
                 <DetailItem 
                    icon={User} 
                    label="Гэрээт тээвэрт явах" 
                    value={driver.isAvailableForContracted ? 'Тийм' : 'Үгүй'} 
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Оноосон тээврийн хэрэгсэл</CardTitle>
                </CardHeader>
                <CardContent>
                    {assignedVehicle ? (
                        <div className="flex items-center gap-4 p-3 rounded-md border bg-muted">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={assignedVehicle.imageUrls?.[0]} />
                                <AvatarFallback>{assignedVehicle.makeName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold font-mono text-lg">{assignedVehicle.licensePlate}</p>
                                <p className="text-sm text-muted-foreground">{assignedVehicle.makeName} {assignedVehicle.modelName} ({assignedVehicle.year})</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-24 rounded-md border-dashed border-2">
                             <p className="text-sm text-muted-foreground">Оноосон тээврийн хэрэгсэл байхгүй байна.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
       </div>
    </div>
  );
}
