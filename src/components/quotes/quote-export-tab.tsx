'use client';

import * as React from 'react';
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, FileDown, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderItem } from '@/types';

const VAT_RATE = 0.1;

interface QuoteExportTabProps {
    order: Order;
    orderItems: OrderItem[];
    allData: any;
}

export function QuoteExportTab({ order, orderItems, allData }: QuoteExportTabProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = React.useState(false);
    const [isPdfExporting, setIsPdfExporting] = React.useState(false);
    const [showPreview, setShowPreview] = React.useState(true);
    const [quoteNumber] = React.useState(() => `Q${Math.floor(Math.random() * 9000) + 1000}`);

    const getDetailName = (collectionName: string, id: string) => {
        if (!id) return '';
        return allData[collectionName]?.find((d: any) => d.id === id)?.name || '';
    };

    const handleSelectItem = (itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedItems(checked ? new Set(orderItems.map(i => i.id)) : new Set());
    };

    const selectedOrderItems = orderItems.filter(i => selectedItems.has(i.id));

    const calculateTotals = () => {
        let totalBeforeVat = 0, totalVat = 0, grandTotal = 0;
        selectedOrderItems.forEach(item => {
            const finalPrice = item.finalPrice || 0;
            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
            totalBeforeVat += priceBeforeVat;
            totalVat += item.withVAT ? finalPrice - priceBeforeVat : 0;
            grandTotal += finalPrice;
        });
        return { totalBeforeVat, totalVat, grandTotal };
    };

    const handlePdfExport = async () => {
        if (selectedItems.size === 0) { toast({ variant: 'destructive', title: 'Анхаар', description: 'PDF татах тээвэрлэлтээ сонгоно уу.' }); return; }
        setIsPdfExporting(true);
        try {
            const res = await fetch('/api/quotes/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order, orderItems: selectedOrderItems, allData, quoteNumber }) });
            if (!res.ok) throw new Error('PDF үүсгэхэд алдаа');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `quote-${quoteNumber}.pdf`; document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: 'Амжилттай', description: 'PDF татагдлаа.' });
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа', description: (e as Error).message }); }
        finally { setIsPdfExporting(false); }
    };

    const handleExcelExport = async () => {
        if (selectedItems.size === 0) { toast({ variant: 'destructive', title: 'Анхаар', description: 'Excel татах тээвэрлэлтээ сонгоно уу.' }); return; }
        setIsExporting(true);
        try {
            const res = await fetch('/api/quotes/excel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order, orderItems: selectedOrderItems, allData }) });
            if (!res.ok) throw new Error('Excel үүсгэхэд алдаа');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `quote-${quoteNumber}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: 'Амжилттай', description: 'Excel татагдлаа.' });
        } catch { toast({ variant: 'destructive', title: 'Алдаа', description: 'Excel үүсгэхэд алдаа.' }); }
        finally { setIsExporting(false); }
    };

    const { totalBeforeVat, totalVat, grandTotal } = calculateTotals();

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Тээвэрлэлтүүдээ сонгоод PDF/Excel татаарай</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                        {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {showPreview ? 'Нуух' : 'Харах'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExcelExport} disabled={isExporting || selectedItems.size === 0}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Excel
                    </Button>
                    <Button size="sm" onClick={handlePdfExport} disabled={isPdfExporting || selectedItems.size === 0}>
                        {isPdfExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        PDF
                    </Button>
                </div>
            </div>

            {/* Selection Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Тээвэрлэлт сонгох</CardTitle>
                    <CardDescription>Сонгосон: {selectedItems.size}/{orderItems.length}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox onCheckedChange={handleSelectAll} checked={selectedItems.size === orderItems.length && orderItems.length > 0} />
                                </TableHead>
                                <TableHead>Үйлчилгээ</TableHead>
                                <TableHead>Чиглэл</TableHead>
                                <TableHead>Ачаа</TableHead>
                                <TableHead className="text-right">Үнийн дүн</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.length > 0 ? orderItems.map(item => (
                                <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-muted/50' : ''}>
                                    <TableCell><Checkbox onCheckedChange={() => handleSelectItem(item.id)} checked={selectedItems.has(item.id)} /></TableCell>
                                    <TableCell className="font-medium">{getDetailName('serviceTypes', item.serviceTypeId)}</TableCell>
                                    <TableCell>
                                        {getDetailName('warehouses', item.startWarehouseId) || getDetailName('regions', item.startRegionId)}
                                        {' → '}
                                        {getDetailName('warehouses', item.endWarehouseId) || getDetailName('regions', item.endRegionId)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {item.cargoItems?.map(c => (<span key={c.id} className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.name} ({c.quantity} {c.unit})</span>))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{item.finalPrice?.toLocaleString()}₮</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Тээвэрлэлт олдсонгүй.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Preview */}
            {showPreview && selectedItems.size > 0 && (
                <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Урьдчилсан харагдац</CardTitle></CardHeader>
                    <CardContent>
                        <div className="bg-white border rounded-lg p-8 shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="text-sm space-y-1">
                                    <p className="text-gray-600">Ulaanbaatar city, Mongolia</p>
                                    <p className="font-medium mt-4">Tumen Resources LLC, Mongol HD TOWER-905,</p>
                                    <p>Sukhbaatar district, Baga toiruu-49, 210646, Ulaanbaatar city, Mongolia</p>
                                    <p className="text-blue-600 underline mt-2">www.tumentech.mn</p>
                                    <p>7775-1111</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-orange-500">TUMEN TECH</div>
                                    <div className="text-xs text-gray-500">DIGITAL TRUCKING COMPANY</div>
                                </div>
                            </div>
                            <div className="flex justify-between mb-6">
                                <div className="text-sm">
                                    <p className="font-bold mb-1">BILL TO</p>
                                    <p className="font-medium">{order.customerName}</p>
                                    <p>{order.employeeName}</p>
                                    <p>{order.employeeEmail}</p>
                                    <p>{order.employeePhone}</p>
                                </div>
                                <div className="text-sm text-right">
                                    <div className="flex justify-end gap-4"><span>Quote No:</span><span className="font-medium">{quoteNumber}</span></div>
                                    <div className="flex justify-end gap-4"><span>Quote Date:</span><span className="font-medium">{format(new Date(), 'M/d/yyyy')}</span></div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#4F81BD] text-white">
                                            <th className="border border-gray-300 p-2 text-center">№</th>
                                            <th className="border border-gray-300 p-2">Үйлчилгээ</th>
                                            <th className="border border-gray-300 p-2">Ачаа</th>
                                            <th className="border border-gray-300 p-2">Эхлэх</th>
                                            <th className="border border-gray-300 p-2">Дуусах</th>
                                            <th className="border border-gray-300 p-2">Зай</th>
                                            <th className="border border-gray-300 p-2">Машин</th>
                                            <th className="border border-gray-300 p-2">Даац</th>
                                            <th className="border border-gray-300 p-2">Тоо</th>
                                            <th className="border border-gray-300 p-2">Үнэлгээ</th>
                                            <th className="border border-gray-300 p-2">НӨАТ ₮</th>
                                            <th className="border border-gray-300 p-2">Нийт ₮</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrderItems.map((item, idx) => {
                                            const finalPrice = item.finalPrice || 0;
                                            const freq = item.frequency || 1;
                                            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
                                            const vatAmt = item.withVAT ? finalPrice - priceBeforeVat : 0;
                                            const cargoDesc = item.cargoItems?.map((c: any) => `${c.name || ''} (${c.quantity || ''} ${c.unit || ''})`).join(', ') || '';
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('serviceTypes', item.serviceTypeId)}</td>
                                                    <td className="border border-gray-300 p-2">{cargoDesc}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('warehouses', item.startWarehouseId)}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('warehouses', item.endWarehouseId)}</td>
                                                    <td className="border border-gray-300 p-2 text-center">{item.totalDistance ? `${item.totalDistance}км` : ''}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('vehicleTypes', item.vehicleTypeId)}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('trailerTypes', item.trailerTypeId)}</td>
                                                    <td className="border border-gray-300 p-2 text-center">{freq}</td>
                                                    <td className="border border-gray-300 p-2 text-right">{Math.round(priceBeforeVat).toLocaleString()}</td>
                                                    <td className="border border-gray-300 p-2 text-right">{Math.round(vatAmt).toLocaleString()}</td>
                                                    <td className="border border-gray-300 p-2 text-right font-medium">{Math.round(finalPrice).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <div className="bg-gray-200 px-3 py-1 font-bold text-sm inline-block">Тайлбар</div>
                                <div className="border border-gray-300 p-4 text-sm space-y-1">
                                    <p>Ачилт: Захиалагч тал хариуцна</p>
                                    <p>Буулгалт: Захилагч тал хариуцна</p>
                                    <p>ТХ-ийн бэлэн байдал: 24 цаг</p>
                                    <p>Тээвэрлэлтийн хугацаа: Стандартаар 48 цагын хугацаанд</p>
                                    <p>Төлбөрийн нөхцөл: Гэрээний дагуу</p>
                                    <p>Даатгал: Тээвэрлэгчийн хариуцлагын даатгал /3 тэрбум/</p>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between gap-8"><span>Нийт хөлс:</span><span className="font-medium">{Math.round(totalBeforeVat).toLocaleString()}₮</span></div>
                                    <div className="flex justify-between gap-8"><span>НӨАТ (10%):</span><span className="font-medium">{Math.round(totalVat).toLocaleString()}₮</span></div>
                                    <Separator />
                                    <div className="flex justify-between gap-8 text-lg font-bold"><span>Нийт дүн:</span><span>{Math.round(grandTotal).toLocaleString()}₮</span></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
