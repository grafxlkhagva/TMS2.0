
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Vehicle, VehicleStatus, Driver, VehicleType, TrailerType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PlusCircle, RefreshCw, MoreHorizontal, Eye, Edit, Search } from 'lucide-react';
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


function StatusBadge({ status }: { status: VehicleStatus }) {
  const variant = status === 'Available' ? 'success' : status === 'Maintenance' ? 'destructive' : 'secondary';
  const text = status === 'Available' ? 'Сул' : status === 'In Use' ? 'Ашиглаж буй' : 'Засварт';
  return <Badge variant={variant}>{text}</Badge>;
}

function AssignDriverDialog({
  vehicle,
  open,
  onOpenChange,
  onAssign,
  drivers
}: {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (vehicleId: string, driverId: string) => void;
  drivers: Driver[];
}) {
  const [selectedDriver, setSelectedDriver] = React.useState('');

  const handleAssign = () => {
    if (vehicle && selectedDriver) {
      onAssign(vehicle.id, selectedDriver);
      onOpenChange(false);
    }
  };
  
  React.useEffect(() => {
    if (!open) {
      setSelectedDriver('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehicle?.modelName} - жолооч оноох</DialogTitle>
          <DialogDescription>
            {vehicle?.licensePlate} дугаартай тээврийн хэрэгсэлд жолооч онооно уу.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedDriver}>
            <SelectTrigger>
              <SelectValue placeholder="Жолооч сонгоно уу..." />
            </SelectTrigger>
            <SelectContent>
              {drivers.filter(d => d.status === 'Active').map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
          <Button onClick={handleAssign} disabled={!selectedDriver}>Оноох</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  
  const fetchData = React.useCallback(async () => {
      setIsLoading(true);
      try {
        const [vehiclesSnapshot, driversSnapshot, vehicleTypesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'Drivers'), orderBy('display_name'))),
          getDocs(query(collection(db, 'vehicle_types'), orderBy('name'))),
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
        
        const vehicleTypesData = vehicleTypesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as VehicleType));
        setVehicleTypes(vehicleTypesData);
          
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

  const handleAssignDriver = async (vehicleId: string, driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    try {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, {
            driverId: driver.id,
            driverName: driver.display_name,
            status: 'In Use',
        });
        
        await fetchData();

        toast({
            title: 'Амжилттай',
            description: `${driver?.display_name}-г ${selectedVehicle?.licensePlate} дугаартай тээврийн хэрэгсэлд оноолоо.`,
        });
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Алдаа',
            description: `Жолооч онооход алдаа гарлаа.`,
        });
    }
  };

  const filteredVehicles = React.useMemo(() => {
    return vehicles
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
            vehicle.licensePlate.toLowerCase().includes(lowerCaseSearch) ||
            vehicle.makeName.toLowerCase().includes(lowerCaseSearch) ||
            vehicle.modelName.toLowerCase().includes(lowerCaseSearch) ||
            (vehicle.driverName && vehicle.driverName.toLowerCase().includes(lowerCaseSearch))
          );
        }
        return true;
      });
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-headline font-bold">Тээврийн хэрэгсэл</h1>
            <p className="text-muted-foreground">
                Бүртгэлтэй тээврийн хэрэгслүүдийн жагсаалт, удирдлага.
            </p>
        </div>
         <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Хайх..."
                className="pl-9 w-40"
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

      <Card>
        <CardHeader>
          <CardTitle>Тээврийн хэрэгслийн парк</CardTitle>
          <CardDescription>Олдсон: {filteredVehicles.length} / Нийт: {vehicles.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Зураг</TableHead>
                <TableHead>Улсын дугаар</TableHead>
                <TableHead>Үйлдвэрлэгч</TableHead>
                <TableHead>Загвар</TableHead>
                <TableHead>Даац</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Оноосон жолооч</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-10 rounded-full"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                    </TableRow>
                ))
              ) : filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                        <TableCell>
                            <Avatar>
                                <AvatarImage src={vehicle.imageUrls?.[0]} alt={vehicle.modelName} />
                                <AvatarFallback>{vehicle.makeName.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                      <TableCell className="font-mono">{vehicle.licensePlate}</TableCell>
                      <TableCell>{vehicle.makeName}</TableCell>
                      <TableCell className="font-medium">{vehicle.modelName}</TableCell>
                      <TableCell>{vehicle.capacity}</TableCell>
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
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Дэлгэрэнгүй
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/vehicles/${vehicle.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4"/>
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
                  <TableCell colSpan={8} className="text-center h-24">
                    Тээврийн хэрэгсэл бүртгэлгүй байна.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AssignDriverDialog 
        vehicle={selectedVehicle} 
        drivers={drivers}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAssign={handleAssignDriver}
      />
    </div>
  );
}
