
'use client';

import * as React from 'react';
import { useFieldArray } from 'react-hook-form';
import { format } from "date-fns";

import type { Warehouse, ServiceType, VehicleType, TrailerType, Region, PackagingType } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, CalendarIcon, Loader2, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import QuickAddDialog, { type QuickAddDialogProps } from '@/components/quick-add-dialog';
import { Checkbox } from './ui/checkbox';


function CargoForm({ control, itemIndex, packagingTypes, onRemove, cargoIndex, onQuickAdd }: any) {
    const standardUnits = ["кг", "тн", "м3", "литр", "ш", "боодол", "хайрцаг"];
    return (
        <div className="p-4 border rounded-md relative space-y-3">
             <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
             
            <div className="flex flex-wrap gap-4 items-start">
                 <FormField 
                    control={control} 
                    name={`items.${itemIndex}.cargoItems.${cargoIndex}.name`} 
                    render={({ field }: any) => (
                        <FormItem className="flex-1 min-w-[150px] md:min-w-[200px]">
                            <FormLabel className="text-xs">Нэр</FormLabel>
                            <FormControl><Input placeholder="Цемент" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} 
                />
                
                <div className="flex-1 min-w-[150px]">
                    <FormLabel className="text-xs">Хэмжээ/Нэгж</FormLabel>
                    <div className="flex gap-2">
                        <FormField 
                            control={control} 
                            name={`items.${itemIndex}.cargoItems.${cargoIndex}.quantity`} 
                            render={({ field }: any) => (
                                <FormItem className="flex-grow">
                                    <FormControl><Input type="number" placeholder="25" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        <FormField 
                            control={control} 
                            name={`items.${itemIndex}.cargoItems.${cargoIndex}.unit`} 
                            render={({ field }: any) => (
                                <FormItem className="w-28">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Нэгж..." /></SelectTrigger></FormControl>
                                        <SelectContent>{standardUnits.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                    </div>
                </div>

                <FormField 
                    control={control} 
                    name={`items.${itemIndex}.cargoItems.${cargoIndex}.packagingTypeId`} 
                    render={({ field }: any) => (
                        <FormItem className="flex-1 min-w-[150px]">
                            <FormLabel className="text-xs">Баглаа</FormLabel>
                            <div className="flex gap-2">
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl>
                                    <SelectContent>{packagingTypes.map((p: any) => ( <SelectItem key={p.id} value={p.id}> {p.name} </SelectItem> ))}</SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('packaging_types', `items.${itemIndex}.cargoItems.${cargoIndex}.packagingTypeId`)}><Plus className="h-4 w-4"/></Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} 
                />
                
                <FormField 
                    control={control} 
                    name={`items.${itemIndex}.cargoItems.${cargoIndex}.notes`} 
                    render={({ field }: any) => (
                        <FormItem className="flex-1 min-w-[150px]">
                            <FormLabel className="text-xs">Тэмдэглэл</FormLabel>
                            <FormControl><Input placeholder="..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} 
                />
            </div>
        </div>
    )
}

function ShipmentItemForm({ form, itemIndex, onRemove, onQuickAdd, allData }: any) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `items.${itemIndex}.cargoItems`,
  });

  const handleAddCargo = () => {
    append({
      name: '',
      quantity: 1,
      unit: 'кг',
      packagingTypeId: '',
      notes: '',
    });
  }

  return (
    <div className="p-4 border rounded-md relative space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-lg">Тээвэрлэлт #{itemIndex + 1}</h4>
            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
        <Separator/>

        <div className="space-y-4">
            <h5 className="font-semibold mt-4">Тээврийн үйлчилгээ</h5>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.serviceTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{allData.serviceTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('service_types', `items.${itemIndex}.serviceTypeId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.frequency`} render={({ field }: any) => ( <FormItem><FormLabel>Давтамж</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
             </div>
        </div>

        <Separator/>
        
        <div className="space-y-4">
            <h5 className="font-semibold">Тээврийн чиглэл</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.startRegionId`} render={({ field }: any) => ( <FormItem><FormLabel>Ачих бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger></FormControl><SelectContent>{allData.regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('regions', `items.${itemIndex}.startRegionId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.startWarehouseId`} render={({ field }: any) => ( <FormItem><FormLabel>Ачих агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{allData.warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('warehouses', `items.${itemIndex}.startWarehouseId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.endRegionId`} render={({ field }: any) => ( <FormItem><FormLabel>Буулгах бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger></FormControl><SelectContent>{allData.regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('regions', `items.${itemIndex}.endRegionId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.endWarehouseId`} render={({ field }: any) => ( <FormItem><FormLabel>Буулгах агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger></FormControl><SelectContent>{allData.warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('warehouses', `items.${itemIndex}.endWarehouseId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
            </div>
            <FormField control={form.control} name={`items.${itemIndex}.totalDistance`} render={({ field }: any) => ( <FormItem><FormLabel>Нийт зам (км)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.loadingDateRange`} render={({ field }: any) => (
                    <FormItem className="flex flex-col"><FormLabel>Ачих огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value?.from && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? (<>{format(field.value.from, 'LLL dd, y')} - {format(field.value.to, 'LLL dd, y')}</>) : (format(field.value.from, 'LLL dd, y'))) : (<span>Огноо сонгох</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value} onSelect={field.onChange} numberOfMonths={2} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} /></PopoverContent></Popover><FormDescription>Эхлэх огноог сонгохдоо хоёр товшино уу.</FormDescription><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.unloadingDateRange`} render={({ field }: any) => (
                    <FormItem className="flex flex-col"><FormLabel>Буулгах огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value?.from && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? (<>{format(field.value.from, 'LLL dd, y')} - {format(field.value.to, 'LLL dd, y')}</>) : (format(field.value.from, 'LLL dd, y'))) : (<span>Огноо сонгох</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value} onSelect={field.onChange} numberOfMonths={2} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} /></PopoverContent></Popover><FormDescription>Эхлэх огноог сонгохдоо хоёр товшино уу.</FormDescription><FormMessage /></FormItem>)}/>
            </div>
        </div>

        <Separator/>

        <div className="space-y-4">
             <h5 className="font-semibold">Тээврийн хэрэгсэл</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.vehicleTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Машин</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{allData.vehicleTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('vehicle_types', `items.${itemIndex}.vehicleTypeId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.trailerTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Тэвш</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{allData.trailerTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => onQuickAdd('trailer_types', `items.${itemIndex}.trailerTypeId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
            </div>
        </div>

        <Separator/>

        <div className="space-y-4">
            <h5 className="font-semibold">Санхүүгийн мэдээлэл</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.profitMargin`} render={({ field }: any) => ( <FormItem><FormLabel>Ашгийн хувь (%)</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.withVAT`} render={({ field }: any) => (<FormItem className="flex flex-row items-end space-x-2 pb-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id={`withVAT-new-${itemIndex}`}/></FormControl><div className="space-y-1 leading-none"><label htmlFor={`withVAT-new-${itemIndex}`} className="text-sm">НӨАТ-тэй эсэх</label></div><FormMessage /></FormItem>)}/>
            </div>
        </div>
        
        <Separator />

        <div className="space-y-2">
            <h5 className="font-semibold">Ачаа</h5>
            {fields.map((cargoField: any, cargoIndex: number) => (
                <CargoForm 
                    key={cargoField.id}
                    control={form.control}
                    itemIndex={itemIndex}
                    cargoIndex={cargoIndex}
                    packagingTypes={allData.packagingTypes}
                    onRemove={() => remove(cargoIndex)}
                    onQuickAdd={onQuickAdd}
                />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddCargo}><PlusCircle className="mr-2 h-4 w-4" /> Ачаа нэмэх</Button>
             {form.formState.errors?.items?.[itemIndex]?.cargoItems && (<p className="text-sm font-medium text-destructive">{(form.formState.errors.items[itemIndex].cargoItems as any).message || 'Ачааны мэдээлэл дутуу байна.'}</p>)}
        </div>
    </div>
  )
}

export default function OrderItemForm({ form, fields, remove, isSubmitting, onSubmit, onAddNewItem, allData, setAllData }: any) {
    const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);

    const handleQuickAdd = (type: 'regions' | 'service_types' | 'vehicle_types' | 'trailer_types' | 'packaging_types' | 'warehouses', formField: any) => {
        setDialogProps({
            open: true,
            collectionName: type,
            title: `Шинэ ${type} нэмэх`,
            isWarehouse: type === 'warehouses',
            onSuccess: (newItem) => {
                switch(type) {
                    case 'regions': setAllData.setRegions((prev: Region[]) => [...prev, newItem as Region]); break;
                    case 'service_types': setAllData.setServiceTypes((prev: ServiceType[]) => [...prev, newItem as ServiceType]); break;
                    case 'vehicle_types': setAllData.setVehicleTypes((prev: VehicleType[]) => [...prev, newItem as VehicleType]); break;
                    case 'trailer_types': setAllData.setTrailerTypes((prev: TrailerType[]) => [...prev, newItem as TrailerType]); break;
                    case 'packaging_types': setAllData.setPackagingTypes((prev: PackagingType[]) => [...prev, newItem as PackagingType]); break;
                    case 'warehouses': setAllData.setWarehouses((prev: Warehouse[]) => [...prev, newItem as Warehouse]); break;
                }
                form.setValue(formField, newItem.id);
                setDialogProps(null);
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field: any, index: number) => (
              <ShipmentItemForm 
                key={field.id}
                form={form}
                itemIndex={index}
                onRemove={() => remove(index)}
                onQuickAdd={handleQuickAdd}
                allData={allData}
              />
            ))}
            <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={onAddNewItem}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Тээвэрлэлт нэмэх
                </Button>
                {fields.length > 0 && (
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Хадгалах
                    </Button>
                )}
            </div>
            {form.formState.errors.items && (<p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>)}
            </form>
            {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
        </Form>
    )
}
