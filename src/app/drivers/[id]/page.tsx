

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
import { ArrowLeft, Edit, Phone, CheckCircle, XCircle, Clock, Car, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignVehicleDialog } from '@/components/assign-vehicle-dialog';
import { AssignmentHistoryTable } from '@/components/assignment-history-table';
import { unassignVehicle, setPrimaryVehicle, getVehiclePrimaryAssignment } from '@/lib/assignment-service';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [activeAssignments, setActiveAssignments] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isUnassigning, setIsUnassigning] = React.useState(false);
  const [primaryConflict, setPrimaryConflict] = React.useState<{ vehicleId: string, driverName: string } | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = React.useState(false);

  const { user } = useAuth();

  const fetchDriverData = React.useCallback(async () => {
    if (!id || !db) return;
    setIsLoading(true);
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

        // Fetch ALL active assignments for this driver
        const assignmentsQuery = query(
          collection(db, 'AssignmentHistory'),
          where('driverId', '==', id),
          where('status', '==', 'Active')
        );
        const assignmentsSnap = await getDocs(assignmentsQuery);
        const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveAssignments(assignments);

        // Fetch details for the primary vehicle
        if (driverData.assignedVehicleId) {
          const vehicleDoc = await getDoc(doc(db, 'vehicles', driverData.assignedVehicleId));
          if (vehicleDoc.exists()) {
            setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle);
          } else {
            setVehicle(null);
          }
        } else {
          setVehicle(null);
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
  }, [id, router, toast]);

  React.useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const handleSetPrimary = async (vehicleId: string, force: boolean = false) => {
    if (!driver || !user) return;

    setIsSettingPrimary(true);
    try {
      if (!force) {
        const conflict = await getVehiclePrimaryAssignment(vehicleId);
        if (conflict && conflict.driverId !== driver.id) {
          setPrimaryConflict({ vehicleId, driverName: conflict.driverName });
          setIsSettingPrimary(false);
          return;
        }
      }

      await setPrimaryVehicle(driver.id, vehicleId, user.uid, force);
      toast({ title: 'Амжилттай', description: 'Үндсэн тээврийн хэрэгслийг солилоо.' });
      setPrimaryConflict(null);
      fetchDriverData();
    } catch (error) {
      console.error('Error setting primary vehicle:', error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Үндсэн машинаар тохируулахад алдаа гарлаа.' });
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const handleUnassignSpecific = async (vId: string, vPlate: string) => {
    if (!driver || !user) return;
    setIsUnassigning(true);
    try {
      await unassignVehicle(driver.id, vId, user.uid);
      toast({ title: 'Амжилттай чөлөөллөө', description: `${driver.display_name} жолоочийг ${vPlate} машинаас чөлөөллөө.` });
      fetchDriverData();
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Чөлөөлөхөд алдаа гарлаа.' });
    } finally {
      setIsUnassigning(false);
    }
  };

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
        <Card>
          <CardHeader> <Skeleton className="h-6 w-1/2" /> </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
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
              <Edit className="mr-2 h-4 w-4" />
              Мэдээлэл засах
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Дэлгэрэнгүй</TabsTrigger>
          <TabsTrigger value="history">Оноолтын түүх</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Хувийн мэдээлэл</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem icon={Phone} label="Утасны дугаар" value={driver.phone_number} />
                  <DetailItem icon={CheckCircle} label="Регистрийн дугаар" value={driver.registerNumber || '-'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem icon={Clock} label="Төрсөн огноо" value={driver.birthDate ? format(toDateSafe(driver.birthDate), "PP") : '-'} />
                  <DetailItem icon={CheckCircle} label="Статус" value={<StatusBadge status={driver.status} />} />
                </div>
                <DetailItem icon={CheckCircle} label="Гэрээт тээвэрт явах" value={driver.isAvailableForContracted ? "Тийм" : "Үгүй"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Яаралтай үед холбоо барих</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem icon={Phone} label="Хэний хэн" value={driver.emergencyContact?.name || '-'} />
                  <DetailItem icon={Phone} label="Холбоо барих утас" value={driver.emergencyContact?.phone || '-'} />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Жолооны үнэмлэх</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem icon={CheckCircle} label="Үнэмлэхний дугаар" value={driver.licenseNumber || '-'} />
                      <DetailItem icon={Clock} label="Дуусах огноо" value={driver.licenseExpiryDate ? format(toDateSafe(driver.licenseExpiryDate), "PP") : '-'} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Зөвшөөрөгдсөн ангилал</p>
                      <div className="flex flex-wrap gap-2">
                        {driver.licenseClasses?.length ? driver.licenseClasses.map(c => (
                          <Badge key={c} variant="outline" className="text-sm px-3">{c}</Badge>
                        )) : <span className="text-sm text-muted-foreground">Бүртгэлгүй</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Үнэмлэхний зураг</p>
                    {driver.licenseImageUrl ? (
                      <div className="relative aspect-video w-full rounded-lg border overflow-hidden bg-muted max-w-sm">
                        <Image src={driver.licenseImageUrl} alt="License" fill className="object-contain" />
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-lg border-2 border-dashed flex items-center justify-center bg-muted max-w-sm">
                        <p className="text-muted-foreground text-sm">Зураг ороогүй</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Оноосон тээврийн хэрэгслүүд</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Машин нэмэх
                </Button>
              </CardHeader>
              <CardContent>
                {activeAssignments.length > 0 ? (
                  <div className="space-y-4">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                        assignment.isPrimary ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            assignment.isPrimary ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{assignment.vehiclePlate}</span>
                              {assignment.isPrimary && <Badge className="text-[10px] h-4 py-0 px-1 font-normal bg-primary text-primary-foreground border-none">Үндсэн</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {assignment.assignedAt ? format(toDateSafe(assignment.assignedAt), "yyyy-MM-dd HH:mm") : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                            <Link href={`/vehicles/${assignment.vehicleId}`}>
                              <Info className="h-4 w-4" />
                            </Link>
                          </Button>
                          {!assignment.isPrimary && (
                            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => handleSetPrimary(assignment.vehicleId)}>
                              Үндсэн болгох
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleUnassignSpecific(assignment.vehicleId, assignment.vehiclePlate)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Оноосон тээврийн хэрэгсэл байхгүй.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Машин оноолтын түүх</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentHistoryTable driverId={driver.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssignVehicleDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        driver={driver}
        onSuccess={fetchDriverData}
      />

      <AlertDialog open={!!primaryConflict} onOpenChange={(open) => !open && setPrimaryConflict(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Үндсэн оноолт шилжүүлэх үү?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ тээврийн хэрэгсэл одоогоор <strong>{primaryConflict?.driverName}</strong> жолооч дээр үндсэн оноолттой байна.
              Өмнөх жолоочоос чөлөөлж, энэ жолоочид үндсэн болгох уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => primaryConflict && handleSetPrimary(primaryConflict.vehicleId, true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Тийм, шилжүүлэх
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
