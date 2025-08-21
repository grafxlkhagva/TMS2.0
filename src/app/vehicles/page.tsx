
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
import type { Vehicle, VehicleStatus, Driver } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function StatusBadge({ status }: { status: VehicleStatus }) {
  const variant = status === 'Available' ? 'default' : status === 'Maintenance' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Driver to {vehicle?.model}</DialogTitle>
          <DialogDescription>
            Select a driver to assign to vehicle with license plate {vehicle?.licensePlate}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedDriver} defaultValue={selectedDriver}>
            <SelectTrigger>
              <SelectValue placeholder="Select a driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedDriver}>Assign Driver</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  
  // In a real app, you would fetch vehicles and drivers from Firestore.
  // For now, we'll use an empty array.
  React.useEffect(() => {
    //
  }, []);

  const handleAssignClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const handleAssignDriver = (vehicleId: string, driverId: string) => {
    // This would be a Firestore update in a real app.
    setVehicles(prevVehicles =>
      prevVehicles.map(v =>
        v.id === vehicleId ? { ...v, driverId, status: 'In Use' } : v
      )
    );
    const driver = drivers.find(d => d.id === driverId);
    toast({
      title: 'Driver Assigned',
      description: `${driver?.name} has been assigned to vehicle ${vehicleId}.`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Vehicle Management</h1>
        <p className="text-muted-foreground">
          Assign drivers to available vehicles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Fleet</CardTitle>
          <CardDescription>A list of all vehicles in your fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle ID</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Driver</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => {
                  const driver = drivers.find(d => d.id === vehicle.driverId);
                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.id}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell>
                        <StatusBadge status={vehicle.status} />
                      </TableCell>
                      <TableCell>{driver?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={vehicle.status !== 'Available'}
                          onClick={() => handleAssignClick(vehicle)}
                        >
                          Assign Driver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
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
