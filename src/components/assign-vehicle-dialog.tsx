'use client';

import * as React from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    doc as firestoreDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Driver, Vehicle } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Check, Search, Car, User, Info } from 'lucide-react';
import { assignVehicle, checkLicenseCompliance } from '@/lib/assignment-service';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { getVehiclePrimaryAssignment } from '@/lib/assignment-service';

interface AssignVehicleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver?: Driver; // If assigning a vehicle to a driver
    vehicle?: Vehicle; // If assigning a driver to a vehicle
    onSuccess?: () => void;
}

export function AssignVehicleDialog({
    open,
    onOpenChange,
    driver,
    vehicle,
    onSuccess
}: AssignVehicleDialogProps) {
    const [items, setItems] = React.useState<any[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedId, setSelectedId] = React.useState<string>('');
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [odometer, setOdometer] = React.useState<string>('');
    const [notes, setNotes] = React.useState('');
    const [keepExisting, setKeepExisting] = React.useState(true);
    const [primaryConflict, setPrimaryConflict] = React.useState<{ vehicleId: string, driverName: string } | null>(null);

    const { toast } = useToast();
    const { user } = useAuth();

    // Reset state when opening
    React.useEffect(() => {
        if (open) {
            setSelectedId('');
            setSearchQuery('');
            setOdometer('');
            setNotes('');
            fetchData();
        }
    }, [open]);

    const fetchData = async () => {
        if (!db) return;
        setLoading(true);
        try {
            if (driver) {
                // Shared vehicle logic: Allow Available, Ready, and In Use
                // Only exclude maintenance/repair/deleted
                const q = query(collection(db, 'vehicles'), where('status', 'in', ['Available', 'Ready', 'In Use']));
                const snap = await getDocs(q);
                const vehicles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
                setItems(vehicles);
            } else if (vehicle) {
                const q = query(collection(db, 'Drivers'), where('status', '==', 'Active'));
                const snap = await getDocs(q);
                const drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
                setItems(drivers.filter(d => d.assignedVehicleId !== vehicle.id));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        const search = searchQuery.toLowerCase();
        if (driver) {
            // item is Vehicle
            return (
                item.licensePlate?.toLowerCase().includes(search) ||
                item.makeName?.toLowerCase().includes(search) ||
                item.modelName?.toLowerCase().includes(search) ||
                item.vehicleTypeName?.toLowerCase().includes(search)
            );
        } else {
            // item is Driver
            return (
                item.display_name?.toLowerCase().includes(search) ||
                item.phone_number?.toLowerCase().includes(search) ||
                item.licenseNumber?.toLowerCase().includes(search)
            );
        }
    });

    const selectedItem = items.find(i => i.id === selectedId);

    const compliance = React.useMemo(() => {
        if (!selectedId || !selectedItem) return null;

        if (driver) {
            return checkLicenseCompliance(
                driver.licenseClasses || [],
                selectedItem.vehicleTypeName || selectedItem.vehicleTypeId || 'Truck',
                !!selectedItem.trailerLicensePlate
            );
        } else if (vehicle) {
            return checkLicenseCompliance(
                selectedItem.licenseClasses || [],
                vehicle.vehicleTypeName || vehicle.vehicleTypeId || 'Truck',
                !!vehicle.trailerLicensePlate
            );
        }
        return { isValid: true };
    }, [selectedId, selectedItem, driver, vehicle]);

    const handleSubmit = async (force: boolean = false) => {
        if (!selectedId || !user || (compliance && !compliance.isValid)) return;

        setSubmitting(true);
        try {
            const targetDriver = driver || selectedItem;
            const targetVehicle = vehicle || selectedItem;

            // Check for primary conflict if we are making it primary (default behavior)
            if (!force && driver) {
                const conflict = await getVehiclePrimaryAssignment(targetVehicle.id);
                if (conflict && conflict.driverId !== targetDriver.id) {
                    setPrimaryConflict({ vehicleId: targetVehicle.id, driverName: conflict.driverName });
                    setSubmitting(false);
                    return;
                }
            }

            await assignVehicle(
                targetDriver,
                targetVehicle,
                user.uid,
                odometer ? parseInt(odometer) : undefined,
                notes,
                keepExisting
            );

            toast({
                title: 'Амжилттай оноолоо',
                description: `${targetDriver.display_name} жолоочид ${targetVehicle.licensePlate} машиныг оноолоо.`,
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Error assigning vehicle:', error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Оноолт хийхэд алдаа гарлаа.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-2xl font-headline font-bold">
                        {driver ? 'Тээврийн хэрэгсэл оноох' : 'Жолооч оноох'}
                    </DialogTitle>
                    <DialogDescription>
                        {driver
                            ? `${driver.display_name} жолоочид тохирох техник сонгох.`
                            : `${vehicle?.licensePlate} машинд жолооч томилох.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-0 flex flex-col flex-1 overflow-hidden">
                    {/* Search Section */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={driver ? "Улсын дугаар, загвар, төрлөөр хайх..." : "Нэр, утас, үнэмлэхээр хайх..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>

                    {/* Multiple Assignment Toggle */}
                    {driver && items.length > 0 && (
                        <div className="flex items-center space-x-2 py-2 px-1">
                            <input
                                type="checkbox"
                                id="keepExisting"
                                checked={keepExisting}
                                onChange={(e) => setKeepExisting(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <Label htmlFor="keepExisting" className="text-sm font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                Өмнөх оноосон машинуудыг хадгалах (Олон машин оноох)
                            </Label>
                        </div>
                    )}

                    {/* Selection List */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-muted/20 rounded-lg border border-border/50">
                        <ScrollArea className="flex-1 h-full px-1">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm">Мэдээлэл татаж байна...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                                    <Info className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-sm">Илэрц олдсонгүй.</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {filteredItems.map((item) => {
                                        const isSelected = selectedId === item.id;
                                        const itemComp = driver
                                            ? checkLicenseCompliance(driver.licenseClasses || [], item.vehicleTypeName || item.vehicleTypeId || 'Truck', !!item.trailerLicensePlate)
                                            : checkLicenseCompliance(item.licenseClasses || [], vehicle?.vehicleTypeName || vehicle?.vehicleTypeId || 'Truck', !!vehicle?.trailerLicensePlate);

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedId(item.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-4 p-3 rounded-md transition-all text-left group border border-transparent",
                                                    isSelected
                                                        ? "bg-primary/10 border-primary/20 shadow-sm"
                                                        : "hover:bg-background border-transparent"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors",
                                                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
                                                )}>
                                                    {driver ? <Car className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold truncate">
                                                            {driver ? item.licensePlate : item.display_name}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {driver && item.status !== 'Available' && (
                                                                <Badge variant="outline" className="h-5 text-[10px] py-0 px-1 opacity-70">
                                                                    {item.status === 'In Use' ? 'Ашиглагдаж буй' : 'Оноосон'}
                                                                </Badge>
                                                            )}
                                                            {!itemComp.isValid ? (
                                                                <Badge variant="destructive" className="h-5 text-[10px] py-0 px-1.5 opacity-80">Тохирохгүй</Badge>
                                                            ) : (
                                                                <Badge variant="success" className="h-5 text-[10px] py-0 px-1.5">Тохирсон</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                        {driver
                                                            ? `${item.makeName} ${item.modelName} ${item.trailerLicensePlate ? `• ${item.trailerLicensePlate}` : ''}`
                                                            : `${item.phone_number} • ${item.licenseNumber || 'Үнэмлэхгүй'}`}
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Secondary Inputs */}
                    <div className="py-4 space-y-4">
                        {compliance && !compliance.isValid && (
                            <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="text-xs font-bold">Нийцлийн асуудал</AlertTitle>
                                <AlertDescription className="text-xs">
                                    {compliance.reason}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="odometer" className="text-xs font-medium text-muted-foreground">ГҮЙЛТ (КМ)</Label>
                                <Input
                                    id="odometer"
                                    type="number"
                                    placeholder={vehicle?.odometer?.toString() || 'Одометр...'}
                                    value={odometer}
                                    onChange={(e) => setOdometer(e.target.value)}
                                    className="h-10 font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">ТЭМДЭГЛЭЛ</Label>
                                <Input
                                    id="notes"
                                    placeholder="Нэмэлт тэмдэглэл..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-muted/30 border-t gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Цуцлах
                    </Button>
                    <Button
                        onClick={() => handleSubmit()}
                        disabled={!selectedId || submitting || (compliance !== null && !compliance.isValid)}
                        className="px-8 shadow-lg shadow-primary/20 font-bold min-w-[140px]"
                    >
                        {submitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Боловсруулж байна...</>
                        ) : (
                            'Оноолт хийх'
                        )}
                    </Button>
                </DialogFooter>

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
                                onClick={() => handleSubmit(true)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                Тийм, шилжүүлэх
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}
