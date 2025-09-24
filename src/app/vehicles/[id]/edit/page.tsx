
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, Plus, Camera, Car, X } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp, getDocs, query, orderBy, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Vehicle, VehicleType, TrailerType } from '@/types';
import QuickAddDialog, { type QuickAddDialogProps } from '@/components/quick-add-dialog';
import { Skeleton } from '@/components/ui/skeleton';

const fuelTypes = ['Diesel', 'Gasoline', 'Electric', 'Hybrid'] as const;

const formSchema = z.object({
  make: z.string().min(2, "Үйлдвэрлэгчийн нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
  model: z.string().min(2, "Загварын нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
  year: z.coerce.number().min(1980, "Оноо зөв оруулна уу.").max(new Date().getFullYear() + 1, "Оноо зөв оруулна уу."),
  importedYear: z.coerce.number().min(1980, "Оноо зөв оруулна уу.").max(new Date().getFullYear() + 1, "Оноо зөв оруулна уу."),
  licensePlate: z.string().min(4, "Улсын дугаар дор хаяж 4 тэмдэгттэй байх ёстой.").regex(/^[0-9]{4}\s[А-Я|а-я]{3}$/, 'Улсын дугаарыг "0000 УБA" хэлбэрээр оруулна уу.'),
  vin: z.string().length(17, "Арлын дугаар 17 тэмдэгттэй байна."),
  vehicleTypeId: z.string().min(1, "Машины төрөл сонгоно уу."),
  trailerTypeId: z.string().min(1, "Тэвшний төрөл сонгоно уу."),
  capacity: z.string().min(1, "Даацын мэдээллийг оруулна уу."),
  fuelType: z.enum(fuelTypes),
  notes: z.string().optional(),
});

interface Make {
  Make_ID: number;
  Make_Name: string;
}

interface Model {
  Model_ID: number;
  Model_Name: string;
}

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
  const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
  const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);
  
  const [newImageFiles, setNewImageFiles] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>([]);
  
  const [makes, setMakes] = React.useState<Make[]>([]);
  const [models, setModels] = React.useState<Model[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = React.useState(false);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);


  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const selectedMake = form.watch('make');

  React.useEffect(() => {
    setIsLoadingMakes(true);
    fetch('https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json')
      .then(res => res.json())
      .then((data) => {
        setMakes(data.Results);
        setIsLoadingMakes(false);
      });
  }, []);

  React.useEffect(() => {
    if (selectedMake) {
      setIsLoadingModels(true);
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${selectedMake}?format=json`)
        .then(res => res.json())
        .then(data => {
          setModels(data.Results);
          setIsLoadingModels(false);
        });
    } else {
      setModels([]);
    }
  }, [selectedMake]);


  React.useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [vehicleSnap, vehicleTypeSnap, trailerTypeSnap] = await Promise.all([
          getDoc(doc(db, "vehicles", id)),
          getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
          getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
        ]);

        if (vehicleSnap.exists()) {
            const vehicleData = vehicleSnap.data() as Vehicle;
            form.reset(vehicleData);
            setExistingImageUrls(vehicleData.imageUrls || []);
        } else {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл олдсонгүй.' });
             router.push('/vehicles');
        }

        setVehicleTypes(vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)));
        setTrailerTypes(trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.'});
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, toast, router, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!id) return;
    setIsSubmitting(true);
    try {
        let finalImageUrls = [...existingImageUrls];

        if (newImageFiles.length > 0) {
            const uploadPromises = newImageFiles.map(file => {
                const storageRef = ref(storage, `vehicle_images/${id}/${Date.now()}_${file.name}`);
                return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            const newUrls = await Promise.all(uploadPromises);
            finalImageUrls.push(...newUrls);
        }

        const dataToUpdate: any = {
            ...values,
            imageUrls: finalImageUrls,
            updatedAt: serverTimestamp(),
        };

      await updateDoc(doc(db, 'vehicles', id), dataToUpdate);

      toast({
        title: 'Амжилттай!',
        description: `Тээврийн хэрэгслийн мэдээллийг шинэчиллээ.`,
      });
      router.push('/vehicles');
    } catch(error) {
        console.error("Error updating vehicle:", error)
        toast({
            variant: "destructive",
            title: 'Алдаа',
            description: `Тээврийн хэрэгсэл шинэчлэхэд алдаа гарлаа.`,
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };


  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  }

  const removeExistingImage = async (urlToRemove: string, index: number) => {
      try {
        const imageRef = ref(storage, urlToRemove);
        await deleteObject(imageRef);
        setExistingImageUrls(prev => prev.filter((url, i) => i !== index));
         toast({ title: 'Зураг устгагдлаа', description: 'Хадгалах товчийг дарж өөрчлөлтийг баталгаажуулна уу.'});
      } catch (error) {
          console.error("Error deleting image:", error);
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Зураг устгахад алдаа гарлаа.'});
      }
  }

  const handleQuickAdd = (type: 'vehicle_types' | 'trailer_types', formField: 'vehicleTypeId' | 'trailerTypeId') => {
    setDialogProps({
        open: true,
        collectionName: type,
        title: `Шинэ ${type === 'vehicle_types' ? 'машины төрөл' : 'тэвшний төрөл'} нэмэх`,
        onSuccess: (newItem) => {
            if (type === 'vehicle_types') {
                setVehicleTypes(prev => [...prev, newItem as VehicleType]);
            } else {
                setTrailerTypes(prev => [...prev, newItem as TrailerType]);
            }
            form.setValue(formField, newItem.id);
            setDialogProps(null);
        }
    });
  };
  
    if (isLoading) {
    return (
        <div className="container mx-auto py-6">
             <div className="mb-6"><Skeleton className="h-8 w-1/4 mb-4" /><Skeleton className="h-4 w-1/2" /></div>
            <Card>
                <CardContent className="pt-6 space-y-8">
                     <Skeleton className="h-24 w-full" />
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                </CardContent>
            </Card>
        </div>
    )
  }


  return (
    <div className="container mx-auto py-6">
       <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/vehicles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
          <h1 className="text-3xl font-headline font-bold">Тээврийн хэрэгсэл засах</h1>
        </div>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <div className="space-y-4">
                    <FormLabel>Тээврийн хэрэгслийн зургууд</FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {existingImageUrls.map((src, index) => (
                            <div key={src} className="relative aspect-square">
                                <Image src={src} alt={`Existing ${index + 1}`} fill className="object-cover rounded-md border" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeExistingImage(src, index)}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                         {newImageFiles.map((file, index) => (
                            <div key={index} className="relative aspect-square">
                                <Image src={URL.createObjectURL(file)} alt={`New ${index + 1}`} fill className="object-cover rounded-md border" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeNewImage(index)}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                         <Button type="button" variant="outline" className="aspect-square w-full h-full flex flex-col items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs mt-1 text-muted-foreground">Зураг нэмэх</span>
                         </Button>
                         <Input 
                            type="file" 
                            multiple
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange} 
                            accept="image/*"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Үйлдвэрлэгч</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLoadingMakes}><FormControl><SelectTrigger><SelectValue placeholder="Үйлдвэрлэгч сонгох..." /></SelectTrigger></FormControl><SelectContent>{isLoadingMakes ? <div className="p-4 text-sm">Ачааллаж байна...</div> : makes.map(make => (<SelectItem key={make.Make_ID} value={make.Make_Name}>{make.Make_Name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Загвар</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedMake || isLoadingModels}><FormControl><SelectTrigger><SelectValue placeholder="Загвар сонгох..." /></SelectTrigger></FormControl><SelectContent>{isLoadingModels ? <div className="p-4 text-sm">Ачааллаж байна...</div> : models.length > 0 ? models.map(model => (<SelectItem key={model.Model_ID} value={model.Model_Name}>{model.Model_Name}</SelectItem>)) : <div className="p-4 text-sm">Загвар олдсонгүй</div>}</SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="year" render={({ field }) => ( <FormItem><FormLabel>Үйлдвэрлэсэн он</FormLabel><FormControl><Input type="number" placeholder="2023" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="importedYear" render={({ field }) => ( <FormItem><FormLabel>Орж ирсэн он</FormLabel><FormControl><Input type="number" placeholder="2024" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="licensePlate" render={({ field }) => ( <FormItem><FormLabel>Улсын дугаар</FormLabel><FormControl><Input placeholder="0000 УБА" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="vin" render={({ field }) => ( <FormItem><FormLabel>Арлын дугаар (VIN)</FormLabel><FormControl><Input placeholder="17 оронтой дугаар" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (<FormItem><FormLabel>Машины төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map((s) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('vehicle_types', 'vehicleTypeId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="trailerTypeId" render={({ field }) => (<FormItem><FormLabel>Тэвшний төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map((s) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('trailer_types', 'trailerTypeId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>Даац / Хэмжээ</FormLabel><FormControl><Input placeholder="25тн, 90м3" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fuelType" render={({ field }) => ( <FormItem><FormLabel>Шатахууны төрөл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{fuelTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                 <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Нэмэлт тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Тээврийн хэрэгслийн талаарх нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                    <Link href="/vehicles">Цуцлах</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
    </div>
  );
}

