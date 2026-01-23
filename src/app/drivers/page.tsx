

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, RefreshCw, Eye, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { addDoc, serverTimestamp } from 'firebase/firestore';

type DriverWithVehicle = Driver & { vehicle?: Vehicle & { vehicleTypeName?: string; trailerTypeName?: string; } };

interface DriverRequest {
  id: string;
  fullName: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

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
  return new Date();
};

function LicenseStatusBadge({ expiryDate }: { expiryDate: any }) {
  if (!expiryDate) return <Badge variant="secondary">Бүртгэлгүй</Badge>;
  const date = toDateSafe(expiryDate);
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  if (date < today) {
    return <Badge variant="destructive">Хугацаа дууссан</Badge>;
  }
  if (date < thirtyDaysFromNow) {
    return <Badge variant="warning">Дуусах дөхсөн</Badge>;
  }
  return <Badge variant="success">Хүчинтэй</Badge>;
}

export default function DriversPage() {
  const [drivers, setDrivers] = React.useState<DriverWithVehicle[]>([]);
  const [requests, setRequests] = React.useState<DriverRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [driverToDelete, setDriverToDelete] = React.useState<Driver | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('active');
  const { toast } = useToast();

  // Хуудаслалт
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

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
      const [driversSnapshot, vehiclesSnapshot, vehicleTypesSnapshot, trailerTypesSnapshot, requestsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "Drivers"), orderBy("created_time", "desc"))),
        getDocs(query(collection(db, "vehicles"))),
        getDocs(query(collection(db, "vehicle_types"))),
        getDocs(query(collection(db, "trailer_types"))),
        getDocs(query(collection(db, "driver_requests"), orderBy("createdAt", "desc"))),
      ]);

      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
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
        return {
          ...docData,
          id: doc.id,
          created_time: toDateSafe(docData.created_time),
          vehicle: vehiclesByDriverId.get(doc.id),
        } as DriverWithVehicle;
      });
      setDrivers(driversData);

      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DriverRequest));
      setRequests(requestsData);

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
      toast({ title: 'Амжилттай', description: `${driverToDelete.display_name} жолоочийг устгалаа.` });
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч устгахад алдаа гарлаа.' });
    } finally {
      setIsDeleting(false);
      setDriverToDelete(null);
    }
  };

  const handleApproveRequest = async (request: DriverRequest) => {
    if (!db) return;
    setIsApproving(request.id);
    try {
      // 1. Create Driver document
      const newDriver: Partial<Driver> = {
        display_name: request.fullName,
        phone_number: request.phone,
        status: 'Active',
        created_time: serverTimestamp(),
      };

      const driverRef = await addDoc(collection(db, 'Drivers'), newDriver);

      // 2. Create User document for Auth/Permissions
      // (Note: Auth UID will be linked when they log in for the first time via OTP)
      await addDoc(collection(db, 'users'), {
        firstName: request.fullName,
        lastName: '',
        phone: request.phone,
        role: 'driver',
        status: 'active',
        createdAt: serverTimestamp(),
        driverId: driverRef.id
      });

      // 3. Delete request
      await deleteDoc(doc(db, 'driver_requests', request.id));

      toast({
        title: 'Амжилттай',
        description: 'Жолоочийн хүсэлтийг зөвшөөрлөө.',
      });
      fetchData();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Хүсэлтийг зөвшөөрөхөд алдаа гарлаа.',
      });
    } finally {
      setIsApproving(null);
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    (driver.display_name && driver.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (driver.phone_number && driver.phone_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (driver.licenseNumber && driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Хуудаслалтын тооцоо
  const totalPages = Math.ceil(filteredDrivers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDrivers = filteredDrivers.slice(startIndex, endIndex);

  // Хайлт өөрчлөгдөхөд эхний хуудас руу буцах
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Тээвэрчид</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй жолооч нарын жагсаалт ба бичиг баримтын хяналт.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Нэр, утас, үнэмлэх..."
              className="pl-9 w-[250px]"
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

      <Tabs defaultValue="active" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Жолооч нар</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Бүртгэлийн хүсэлтүүд
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Жолооч нарын жагсаалт</CardTitle>
              <CardDescription>
                {totalPages > 1 
                  ? `Нийт ${filteredDrivers.length} жолооч (${currentPage}/${totalPages} хуудас)`
                  : `Нийт ${filteredDrivers.length} жолооч`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Зураг</TableHead>
                    <TableHead>Нэр / Утас</TableHead>
                    <TableHead>Үнэмлэх / Ангилал</TableHead>
                    <TableHead>Бичиг баримт</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Улсын дугаар</TableHead>
                    <TableHead>Төрөл / Тэвш</TableHead>
                    <TableHead>Бүртгүүлсэн</TableHead>
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
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedDrivers.length > 0 ? (
                    paginatedDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <Link href={`/drivers/${driver.id}`}>
                            <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                              <AvatarImage src={driver.photo_url} alt={driver.display_name} />
                              <AvatarFallback>{driver.display_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Link href={`/drivers/${driver.id}`} className="font-medium hover:underline">
                                {driver.display_name}
                              </Link>
                              {driver.isAvailableForContracted && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-4 px-1">
                                  Гэрээт
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{driver.phone_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{driver.licenseNumber || '-'}</span>
                            <div className="flex gap-1 mt-1">
                              {driver.licenseClasses?.map(c => (
                                <Badge key={c} variant="outline" className="text-[10px] px-1 py-0">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <LicenseStatusBadge expiryDate={driver.licenseExpiryDate} />
                        </TableCell>
                        <TableCell><StatusBadge status={driver.status} /></TableCell>
                        <TableCell>
                          {driver.vehicle ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{driver.vehicle.licensePlate}</span>
                              {driver.vehicle.trailerLicensePlate && (
                                <span className="text-xs text-muted-foreground">Т: {driver.vehicle.trailerLicensePlate}</span>
                              )}
                            </div>
                          ) : 'Оноогоогүй'}
                        </TableCell>
                        <TableCell className="text-xs">{driver.vehicle ? `${driver.vehicle.vehicleTypeName} / ${driver.vehicle.trailerTypeName}` : '-'}</TableCell>
                        <TableCell className="text-xs">{toDateSafe(driver.created_time).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Бүртгэлтэй жолооч олдсонгүй.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>

            {/* Хуудаслалт */}
            {filteredDrivers.length > 0 && (
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Хуудсанд:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="hidden sm:inline">
                    | {startIndex + 1}–{Math.min(endIndex, filteredDrivers.length)} / {filteredDrivers.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Эхний хуудас</span>
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Өмнөх</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Дараах</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Сүүлийн хуудас</span>
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Бүртгэлийн хүсэлтүүд</CardTitle>
              <CardDescription>Шинээр бүртгүүлсэн жолооч нарын хүсэлт.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Нэр</TableHead>
                    <TableHead>Утас</TableHead>
                    <TableHead>Хүсэлт илгээсэн</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : requests.length > 0 ? (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.fullName}</TableCell>
                        <TableCell>{request.phone}</TableCell>
                        <TableCell>{toDateSafe(request.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveRequest(request)}
                            disabled={isApproving === request.id}
                          >
                            {isApproving === request.id ? 'Зөвшөөрч байна...' : 'Зөвшөөрөх'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Шинэ хүсэлт байхгүй байна.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!driverToDelete} onOpenChange={(open) => !open && setDriverToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              "{driverToDelete?.display_name}" нэртэй жолоочийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteDriver();
              }} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
