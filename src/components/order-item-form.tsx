
'use client';

import * as React from 'react';
import { useFieldArray } from 'react-hook-form';
import { format } from "date-fns";

import type { Warehouse, ServiceType, VehicleType, TrailerType, Region, PackagingType } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, CalendarIcon, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';


function CargoForm({ control, itemIndex, packagingTypes, onRemove, cargoIndex }: any) {
    const standardUnits = ["кг", "тн", "м3", "литр", "ш", "боодол", "хайрцаг"];
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 border rounded-md">
             <FormField control={control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.name`} render={({ field }: any) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Нэр</FormLabel><FormControl><Input placeholder="Цемент" {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.quantity`} render={({ field }: any) => (<FormItem className="md:col-span-1"><FormLabel className="text-xs">Хэмжээ</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.unit`} render={({ field }: any) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs">Нэгж</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Нэгж..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {standardUnits.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
             <FormField control={control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.packagingTypeId`} render={({ field }: any) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Баглаа</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{packagingTypes.map((p: any) => ( <SelectItem key={p.id} value={p.id}> {p.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)} />
             <FormField control={control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.notes`} render={({ field }: any) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Тэмдэглэл</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem>)} />
             <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive self-end" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
        </div>
    )
}

function ShipmentItemForm({ form, itemIndex, onRemove, serviceTypes, regions, warehouses, vehicleTypes, trailerTypes, packagingTypes }: any) {
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
                <FormField control={form.control} name={`items.${itemIndex}.serviceTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.frequency`} render={({ field }: any) => ( <FormItem><FormLabel>Давтамж</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
             </div>
        </div>

        <Separator/>
        
        <div className="space-y-4">
            <h5 className="font-semibold">Тээврийн чиглэл</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.startRegionId`} render={({ field }: any) => ( <FormItem><FormLabel>Ачих бүс</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.startWarehouseId`} render={({ field }: any) => ( <FormItem><FormLabel>Ачих агуулах</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.endRegionId`} render={({ field }: any) => ( <FormItem><FormLabel>Буулгах бүс</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.endWarehouseId`} render={({ field }: any) => ( <FormItem><FormLabel>Буулгах агуулах</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
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
                <FormField control={form.control} name={`items.${itemIndex}.vehicleTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Машин</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.trailerTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Тэвш</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
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
                    packagingTypes={packagingTypes}
                    onRemove={() => remove(cargoIndex)}
                />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddCargo}><PlusCircle className="mr-2 h-4 w-4" /> Ачаа нэмэх</Button>
             {form.formState.errors?.items?.[itemIndex]?.cargoItems && (<p className="text-sm font-medium text-destructive">{(form.formState.errors.items[itemIndex].cargoItems as any).message || 'Ачааны мэдээлэл дутуу байна.'}</p>)}
        </div>
    </div>
  )
}

export default function OrderItemForm({ form, fields, append, remove, serviceTypes, regions, warehouses, vehicleTypes, trailerTypes, packagingTypes, isSubmitting, onSubmit, onAddNewItem }: any) {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field: any, index: number) => (
              <ShipmentItemForm 
                key={field.id}
                form={form}
                itemIndex={index}
                onRemove={() => remove(index)}
                serviceTypes={serviceTypes}
                regions={regions}
                warehouses={warehouses}
                vehicleTypes={vehicleTypes}
                trailerTypes={trailerTypes}
                packagingTypes={packagingTypes}
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
        </Form>
    )
}
