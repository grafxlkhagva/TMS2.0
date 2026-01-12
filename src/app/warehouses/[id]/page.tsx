
'use client';

import * as React from 'react';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Warehouse, Region } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  MapPin,
  FileText,
  Info,
  Phone,
  Building,
  User,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutDashboard
} from 'lucide-react';

function DetailItem({ icon: Icon, label, value, subValue }: { icon: React.ElementType, label: string, value?: string, subValue?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-muted rounded-md shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="font-semibold whitespace-pre-wrap">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

const libraries: ('places')[] = ['places'];

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [warehouse, setWarehouse] = React.useState<Warehouse | null>(null);
  const [regionName, setRegionName] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded: isMapLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
    preventLoading: !hasApiKey,
  });

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const fetchWarehouse = async () => {
      try {
        const docRef = doc(db, 'warehouses', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Warehouse;
          setWarehouse({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          });

          if (data.regionId) {
            const regionDoc = await getDoc(doc(db, 'regions', data.regionId));
            if (regionDoc.exists()) {
              setRegionName(regionDoc.data().name);
            }
          }

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Агуулах олдсонгүй.' });
          router.push('/warehouses');
        }
      } catch (error) {
        console.error("Error fetching warehouse:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarehouse();
  }, [id, router, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Идэвхтэй</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="px-3 py-1"><XCircle className="w-3.5 h-3.5 mr-1.5" /> Идэвхгүй</Badge>;
      case 'full':
        return <Badge variant="destructive" className="px-3 py-1"><Package className="w-3.5 h-3.5 mr-1.5" /> Дүүрсэн</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-500 hover:bg-amber-600 px-3 py-1"><Clock className="w-3.5 h-3.5 mr-1.5" /> Засвартай</Badge>;
      default:
        return <Badge variant="outline" className="px-3 py-1">Тодорхойгүй</Badge>;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'General': return 'Ердийн агуулах';
      case 'Cold Storage': return 'Хөргүүртэй агуулах';
      case 'Hazardous': return 'Аюултай ачааны агуулах';
      case 'Bonded': return 'Гаалийн баталгаат агуулах';
      default: return 'Тодорхойгүй';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/warehouses')} className="mb-4 hover:bg-muted font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Буцах
        </Button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-headline font-bold tracking-tight">{warehouse.name}</h1>
              {getStatusBadge(warehouse.status || 'active')}
            </div>
            <p className="text-muted-foreground text-lg flex items-center">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              {getTypeName(warehouse.type || 'General')}
            </p>
          </div>
          <Button asChild size="lg" className="shadow-md">
            <Link href={`/warehouses/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Мэдээлэл засах
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Байршил болон Эзэмшигч
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <DetailItem icon={MapPin} label="Бүс нутаг" value={regionName} />
              <DetailItem icon={MapPin} label="Агуулахын хаяг" value={warehouse.location} />
              <DetailItem icon={Building} label="Эзэмшигч байгууллага" value={warehouse.customerName || 'Эзэмшигчгүй'} />
              {warehouse.capacity && (
                <DetailItem
                  icon={Package}
                  label="Нийт хүчин чадал"
                  value={`${warehouse.capacity.value} ${warehouse.capacity.unit === 'sqm' ? 'м.кв' : warehouse.capacity.unit === 'pallets' ? 'палет' : 'тонн'}`}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Холбоо барих
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <DetailItem icon={User} label="Хариуцсан хүн" value={warehouse.contactName} subValue={warehouse.contactPosition} />
              <DetailItem icon={Phone} label="Холбоо барих мэдээлэл" value={warehouse.contactInfo} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  Ачих буулгах нөхцөл
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground bg-muted/50 p-4 rounded-lg italic">
                  {warehouse.conditions || 'Зааварчилгаа байхгүй.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Нэмэлт тэмдэглэл
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {warehouse.note || 'Тэмдэглэл байхгүй.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="h-[400px] w-full">
              {!hasApiKey ? (
                <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground p-6 text-center">
                  <div>
                    <MapPin className="w-10 h-10 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Google Maps API түлхүүр тохируулагдаагүй байна.</p>
                    <p className="text-sm mt-2 opacity-70">Газрын зургийг харуулах боломжгүй.</p>
                  </div>
                </div>
              ) : loadError ? (
                <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive-foreground p-6 text-center">
                  <p>Газрын зураг ачаалахад алдаа гарлаа.</p>
                </div>
              ) : !isMapLoaded ? (
                <Skeleton className="h-full w-full" />
              ) : warehouse.geolocation ? (
                <GoogleMap
                  mapContainerClassName="w-full h-full"
                  center={warehouse.geolocation}
                  zoom={15}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    styles: [
                      {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                      }
                    ]
                  }}
                >
                  <Marker position={warehouse.geolocation} />
                </GoogleMap>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground p-6 text-center">
                  <p>Байршлын мэдээлэл олдсонгүй.</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-muted/20 border-t">
              <p className="text-xs text-muted-foreground text-center">
                {warehouse.geolocation ? `Координат: ${warehouse.geolocation.lat.toFixed(6)}, ${warehouse.geolocation.lng.toFixed(6)}` : 'Координат тодорхойгүй'}
              </p>
            </div>
          </Card>

          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-4">Бүртгэлийн түүх</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Үүсгэсэн огноо:</span>
                <span className="font-medium">{warehouse.createdAt.toLocaleDateString()}</span>
              </div>
              {warehouse.updatedAt && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Сүүлд зассан:</span>
                  <span className="font-medium">{(warehouse.updatedAt as any).toDate ? (warehouse.updatedAt as any).toDate().toLocaleDateString() : new Date(warehouse.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


