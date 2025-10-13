

'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Driver, DriverStatus, Vehicle, VehicleType, TrailerType } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, RefreshCw, Eye, Edit, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';

type DriverWithVehicle = Driver & { vehicle?: Vehicle & { vehicleTypeName?: string; trailerTypeName?: string; } };

function StatusBadge({ status }: { status: DriverStatus }) {
    const variant = status === 'Active' ? 'success' : status === 'On Leave' ? 'warning' : 'secondary';
    const text = status === 'Active' ? 'Идэвхтэй' : status === 'On Leave' ? 'Чөлөөнд' : 'Идэвхгүй';
    return <Badge variant={variant}>{text}</Badge>;
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
  // Return a default or invalid date if parsing fails, to avoid crashes.
  return new Date(); 
};

export default function DriversPage() {
  const [drivers, setDrivers] = React.useState<DriverWithVehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [driverToDelete, setDriverToDelete] = React.useState<Driver | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Firebase-тэй холбогдож чадсангүй. Тохиргоогоо шалгана уу.',
      });
      setIsLoading(false);
      return;
    }
    try {
      const [driversSnapshot, vehiclesSnapshot, vehicleTypesSnapshot, trailerTypesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "Drivers"), orderBy("created_time", "desc"))),
          getDocs(query(collection(db, "vehicles"))),
          getDocs(query(collection(db, "vehicle_types"))),
          getDocs(query(collection(db, "trailer_types"))),
      ]);
      
      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Vehicle));
      const vehicleTypesMap = new Map(vehicleTypesSnapshot.docs.map(doc => [doc.id, doc.data().name]));
      const trailerTypesMap = new Map(trailerTypesSnapshot.docs.map(doc => [doc.id, doc.data().name]));
      
      const vehiclesByDriverId = new Map<string, Vehicle & { vehicleTypeName?: string; trailerTypeName?: string; }>();
      vehiclesData.forEach(vehicle => {
          if (vehicle.driverId) {
              vehiclesByDriverId.set(vehicle.driverId, {
                  ...vehicle,
                  vehicleTypeName: vehicleTypesMap.get(vehicle.vehicleTypeId),
                  trailerTypeName: trailerTypesMap.get(vehicle.trailerTypeId),
              });
          }
      });

      const driversData = driversSnapshot.docs.map(doc => {
        const docData = doc.data() as Driver;
        const driverId = doc.id;
        return {
          id: driverId,
          ...docData,
          created_time: toDateSafe(docData.created_time),
          vehicle: vehiclesByDriverId.get(driverId),
        } as DriverWithVehicle;
      });
      setDrivers(driversData);
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Мэдээллийг татахад алдаа гарлаа.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteDriver = async () => {
    if (!driverToDelete || !db) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'Drivers', driverToDelete.id));
      setDrivers(prev => prev.filter(c => c.id !== driverToDelete.id));
      toast({ title: 'Амжилттай', description: `${driverToDelete.display_name} жолоочийг устгалаа.`});
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч устгахад алдаа гарлаа.'});
    } finally {
      setIsDeleting(false);
      setDriverToDelete(null);
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    (driver.display_name && driver.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (driver.phone_number && driver.phone_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Тээвэрчид</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй жолооч нарын жагсаалт.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Нэр, утсаар хайх..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/drivers/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ жолооч
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Жолооч нарын жагсаалт</CardTitle>
          <CardDescription>Нийт {filteredDrivers.length} жолооч байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Зураг</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Улсын дугаар</TableHead>
                <TableHead>Чиргүүлийн дугаар</TableHead>
                <TableHead>Даац</TableHead>
                <TableHead>Төрөл / Тэвш</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                       <TableCell>
                        <Avatar>
                          <AvatarImage src={driver.photo_url} alt={driver.display_name} />
                          <AvatarFallback>{driver.display_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/drivers/${driver.id}`} className="hover:underline">
                          {driver.display_name}
                        </Link>
                      </TableCell>
                      <TableCell>{driver.phone_number}</TableCell>
                      <TableCell><StatusBadge status={driver.status} /></TableCell>
                       <TableCell>{driver.vehicle?.licensePlate || 'Оноогоогүй'}</TableCell>
                      <TableCell>{driver.vehicle?.trailerLicensePlate || '-'}</TableCell>
                      <TableCell>{driver.vehicle?.capacity || '-'}</TableCell>
                      <TableCell>{driver.vehicle ? `${driver.vehicle.vehicleTypeName} / ${driver.vehicle.trailerTypeName}` : '-'}</TableCell>
                      <TableCell>{toDateSafe(driver.created_time).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Цэс нээх</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/drivers/${driver.id}`}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Дэлгэрэнгүй
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/drivers/${driver.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Засах
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDriverToDelete(driver)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                   <Trash2 className="mr-2 h-4 w-4"/>
                                   Устгах
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                        Бүртгэлтэй жолооч олдсонгүй.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!driverToDelete} onOpenChange={(open) => !open && setDriverToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        "{driverToDelete?.display_name}" нэртэй жолоочийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDriverToDelete(null)}>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteDriver} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? "Устгаж байна..." : "Устгах"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
