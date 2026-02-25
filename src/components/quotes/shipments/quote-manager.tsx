
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, doc, Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, ChevronsUpDown, X, UserPlus, PlusCircle, Loader2, Send, ExternalLink, XCircle, CheckCircle, Trash2, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverWithVehicle, DriverQuote, OrderItem } from '@/types';

const quoteFormSchema = z.object({
    price: z.coerce.number().min(1, "Үнийн санал оруулна уу."),
    notes: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteManagerProps {
    orderItemId: string;
    item: OrderItem;
    quotes: DriverQuote[];
    drivers: DriverWithVehicle[];
    setDrivers: React.Dispatch<React.SetStateAction<DriverWithVehicle[]>>;
    onFetchOrderData: () => void;
    db: Firestore | null;
    isSubmitting: boolean;
    sendingToSheet: string | null;
    onAcceptQuote: (item: OrderItem, quote: DriverQuote) => void;
    onRevertQuote: (item: OrderItem) => void;
    onDeleteQuote: (quoteId: string) => void;
    onSendToSheet: (item: OrderItem, quote: DriverQuote) => void;
}

export function QuoteManager({
    orderItemId,
    item,
    quotes,
    drivers,
    setDrivers,
    onFetchOrderData,
    db,
    isSubmitting,
    sendingToSheet,
    onAcceptQuote,
    onRevertQuote,
    onDeleteQuote,
    onSendToSheet
}: QuoteManagerProps) {
    const { toast } = useToast();
    const [selectedDriver, setSelectedDriver] = React.useState<DriverWithVehicle | null>(null);
    const [manualDriverName, setManualDriverName] = React.useState('');
    const [manualDriverPhone, setManualDriverPhone] = React.useState('');
    const [isRegisteringDriver, setIsRegisteringDriver] = React.useState(false);
    const [localSubmitting, setLocalSubmitting] = React.useState(false);

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: { price: 0, notes: '' },
    });

    const handleSelectDriver = (driverId: string) => {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
            setSelectedDriver(driver);
            setManualDriverName(driver.display_name);
            setManualDriverPhone(driver.phone_number);
        }
    };

    const handleClearSelection = () => {
        setSelectedDriver(null);
        setManualDriverName('');
        setManualDriverPhone('');
    }

    const handleRegisterDriver = async () => {
        if (!manualDriverName || !manualDriverPhone) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолоочийн нэр, утасны дугаарыг оруулна уу.' });
            return;
        }
        if (!db) return;
        setIsRegisteringDriver(true);
        try {
            const docRef = await addDoc(collection(db, 'Drivers'), {
                display_name: manualDriverName,
                phone_number: manualDriverPhone,
                status: 'Active',
                created_time: serverTimestamp(),
            });
            const newDriver = { id: docRef.id, display_name: manualDriverName, phone_number: manualDriverPhone, status: 'Active' } as DriverWithVehicle;
            setDrivers(prev => [...prev, newDriver]);
            setSelectedDriver(newDriver);
            toast({ title: 'Амжилттай', description: `Шинэ жолооч ${manualDriverName} бүртгэгдлээ.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Шинэ жолооч бүртгэхэд алдаа гарлаа.' });
        } finally {
            setIsRegisteringDriver(false);
        }
    }

    const handleAddQuote = async (values: QuoteFormValues) => {
        if (!selectedDriver && (!manualDriverName || !manualDriverPhone)) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч сонгоно уу эсвэл шинээр бүртгэнэ үү.' });
            return;
        }

        let driverToUse = selectedDriver;

        if (!driverToUse) {
            const existingDriver = drivers.find(d => d.phone_number === manualDriverPhone);
            if (existingDriver) {
                driverToUse = existingDriver;
            } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Шинэ жолоочийг эхлээд бүртгэнэ үү.' });
                return;
            }
        }

        if (!db) return;
        setLocalSubmitting(true);
        try {
            await addDoc(collection(db, 'driver_quotes'), {
                driverId: driverToUse.id,
                driverName: driverToUse.display_name,
                driverPhone: driverToUse.phone_number,
                price: values.price,
                notes: values.notes || '',
                orderItemId: orderItemId,
                orderItemRef: doc(db, 'order_items', orderItemId),
                status: 'Pending',
                channel: 'Phone',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Шинэ үнийн санал нэмэгдлээ.' });
            onFetchOrderData();
            form.reset();
            handleClearSelection();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Үнийн санал нэмэхэд алдаа гарлаа.' });
        } finally {
            setLocalSubmitting(false);
        }
    }

    const calculateFinalPrice = (item: OrderItem, quote: DriverQuote) => {
        const profitMargin = (item.profitMargin || 0) / 100;
        const driverPrice = quote.price;

        const priceWithProfit = driverPrice * (1 + profitMargin);
        const vatAmount = item.withVAT ? priceWithProfit * 0.1 : 0;
        const finalPrice = priceWithProfit + vatAmount;
        const profitAmount = priceWithProfit - driverPrice;

        return {
            priceWithProfit,
            vatAmount,
            finalPrice,
            profitAmount
        };
    }

    const bestQuoteId = React.useMemo(() => {
        if (!quotes || quotes.length === 0) return null;
        let minPrice = Infinity;
        let bestId = null;

        quotes.forEach(q => {
            const { finalPrice } = calculateFinalPrice(item, q);
            if (finalPrice < minPrice) {
                minPrice = finalPrice;
                bestId = q.id;
            }
        });
        return bestId;
    }, [quotes, item]);

    const getChannelName = (channel: 'Phone' | 'App') => channel === 'Phone' ? 'Утсаар' : 'Апп-р';

    return (
        <div className="space-y-4">
            <h4 className="font-semibold pt-2">Шинэ үнийн санал нэмэх</h4>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddQuote)} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-start p-3 border rounded-md bg-muted/50">

                    <div className="md:col-span-4 space-y-2">
                        <FormLabel className="text-xs">Жолооч хайх</FormLabel>
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
                                    >
                                        {selectedDriver
                                            ? `${selectedDriver.display_name} (${selectedDriver.phone_number})`
                                            : "Жолооч сонгох..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Нэр, утсаар хайх..." />
                                        <CommandList>
                                            <CommandEmpty>Олдсонгүй.</CommandEmpty>
                                            <CommandGroup>
                                                {drivers.map((driver) => (
                                                    <CommandItem
                                                        key={driver.id}
                                                        value={`${driver.display_name} ${driver.phone_number}`}
                                                        onSelect={() => handleSelectDriver(driver.id)}
                                                        className="flex flex-col items-start"
                                                    >
                                                        <div className="flex items-center w-full">
                                                            <CheckIcon className={cn("mr-2 h-4 w-4", selectedDriver?.id === driver.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex-1">
                                                                <p className="font-medium">{driver.display_name} ({driver.phone_number})</p>
                                                                {driver.vehicle && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {driver.vehicle.licensePlate} &bull; {driver.vehicle.capacity} &bull; {driver.vehicle.vehicleTypeName} / {driver.vehicle.trailerTypeName}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedDriver && (
                                <Button type="button" variant="ghost" size="icon" onClick={handleClearSelection} className="flex-shrink-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-2">
                        <FormLabel className="text-xs">Нэр</FormLabel>
                        <Input
                            placeholder="Жолоочийн нэр"
                            value={manualDriverName}
                            onChange={(e) => {
                                setManualDriverName(e.target.value);
                                if (selectedDriver) setSelectedDriver(null);
                            }}
                            readOnly={!!selectedDriver}
                        />
                    </div>

                    <div className="md:col-span-3 space-y-2">
                        <FormLabel className="text-xs">Утас</FormLabel>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Утасны дугаар"
                                value={manualDriverPhone}
                                onChange={(e) => {
                                    setManualDriverPhone(e.target.value);
                                    if (selectedDriver) setSelectedDriver(null);
                                }}
                                readOnly={!!selectedDriver}
                            />
                            <Button type="button" onClick={handleRegisterDriver} disabled={isRegisteringDriver || !!selectedDriver}>
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="md:col-span-2"></div>

                    <FormField control={form.control} name="price" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Үнийн санал (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="notes" render={({ field }) => (<FormItem className="md:col-span-8"><FormLabel className="text-xs">Тэмдэглэл</FormLabel><FormControl><Textarea rows={1} {...field} /></FormControl><FormMessage /></FormItem>)} />

                    <div className="md:col-span-1 flex justify-end items-end h-full">
                        <Button type="submit" disabled={isSubmitting || localSubmitting || isRegisteringDriver} className="w-full">
                            {localSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        </Button>
                    </div>
                </form>
            </Form>

            <h4 className="font-semibold pt-4">Ирсэн саналууд</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Жолооч</TableHead>
                        <TableHead>Суваг</TableHead>
                        <TableHead>Үнийн задаргаа</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Үйлдэл</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {quotes && quotes.length > 0 ? (
                        quotes.map(quote => {
                            const { priceWithProfit, finalPrice, profitAmount, vatAmount } = calculateFinalPrice(item, quote);
                            return (
                                <TableRow key={quote.id} className={quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50' : ''}>
                                    <TableCell>
                                        <p className="font-medium">{quote.driverName}</p>
                                        <p className="text-xs text-muted-foreground">{quote.driverPhone}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{getChannelName(quote.channel)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <div className="grid grid-cols-2 gap-x-2">
                                            <span className="font-medium text-muted-foreground">Жолоочийн санал:</span>
                                            <span className="text-right font-mono">{Math.round(quote.price).toLocaleString()}₮</span>

                                            <span className="font-medium text-muted-foreground">Ашиг ({item.profitMargin || 0}%):</span>
                                            <span className={cn(
                                                "text-right font-mono font-bold",
                                                profitAmount >= 0 ? "text-green-600" : "text-red-500"
                                            )}>{Math.round(profitAmount).toLocaleString()}₮</span>

                                            <span className="font-medium text-muted-foreground">НӨАТ-гүй үнэ:</span>
                                            <span className="text-right font-mono">{Math.round(priceWithProfit).toLocaleString()}₮</span>

                                            {item.withVAT && <>
                                                <span className="font-medium text-muted-foreground">НӨАТ (10%):</span>
                                                <span className="text-right font-mono">{Math.round(vatAmount).toLocaleString()}₮</span>
                                            </>}

                                            <div className="col-span-2 border-t mt-1 pt-1 flex items-center justify-end gap-2 text-right">
                                                {bestQuoteId === quote.id && (
                                                    <span className="flex items-center text-[10px] uppercase font-bold text-yellow-600 bg-yellow-100 px-1 rounded">
                                                        Best <ThumbsUp className="w-3 h-3 ml-1" />
                                                    </span>
                                                )}
                                                <span className="font-bold text-base text-primary">{Math.round(finalPrice).toLocaleString()}₮</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={quote.status === 'Accepted' ? 'default' : quote.status === 'Rejected' ? 'destructive' : 'secondary'}>
                                            {quote.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end items-center">
                                            <Button size="sm" variant="outline" onClick={() => onSendToSheet(item, quote)} disabled={sendingToSheet === quote.id}>
                                                {sendingToSheet === quote.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                Sheet-рүү
                                            </Button>
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href="https://docs.google.com/spreadsheets/d/1QYHh2wyugW1QKCvhKLYF37ApSROFl2CjD21z9v6UzC8/edit?gid=1943364164#gid=1943364164" target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            {item.acceptedQuoteId === quote.id ? (
                                                <Button size="sm" variant="destructive" onClick={() => onRevertQuote(item)} disabled={isSubmitting || item.status === 'Shipped'}>
                                                    <XCircle className="mr-2 h-4 w-4" /> Буцаах
                                                </Button>
                                            ) : (
                                                <Button size="sm" onClick={() => onAcceptQuote(item, quote)} disabled={isSubmitting || !!item.acceptedQuoteId || item.status === 'Shipped'}>
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Сонгох
                                                </Button>
                                            )}

                                            {quote.status !== 'Accepted' && (
                                                <Button variant="ghost" size="icon" onClick={() => onDeleteQuote(quote.id)} disabled={isSubmitting}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow><TableCell colSpan={5} className="text-center h-24">Үнийн санал олдсонгүй.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
