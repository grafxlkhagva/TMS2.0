'use client';

import * as React from 'react';
import { doc, getDoc, getDocs, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Vehicle, MaintenanceRecord, VehicleAssignment, FuelLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, Hash, Car, Container, Droplet, StickyNote, User, Wrench, PlusCircle, Gauge, Settings, History, UserPlus } from 'lucide-react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AssignVehicleDialog } from '@/components/assign-vehicle-dialog';
import { AssignmentHistoryTable } from '@/components/assignment-history-table';
import { unassignVehicle } from '@/lib/assignment-service';
import { useAuth } from '@/hooks/use-auth';
import { XCircle, Loader2 } from 'lucide-react';

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | React.ReactNode }) {
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

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(amount);
};

const getStatusBadge = (status: MaintenanceRecord['status']) => {
  const variant = status === 'Completed' ? 'success' : status === 'In Progress' ? 'warning' : status === 'Cancelled' ? 'destructive' : 'default';
  const label = status === 'Completed' ? 'Дууссан' : status === 'In Progress' ? 'Хийгдэж буй' : status === 'Cancelled' ? 'Цуцлагдсан' : 'Төлөвлөсөн';
  return <Badge variant={variant}>{label}</Badge>;
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [vehicleTypeName, setVehicleTypeName] = React.useState('');
  const [trailerTypeName, setTrailerTypeName] = React.useState('');
  const [maintenances, setMaintenances] = React.useState<MaintenanceRecord[]>([]);
  const [assignments, setAssignments] = React.useState<VehicleAssignment[]>([]);
  const [fuelLogs, setFuelLogs] = React.useState<FuelLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isUnassigning, setIsUnassigning] = React.useState(false);

  const { user } = useAuth();

  const fetchData = React.useCallback(async () => {
    if (!id || !db) return;
    setIsLoading(true);
    try {
      // Fetch Vehicle
      const vehicleRef = doc(db, 'vehicles', id);
      const vehicleSnap = await getDoc(vehicleRef);

      if (vehicleSnap.exists()) {
        const data = vehicleSnap.data() as Vehicle;
        setVehicle({
          ...data,
          id: vehicleSnap.id,
        });

        // Fetch Types
        if (data.vehicleTypeId) {
          const typeDoc = await getDoc(doc(db, 'vehicle_types', data.vehicleTypeId));
          if (typeDoc.exists()) setVehicleTypeName(typeDoc.data().name);
        }
        if (data.trailerTypeId) {
          const typeDoc = await getDoc(doc(db, 'trailer_types', data.trailerTypeId));
          if (typeDoc.exists()) setTrailerTypeName(typeDoc.data().name);
        }

        // Fetch Maintenances
        const maintenanceQuery = query(
          collection(db, 'maintenances'),
          where('vehicleId', '==', id),
          orderBy('date', 'desc')
        );
        const maintenanceSnap = await getDocs(maintenanceQuery);
        const maintenanceData = maintenanceSnap.docs.map(doc => {
          const d = doc.data();
          // Timestamp conversion
          if (d.date instanceof Timestamp) d.date = d.date.toDate();
          if (d.createdAt instanceof Timestamp) d.createdAt = d.createdAt.toDate();
          return { id: doc.id, ...d } as MaintenanceRecord;
        });
        setMaintenances(maintenanceData);

        // Fetch Assignments
        const assignmentQuery = query(
          collection(db, 'vehicle_assignments'),
          where('vehicleId', '==', id),
          orderBy('assignedAt', 'desc')
        );
        const assignmentSnap = await getDocs(assignmentQuery);
        const assignmentData = assignmentSnap.docs.map(doc => {
          const d = doc.data();
          if (d.assignedAt instanceof Timestamp) d.assignedAt = d.assignedAt.toDate();
          if (d.endedAt instanceof Timestamp) d.endedAt = d.endedAt.toDate();
          return { id: doc.id, ...d } as VehicleAssignment;
        });
        setAssignments(assignmentData);

        // Fetch Fuel Logs
        const fuelQuery = query(
          collection(db, 'fuel_logs'),
          where('vehicleId', '==', id),
          orderBy('date', 'desc')
        );
        const fuelSnap = await getDocs(fuelQuery);
        const fuelData = fuelSnap.docs.map(doc => {
          const d = doc.data();
          if (d.date instanceof Timestamp) d.date = d.date.toDate();
          return { id: doc.id, ...d } as FuelLog;
        });
        setFuelLogs(fuelData);

      } else {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл олдсонгүй.' });
        router.push('/vehicles');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUnassign = async () => {
    if (!vehicle || !vehicle.driverId || !user) return;

    setIsUnassigning(true);
    try {
      await unassignVehicle(vehicle.driverId, vehicle.id, user.uid);
      toast({
        title: 'Амжилттай чөлөөллөө',
        description: `${vehicle.driverName} жолоочийг ${vehicle.licensePlate} машинаас чөлөөллөө.`,
      });
      fetchData();
    } catch (error) {
      console.error('Error unassigning driver:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Чөлөөлөхөд алдаа гарлаа.'
      });
    } finally {
      setIsUnassigning(false);
    }
  };

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
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
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
          <div className="flex gap-2">
            {vehicle.driverId ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push(`/drivers/${vehicle.driverId}`)}>
                  <User className="mr-2 h-4 w-4" />
                  Жолооч үзэх
                </Button>
                <Button variant="outline" onClick={handleUnassign} disabled={isUnassigning} className="text-destructive border-destructive hover:bg-destructive/10">
                  {isUnassigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Жолооч чөлөөлөх
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setIsAssignDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Жолооч томилох
              </Button>
            )}
            <Button asChild>
              <Link href={`/vehicles/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Мэдээлэл засах
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Ерөнхий мэдээлэл</TabsTrigger>
          <TabsTrigger value="maintenance">Засвар үйлчилгээ</TabsTrigger>
          <TabsTrigger value="fuel">Түлш</TabsTrigger>
          <TabsTrigger value="assignments">Жолооч түүх</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
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

              <Card>
                <CardHeader>
                  <CardTitle>Техник Үзүүлэлтүүд</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem icon={Gauge} label="Гүйлт" value={vehicle.odometer ? `${vehicle.odometer.toLocaleString()} км` : '-'} />
                  <DetailItem icon={Droplet} label="Түлшний сав" value={vehicle.specs?.tankCapacity ? `${vehicle.specs.tankCapacity} л` : '-'} />
                  <DetailItem icon={Settings} label="Хурдны хайрцаг" value={vehicle.specs?.transmission} />
                  <DetailItem icon={Settings} label="Хөдөлгүүр" value={vehicle.specs?.engineType} />
                  <DetailItem icon={Settings} label="Тэнхлэг" value={vehicle.specs?.axleConfig} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Үндсэн мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailItem icon={Calendar} label="Үйлдвэрлэсэн / Орж ирсэн он" value={`${vehicle.year} / ${vehicle.importedYear}`} />
                  <DetailItem icon={Hash} label="Чиргүүлийн дугаар" value={vehicle.trailerLicensePlate} />
                  <DetailItem icon={Hash} label="Арлын дугаар (VIN)" value={vehicle.vin} />
                  <DetailItem icon={Car} label="Машины төрөл" value={vehicleTypeName} />
                  <DetailItem icon={Container} label="Тэвшний төрөл" value={trailerTypeName} />
                  <DetailItem icon={Hash} label="Даац / Хэмжээ" value={vehicle.capacity} />
                  <DetailItem icon={Droplet} label="Шатахууны төрөл" value={vehicle.fuelType} />
                  <DetailItem icon={User} label="Оноосон жолооч" value={vehicle.driverName || 'Оноогоогүй'} />
                  <DetailItem icon={StickyNote} label="Тэмдэглэл" value={vehicle.notes} />
                </CardContent>
              </Card>

              {(vehicle.dates && Object.keys(vehicle.dates).length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Хугацаа ба Бичиг баримт</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DetailItem icon={Calendar} label="Худалдан авсан" value={vehicle.dates.purchase ? format(vehicle.dates.purchase instanceof Timestamp ? vehicle.dates.purchase.toDate() : vehicle.dates.purchase, 'PP') : '-'} />
                    <DetailItem icon={Calendar} label="Баталгаат хугацаа" value={vehicle.dates.warrantyExpiry ? format(vehicle.dates.warrantyExpiry instanceof Timestamp ? vehicle.dates.warrantyExpiry.toDate() : vehicle.dates.warrantyExpiry, 'PP') : '-'} />
                    <DetailItem icon={Calendar} label="Техникийн үзлэг" value={vehicle.dates.registrationExpiry ? format(vehicle.dates.registrationExpiry instanceof Timestamp ? vehicle.dates.registrationExpiry.toDate() : vehicle.dates.registrationExpiry, 'PP') : '-'} />
                    <DetailItem icon={Calendar} label="Даатгал" value={vehicle.dates.insuranceExpiry ? format(vehicle.dates.insuranceExpiry instanceof Timestamp ? vehicle.dates.insuranceExpiry.toDate() : vehicle.dates.insuranceExpiry, 'PP') : '-'} />
                    <DetailItem icon={Calendar} label="Замын зөвшөөрөл" value={vehicle.dates.roadPermitExpiry ? format(vehicle.dates.roadPermitExpiry instanceof Timestamp ? vehicle.dates.roadPermitExpiry.toDate() : vehicle.dates.roadPermitExpiry, 'PP') : '-'} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Засварын түүх</CardTitle>
                <CardDescription>Нийт: {maintenances.length} бүртгэл</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/maintenances/new?vehicleId=${id}`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Шинэ засвар
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Огноо</TableHead>
                    <TableHead>Төрөл</TableHead>
                    <TableHead>Тайлбар</TableHead>
                    <TableHead>Гүйлт</TableHead>
                    <TableHead>Зардал</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.length > 0 ? (
                    maintenances.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date ? format(record.date, 'yyyy-MM-dd') : '-'}</TableCell>
                        <TableCell>{record.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                        <TableCell>{record.odometer?.toLocaleString()} км</TableCell>
                        <TableCell>{formatCurrency(record.cost)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/maintenances/${record.id}/edit`}>Засах</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Засварын түүх хоосон байна.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Түлшний түүх</CardTitle>
                <CardDescription>Нийт: {fuelLogs.length} бүртгэл</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/fuel/new?vehicleId=${id}`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Түлш нэмэх
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Огноо</TableHead>
                    <TableHead>Колонк</TableHead>
                    <TableHead>Литр</TableHead>
                    <TableHead>Үнэ</TableHead>
                    <TableHead>Нийт</TableHead>
                    <TableHead>Гүйлт</TableHead>
                    <TableHead>Үр ашиг</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelLogs.length > 0 ? (
                    fuelLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{(log.date instanceof Date) ? format(log.date, 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                        <TableCell>{log.stationName || '-'}</TableCell>
                        <TableCell>{log.liters} л</TableCell>
                        <TableCell>{formatCurrency(log.pricePerLiter)}</TableCell>
                        <TableCell>{formatCurrency(log.totalCost)}</TableCell>
                        <TableCell>{log.odometer?.toLocaleString()} км</TableCell>
                        <TableCell>
                          {log.efficiency ? (
                            <Badge variant={log.efficiency > 35 ? 'destructive' : 'secondary'}>
                              {log.efficiency.toFixed(1)} L/100km
                            </Badge>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">Түлшний түүх хоосон.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Жолооч томилгооны түүх</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentHistoryTable vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssignVehicleDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        vehicle={vehicle}
        onSuccess={fetchData}
      />
    </div>
  );
}