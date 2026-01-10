
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, Eye, Trash2, Settings2, UserCheck, Ship, Truck } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, getDocs, orderBy, query, writeBatch, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ContractedTransport, ContractedTransportFrequency, Driver, Vehicle, AssignedVehicle } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


const frequencyTranslations: Record<ContractedTransportFrequency, string> = {
    Daily: 'Өдөр бүр',
    Weekly: '7 хоног тутам',
    Monthly: 'Сар тутам',
    Custom: 'Бусад'
};


function AssignmentsManagementDialog({ open, onOpenChange, drivers, assignedVehicles, onSave }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    drivers: Driver[];
    assignedVehicles: AssignedVehicle[];
    onSave: (newAssignments: AssignedVehicle[]) => void;
}) {
    const [selectedDriverId, setSelectedDriverId] = React.useState<string>('');
    const [currentAssignments, setCurrentAssignments] = React.useState<AssignedVehicle[]>(assignedVehicles);
    const { toast } = useToast();

    React.useEffect(() => {
        setCurrentAssignments(assignedVehicles);
    }, [assignedVehicles]);

    const handleAddAssignment = () => {
        if (!selectedDriverId) {
            toast({ variant: 'destructive', title: 'Жолооч сонгоогүй байна' });
            return;
        }
        const driver = drivers.find(d => d.id === selectedDriverId);
        if (!driver || !driver.assignedVehicleId) {
             toast({ variant: 'destructive', title: 'Жолоочид оноосон тэрэг байхгүй', description: 'Эхлээд жолоочийн мэдээллээс тэрэг онооно уу.' });
            return;
        }
        
        if (currentAssignments.some(a => a.assignedDriver?.driverId === driver.id)) {
            toast({ variant: 'destructive', title: 'Жолооч нэмэгдсэн байна' });
            return;
        }

        const newAssignment: AssignedVehicle = {
            vehicleId: driver.assignedVehicleId,
            licensePlate: 'Loading...', // Will be populated when saving
            trailerLicensePlate: null, // Will be populated
            status: 'Ready',
            assignedDriver: {
                driverId: driver.id,
                driverName: driver.display_name,
                driverAvatar: driver.photo_url
            }
        };

        setCurrentAssignments(prev => [...prev, newAssignment]);
        setSelectedDriverId('');
    };

    const handleRemoveAssignment = (driverId: string) => {
        setCurrentAssignments(prev => prev.filter(a => a.assignedDriver?.driverId !== driverId));
    };

    const availableDrivers = drivers.filter(d => 
        d.isAvailableForContracted && 
        d.assignedVehicleId &&
        !currentAssignments.some(a => a.assignedDriver?.driverId === d.id)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Гэрээт тээврийн жолооч/тэрэг оноолт</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                        <h4 className="font-semibold mb-2">Нэмэх боломжтой жолооч нар</h4>
                        <div className="space-y-2">
                             <Select onValueChange={setSelectedDriverId} value={selectedDriverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Жолооч сонгох..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableDrivers.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.display_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddAssignment} className="w-full">Нэмэх</Button>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Оноосон жолооч нар ({currentAssignments.length})</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 -mr-2">
                            {currentAssignments.map(assignment => (
                                <div key={assignment.assignedDriver!.driverId} className="flex items-center justify-between p-2 border rounded-md">
                                    <span>{assignment.assignedDriver!.driverName}</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveAssignment(assignment.assignedDriver!.driverId)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                    <Button onClick={() => onSave(currentAssignments)}>Хадгалах</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function ContractedTransportPage() {
  const [contracts, setContracts] = React.useState<ContractedTransport[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [itemToDelete, setItemToDelete] = React.useState<ContractedTransport | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();
  
  // NEW STATES for the fleet management
  const [showAssignmentsDialog, setShowAssignmentsDialog] = React.useState(false);
  const [assignedVehicles, setAssignedVehicles] = React.useState<AssignedVehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = React.useState<Driver[]>([]);
  
  const fetchContractsAndAssignments = React.useCallback(async () => {
    setIsLoading(true);
    try {
        if (!db) return;
        
        const [contractsQuery, driversQuery, vehiclesQuery] = await Promise.all([
             getDocs(query(collection(db, "contracted_transports"), orderBy("createdAt", "desc"))),
             getDocs(query(collection(db, 'Drivers'), where('isAvailableForContracted', '==', true))),
             getDocs(collection(db, 'vehicles'))
        ]);
        
        const contractsData = contractsQuery.docs.map(doc => {
            const docData = doc.data();
            return {
                id: doc.id,
                ...docData,
                createdAt: docData.createdAt.toDate(),
                startDate: docData.startDate.toDate(),
                endDate: docData.endDate.toDate(),
            } as ContractedTransport;
        });
        setContracts(contractsData);

        const allAssignedVehicles = contractsData.flatMap(c => c.assignedVehicles || []);
        setAssignedVehicles(allAssignedVehicles);
        
        const vehiclesData = vehiclesQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        
        const driversData = driversQuery.docs.map(doc => {
            const driver = { id: doc.id, ...doc.data()} as Driver;
            if (driver.assignedVehicleId) {
                const vehicle = vehiclesData.find(v => v.id === driver.assignedVehicleId);
                // @ts-ignore
                if (vehicle) driver.vehicle = vehicle;
            }
            return driver;
        });

        setAvailableDrivers(driversData);

    } catch (error) {
        console.error("Error fetching contracted transports:", error);
        toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Гэрээт тээврийн мэдээллийг татахад алдаа гарлаа.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchContractsAndAssignments();
  }, [fetchContractsAndAssignments]);
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      const executionsQuery = query(collection(db, 'contracted_transport_executions'), where('contractId', '==', itemToDelete.id));
      const executionsSnapshot = await getDocs(executionsQuery);
      executionsSnapshot.forEach(doc => {
          batch.delete(doc.ref);
      });

      const contractRef = doc(db, 'contracted_transports', itemToDelete.id);
      batch.delete(contractRef);

      await batch.commit();

      setContracts(prev => prev.filter(c => c.id !== itemToDelete.id));
      toast({ title: 'Амжилттай', description: `"${itemToDelete.title}" гэрээг устгалаа.`});
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ устгахад алдаа гарлаа.'});
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleAssignmentsUpdate = async (newAssignments: AssignedVehicle[]) => {
      try {
          const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
          const vehiclesData = vehiclesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Vehicle);

          const newAssignedVehicles = newAssignments.map(a => {
              const vehicle = vehiclesData.find(v => v.id === a.vehicleId);
              return {
                  ...a,
                  licensePlate: vehicle?.licensePlate || 'N/A',
                  trailerLicensePlate: vehicle?.trailerLicensePlate || null,
              }
          })
          
          // This should update a central list of assignments, not a specific contract
          // For now, let's just update the local state to reflect changes
          setAssignedVehicles(newAssignedVehicles);
          setShowAssignmentsDialog(false);
          toast({ title: "Амжилттай", description: "Оноолт шинэчлэгдлээ."})

      } catch (error) {
         console.error("Error updating assignments:", error);
         toast({ variant: 'destructive', title: 'Алдаа', description: 'Оноолт хадгалахад алдаа гарлаа.' });
      }
  }
  
  const renderVehicleCard = (vehicle: AssignedVehicle) => (
        <Card key={vehicle.vehicleId} className="p-3">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={vehicle.assignedDriver?.driverAvatar} />
                    <AvatarFallback>{vehicle.assignedDriver?.driverName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{vehicle.assignedDriver?.driverName}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
                </div>
            </div>
        </Card>
    );


  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Гэрээт тээвэр</h1>
          <p className="text-muted-foreground">
            Урт хугацааны, давтагдах тээвэрлэлтийн гэрээнүүд.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/contracted-transport/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ гэрээт тээвэр
            </Link>
          </Button>
        </div>
      </div>
      
       <Card className="mb-6">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Гэрээт тээврийн парк</CardTitle>
                        <CardDescription>Нэгдсэн удирдлагын самбар.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setShowAssignmentsDialog(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Жолооч/Тэрэг оноох
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-muted p-3">
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-600"/> Сул</h3>
                        <div className="space-y-2">
                            {assignedVehicles.filter(v => v.status === 'Ready').map(renderVehicleCard)}
                        </div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Ship className="h-5 w-5 text-blue-600"/> Бэлэн</h3>
                         <div className="space-y-2">
                            {assignedVehicles.filter(v => v.status === 'Ready' && v.contractId).map(renderVehicleCard)}
                        </div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Truck className="h-5 w-5 text-orange-600"/> Аялалд яваа</h3>
                         <div className="space-y-2">
                            {assignedVehicles.filter(v => v.status === 'In-Trip').map(renderVehicleCard)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>


      <Card>
        <CardHeader>
          <CardTitle>Гэрээт тээврийн жагсаалт</CardTitle>
          <CardDescription>Нийт {contracts.length} гэрээ байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гэрээний №</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Харилцагч</TableHead>
                <TableHead>Давтамж</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : contracts.length > 0 ? (
                contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono">
                        <Link href={`/contracted-transport/${contract.id}`} className="hover:underline">
                            {contract.contractNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{contract.title}</TableCell>
                      <TableCell>{contract.customerName}</TableCell>
                      <TableCell>{frequencyTranslations[contract.frequency]}</TableCell>
                      <TableCell><Badge variant={contract.status === 'Active' ? 'success' : 'secondary'}>{contract.status}</Badge></TableCell>
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
                                  <Link href={`/contracted-transport/${contract.id}`}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Дэлгэрэнгүй
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setItemToDelete(contract)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
                    <TableCell colSpan={6} className="h-24 text-center">
                        Бүртгэлтэй гэрээт тээвэр олдсонгүй.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        "{itemToDelete?.title}" гэрээг устгах гэж байна. Энэ үйлдэл нь тухайн гэрээтэй холбоотой бүх гүйцэтгэлийн мэдээллийг хамт устгах болно.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? "Устгаж байна..." : "Устгах"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <AssignmentsManagementDialog 
            open={showAssignmentsDialog}
            onOpenChange={setShowAssignmentsDialog}
            drivers={availableDrivers}
            assignedVehicles={assignedVehicles}
            onSave={handleAssignmentsUpdate}
        />

    </div>
  );
}
