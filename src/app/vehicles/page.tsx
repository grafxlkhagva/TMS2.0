

'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Vehicle, VehicleStatus, Driver, VehicleType, TrailerType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy, doc, updateDoc, Timestamp, Firestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PlusCircle, RefreshCw, MoreHorizontal, Eye, Edit, Search, AlertTriangle, Car, ChevronLeft, ChevronRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AssignVehicleDialog } from '@/components/assign-vehicle-dialog';


import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';


import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Check, Truck, Wrench as WrenchIcon } from 'lucide-react';

function StatusBadge({ status }: { status: VehicleStatus }) {
  const variant = status === 'Available' ? 'success' : status === 'Maintenance' ? 'destructive' : status === 'Ready' ? 'default' : 'secondary';
  const text = status === 'Available' ? 'Сул' : status === 'In Use' ? 'Ашиглаж буй' : status === 'Maintenance' ? 'Засварт' : 'Бэлэн';
  return <Badge variant={variant}>{text}</Badge>;
}

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
};

function StatCard({ title, value, icon: Icon, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}


export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
  const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');

  // Хуудаслалт
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const [stats, setStats] = React.useState({
    total: 0,
    available: 0,
    inUse: 0,
    maintenance: 0,
  });
  const [makeChartData, setMakeChartData] = React.useState<any[]>([]);
  const [typeChartData, setTypeChartData] = React.useState<any[]>([]);
  const [trailerChartData, setTrailerChartData] = React.useState<any[]>([]);

  const fetchData = React.useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const [vehiclesSnapshot, driversSnapshot, vehicleTypesSnapshot, trailerTypesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'Drivers'), orderBy('display_name'))),
        getDocs(query(collection(db, 'vehicle_types'), orderBy('name'))),
        getDocs(query(collection(db, 'trailer_types'), orderBy('name'))),
      ]);

      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Vehicle));
      setVehicles(vehiclesData);

      const driversData = driversSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Driver));
      setDrivers(driversData);

      const vehicleTypesData = vehicleTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType));
      setVehicleTypes(vehicleTypesData);

      const trailerTypesData = trailerTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType));
      setTrailerTypes(trailerTypesData);

      // Dashboard logic
      const vehicleTypesMap = new Map(vehicleTypesData.map(vt => [vt.id, vt.name]));
      const trailerTypesMap = new Map(trailerTypesData.map(tt => [tt.id, tt.name]));

      setStats({
        total: vehiclesData.length,
        available: vehiclesData.filter(v => v.status === 'Available').length,
        inUse: vehiclesData.filter(v => v.status === 'In Use').length,
        maintenance: vehiclesData.filter(v => v.status === 'Maintenance').length,
      });

      const makeCounts = vehiclesData.reduce((acc, vehicle) => {
        const make = vehicle.makeName || 'Тодорхойгүй';
        acc[make] = (acc[make] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setMakeChartData(Object.entries(makeCounts).map(([name, count]) => ({ name, тоо: count })));

      const typeCounts = vehiclesData.reduce((acc, vehicle) => {
        const typeName = vehicleTypesMap.get(vehicle.vehicleTypeId) || 'Тодорхойгүй';
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setTypeChartData(Object.entries(typeCounts).map(([name, count]) => ({ name, тоо: count })));

      const trailerCounts = vehiclesData.reduce((acc, vehicle) => {
        const trailerName = trailerTypesMap.get(vehicle.trailerTypeId) || 'Тодорхойгүй';
        acc[trailerName] = (acc[trailerName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setTrailerChartData(Object.entries(trailerCounts).map(([name, count]) => ({ name, тоо: count })));

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({
        variant: "destructive",
        title: "Алдаа",
        description: "Мэдээлэл татахад алдаа гарлаа.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const filteredVehicles = React.useMemo(() => {
    return vehicles
      .map(v => {
        const vehicleTypeName = vehicleTypes.find(vt => vt.id === v.vehicleTypeId)?.name || v.vehicleTypeId;
        const trailerTypeName = trailerTypes.find(tt => tt.id === v.trailerTypeId)?.name || v.trailerTypeId;
        return { ...v, vehicleTypeName, trailerTypeName };
      })
      .filter(vehicle => {
        if (statusFilter !== 'all' && vehicle.status !== statusFilter) {
          return false;
        }
        if (typeFilter !== 'all' && vehicle.vehicleTypeId !== typeFilter) {
          return false;
        }
        if (searchTerm) {
          const lowerCaseSearch = searchTerm.toLowerCase();
          return (
            (vehicle.licensePlate && vehicle.licensePlate.toLowerCase().includes(lowerCaseSearch)) ||
            (vehicle.trailerLicensePlate && vehicle.trailerLicensePlate.toLowerCase().includes(lowerCaseSearch)) ||
            (vehicle.makeName && vehicle.makeName.toLowerCase().includes(lowerCaseSearch)) ||
            (vehicle.modelName && vehicle.modelName.toLowerCase().includes(lowerCaseSearch)) ||
            (vehicle.driverName && vehicle.driverName.toLowerCase().includes(lowerCaseSearch)) ||
            (vehicle.notes && vehicle.notes.toLowerCase().includes(lowerCaseSearch))
          );
        }
        return true;
      });
  }, [vehicles, searchTerm, statusFilter, typeFilter, vehicleTypes, trailerTypes]);

  // Хуудаслалтын тооцоо
  const totalPages = Math.ceil(filteredVehicles.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

  // Хайлт/шүүлт өөрчлөгдөхөд эхний хуудас руу буцах
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, pageSize]);

  const getVehicleAlerts = (vehicle: Vehicle) => {
    const alerts: { type: 'warning' | 'destructive', message: string }[] = [];

    if (vehicle.dates) {
      const today = new Date();
      const checkExpiry = (date: Date | undefined, label: string) => {
        if (!date) return;
        const daysLeft = differenceInDays(date instanceof Timestamp ? date.toDate() : date, today);
        if (daysLeft < 0) {
          alerts.push({ type: 'destructive', message: `${label} хугацаа дууссан!` });
        } else if (daysLeft <= 30) {
          alerts.push({ type: 'warning', message: `${label} дуусахад ${daysLeft} хоног үлдлээ.` });
        }
      };

      checkExpiry(vehicle.dates.registrationExpiry, 'Техникийн үзлэг');
      checkExpiry(vehicle.dates.insuranceExpiry, 'Даатгал');
      checkExpiry(vehicle.dates.roadPermitExpiry, 'Замын зөвшөөрөл');
    }

    return alerts;
  };

  if (!db) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-muted-foreground">Системтэй холбогдоход алдаа гарлаа. (Firestore initialization failed)</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Тээврийн хэрэгсэл</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй тээврийн хэрэгслүүдийн нэгдсэн хяналт болон жагсаалт.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button asChild>
            <Link href="/vehicles/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ хэрэгсэл
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Нийт" value={stats.total} icon={Car} isLoading={isLoading} />
        <StatCard title="Сул" value={stats.available} icon={Check} isLoading={isLoading} />
        <StatCard title="Ашиглаж буй" value={stats.inUse} icon={Truck} isLoading={isLoading} />
        <StatCard title="Засварт" value={stats.maintenance} icon={WrenchIcon} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Үйлдвэрлэгчээр</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={makeChartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                    <RechartsTooltip contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Машины төрлөөр</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeChartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                    <RechartsTooltip contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Тэвшний төрлөөр</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trailerChartData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                    <RechartsTooltip contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Тээврийн хэрэгслийн жагсаалт</CardTitle>
              <CardDescription>
                {totalPages > 1 
                  ? `Олдсон: ${filteredVehicles.length} (${currentPage}/${totalPages} хуудас)`
                  : `Олдсон: ${filteredVehicles.length}`
                } / Нийт: {vehicles.length}
              </CardDescription>
            </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Дугаар, тэмдэглэл..."
                className="pl-9 w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Төлөв..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүх төлөв</SelectItem>
                <SelectItem value="Available">Сул</SelectItem>
                <SelectItem value="In Use">Ашиглаж буй</SelectItem>
                <SelectItem value="Maintenance">Засварт</SelectItem>
                <SelectItem value="Ready">Бэлэн</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Төрөл..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүх төрөл</SelectItem>
                {vehicleTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          {/* Анхааруулгын тайлбар */}
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/50 text-sm">
            <span className="font-medium text-muted-foreground">Анхааруулга:</span>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>Хугацаа дууссан</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>30 хоногоос бага үлдсэн</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Шалгагдах: Техникийн үзлэг, Даатгал, Замын зөвшөөрөл</span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Зураг</TableHead>
                <TableHead>Улсын дугаар</TableHead>
                <TableHead>Чиргүүлийн дугаар</TableHead>
                <TableHead>Үйлдвэрлэгч</TableHead>
                <TableHead>Загвар</TableHead>
                <TableHead>Даац</TableHead>
                <TableHead>Төрөл / Тэвш</TableHead>
                <TableHead>Гүйлт (км)</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Оноосон жолооч</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedVehicles.length > 0 ? (
                paginatedVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={vehicle.imageUrls?.[0]} alt={vehicle.modelName} />
                        <AvatarFallback>{vehicle.makeName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/vehicles/${vehicle.id}`} 
                          className="hover:text-primary hover:underline transition-colors font-semibold"
                        >
                          {vehicle.licensePlate || 'Дугааргүй'}
                        </Link>
                        {(() => {
                          const alerts = getVehicleAlerts(vehicle);
                          if (alerts.length > 0) {
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className={cn("h-4 w-4", alerts.some(a => a.type === 'destructive') ? "text-destructive" : "text-yellow-500")} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {alerts.map((alert, i) => (
                                      <p key={i} className={cn("text-xs", alert.type === 'destructive' && "text-destructive")}>• {alert.message}</p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{vehicle.trailerLicensePlate || '-'}</TableCell>
                    <TableCell>{vehicle.makeName}</TableCell>
                    <TableCell className="font-medium">{vehicle.modelName}</TableCell>
                    <TableCell>{vehicle.capacity}</TableCell>
                    <TableCell>{vehicle.vehicleTypeName} / {vehicle.trailerTypeName}</TableCell>
                    <TableCell>{vehicle.odometer?.toLocaleString() || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell>{vehicle.driverName || 'Оноогоогүй'}</TableCell>
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
                            <Link href={`/vehicles/${vehicle.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Дэлгэрэнгүй
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/vehicles/${vehicle.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Засах
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAssignClick(vehicle)} disabled={vehicle.status !== 'Available'}>
                            Жолооч оноох
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center h-24">
                    Тээврийн хэрэгсэл бүртгэлгүй байна.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Хуудаслалт */}
        {filteredVehicles.length > 0 && (
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
                | {startIndex + 1}–{Math.min(endIndex, filteredVehicles.length)} / {filteredVehicles.length}
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
                {/* Хуудасны дугаарууд */}
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
      <AssignVehicleDialog
        vehicle={selectedVehicle || undefined}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}

