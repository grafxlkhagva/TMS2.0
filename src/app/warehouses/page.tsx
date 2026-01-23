
'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Warehouse, Region } from '@/types';
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
import { MoreHorizontal, PlusCircle, RefreshCw, Search, Eye, Edit, Trash2, Building2, MapPin, User, Package, CheckCircle2, XCircle, Clock, AlertTriangle, List, Map as MapIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
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
import { WarehouseMapView } from '@/components/warehouse-map-view';

const libraries: ('places')[] = ['places'];

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [regions, setRegions] = React.useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<Warehouse | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  const fetchWarehouses = React.useCallback(async () => {
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
      const warehousesQuery = query(collection(db, "warehouses"), orderBy("createdAt", "desc"));
      const regionsQuery = query(collection(db, "regions"));

      const [warehousesSnapshot, regionsSnapshot] = await Promise.all([
        getDocs(warehousesQuery),
        getDocs(regionsQuery)
      ]);

      const regionsMap = new Map(regionsSnapshot.docs.map(doc => [doc.id, doc.data().name]));
      setRegions(regionsMap);

      const data = warehousesSnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAt: docData.createdAt.toDate(),
        } as Warehouse;
      });
      setWarehouses(data);

    } catch (error) {
      console.error("Error fetching warehouses: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Агуулахын мэдээллийг татахад алдаа гарлаа.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleDelete = async () => {
    if (!itemToDelete || !db) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'warehouses', itemToDelete.id));
      setWarehouses(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast({ title: 'Амжилттай', description: `${itemToDelete.name} агуулахыг устгалаа.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Агуулах устгахад алдаа гарлаа.' });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || warehouse.status === statusFilter;
    const matchesType = typeFilter === 'all' || warehouse.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = React.useMemo(() => {
    return {
      total: warehouses.length,
      active: warehouses.filter(w => w.status === 'active' || !w.status).length, // fallback for old data
      full: warehouses.filter(w => w.status === 'full').length,
      maintenance: warehouses.filter(w => w.status === 'maintenance').length,
    };
  }, [warehouses]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Идэвхтэй</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Идэвхгүй</Badge>;
      case 'full':
        return <Badge variant="destructive"><Package className="w-3 h-3 mr-1" /> Дүүрсэн</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-500 hover:bg-amber-600"><Clock className="w-3 h-3 mr-1" /> Засвартай</Badge>;
      default:
        return <Badge variant="outline">Тодорхойгүй</Badge>;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'General': return 'Ердийн';
      case 'Cold Storage': return 'Хөргүүртэй';
      case 'Hazardous': return 'Аюултай';
      case 'Bonded': return 'Баталгаат';
      default: return 'Тодорхойгүй';
    }
  };


  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Нийт агуулах</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Идэвхтэй</p>
                <h3 className="text-2xl font-bold text-green-700">{stats.active}</h3>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Дүүрсэн</p>
                <h3 className="text-2xl font-bold text-red-700">{stats.full}</h3>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <Package className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Засвартай</p>
                <h3 className="text-2xl font-bold text-amber-700">{stats.maintenance}</h3>
              </div>
              <div className="p-2 bg-amber-100 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Агуулах</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй агуулахын жагсаалт болон төлөв.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Нэрээр хайх..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              <SelectItem value="active">Идэвхтэй</SelectItem>
              <SelectItem value="inactive">Идэвхгүй</SelectItem>
              <SelectItem value="full">Дүүрсэн</SelectItem>
              <SelectItem value="maintenance">Засвартай</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Төрөл" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төрөл</SelectItem>
              <SelectItem value="General">Ердийн</SelectItem>
              <SelectItem value="Cold Storage">Хөргүүртэй</SelectItem>
              <SelectItem value="Hazardous">Аюултай</SelectItem>
              <SelectItem value="Bonded">Баталгаат</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchWarehouses} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/warehouses/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ агуулах
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Жагсаалт
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapIcon className="h-4 w-4" />
              Газрын зураг
            </TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            Нийт {filteredWarehouses.length} агуулах байна.
          </p>
        </div>

        <TabsContent value="list" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Нэр / Төрөл</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead>Бүс нутаг</TableHead>
                    <TableHead>Байршил / Багтаамж</TableHead>
                    <TableHead>Эзэмшигч</TableHead>
                    <TableHead>Бүртгүүлсэн</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredWarehouses.length > 0 ? (
                    filteredWarehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell className="font-medium">
                          <div>
                            <Link href={`/warehouses/${warehouse.id}`} className="hover:underline block">
                              {warehouse.name}
                            </Link>
                            <span className="text-xs text-muted-foreground font-normal">
                              {getTypeName(warehouse.type || 'General')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(warehouse.status || 'active')}
                        </TableCell>
                        <TableCell>{regions.get(warehouse.regionId) || 'Тодорхойгүй'}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={warehouse.location}>
                            {warehouse.location}
                          </div>
                          {warehouse.capacity && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <Package className="w-3 h-3 inline mr-1" />
                              {warehouse.capacity.value} {warehouse.capacity.unit === 'sqm' ? 'м.кв' : warehouse.capacity.unit === 'pallets' ? 'палет' : 'тонн'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{warehouse.customerName || 'Тодорхойгүй'}</TableCell>
                        <TableCell>{warehouse.createdAt.toLocaleDateString()}</TableCell>
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
                                <Link href={`/warehouses/${warehouse.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Дэлгэрэнгүй
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/warehouses/${warehouse.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Засах
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setItemToDelete(warehouse)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Устгах
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        {searchTerm ? "Хайлтад тохирох үр дүн олдсонгүй." : "Бүртгэлтэй агуулах олдсонгүй."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-0">
          <WarehouseMapView
            warehouses={filteredWarehouses}
            regions={regions}
            selectedWarehouse={selectedWarehouse}
            onSelectWarehouse={setSelectedWarehouse}
            getStatusBadge={getStatusBadge}
            getTypeName={getTypeName}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              "{itemToDelete?.name}" нэртэй агуулахыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div >
  );
}
