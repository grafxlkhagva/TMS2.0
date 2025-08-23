
'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Shipment, ShipmentStatusType } from '@/types';
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
import { RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const statusTranslations: Record<ShipmentStatusType, string> = {
    Preparing: 'Бэлтгэгдэж буй',
    Loading: 'Ачиж буй',
    'In Transit': 'Тээвэрлэгдэж буй',
    Unloading: 'Буулгаж буй',
    Delivered: 'Хүргэгдсэн',
    Delayed: 'Саатсан',
    Cancelled: 'Цуцлагдсан'
};

const getStatusBadgeVariant = (status: ShipmentStatusType) => {
    switch(status) {
      case 'Delivered':
        return 'success';
      case 'In Transit':
      case 'Loading':
      case 'Unloading':
        return 'default';
      case 'Delayed':
        return 'warning';
      case 'Cancelled':
        return 'destructive';
      case 'Preparing':
      default:
        return 'secondary';
    }
};


export default function ShipmentsPage() {
    const [shipments, setShipments] = React.useState<Shipment[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const { toast } = useToast();

    const fetchShipments = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "shipments"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt.toDate(),
                } as Shipment;
            });
            setShipments(data);
        } catch (error) {
            console.error("Error fetching shipments: ", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Тээвэрлэлтийн мэдээллийг татахад алдаа гарлаа.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchShipments();
    }, [fetchShipments]);
    
    const filteredShipments = shipments.filter(shipment =>
        shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Тээвэрлэлтүүд</h1>
          <p className="text-muted-foreground">
            Идэвхтэй болон дууссан тээвэрлэлтүүдийн жагсаалт.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Харилцагч эсвэл дугаараар хайх..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <Button variant="outline" size="icon" onClick={fetchShipments} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Тээвэрлэлтийн жагсаалт</CardTitle>
          <CardDescription>Нийт {filteredShipments.length} тээвэрлэлт байна.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Тээврийн дугаар</TableHead>
                        <TableHead>Харилцагч</TableHead>
                        <TableHead>Чиглэл</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Бүртгүүлсэн</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                    ))
                ) : filteredShipments.length > 0 ? (
                    filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                        <TableCell className="font-mono">
                            <Link href={`/shipments/${shipment.id}`} className="hover:underline">
                            {shipment.shipmentNumber}
                            </Link>
                        </TableCell>
                        <TableCell className="font-medium">{shipment.customerName}</TableCell>
                        <TableCell>{shipment.route.startRegion} &rarr; {shipment.route.endRegion}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusBadgeVariant(shipment.status)}>
                                {statusTranslations[shipment.status] || shipment.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{shipment.createdAt.toLocaleDateString()}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {searchTerm ? "Хайлтад тохирох үр дүн олдсонгүй." : "Бүртгэлтэй тээвэрлэлт олдсонгүй."}
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
