
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { Timestamp } from 'firebase/firestore';

const VAT_RATE = 0.1;

// Helper to convert Firestore Timestamps to JS Date objects recursively
const convertTimestamps = (data: any): any => {
    if (!data) return data;

    if (data instanceof Timestamp) {
        return data.toDate();
    }
    
    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }
    
    if (typeof data === 'object' && data.constructor === Object) {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertTimestamps(data[key]);
        }
        return newData;
    }
    
    return data;
};

// Generate quote number
const generateQuoteNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `Q${random}`;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const payload = convertTimestamps(body);

        const { order, orderItems, allData } = payload;
        
        if (!order || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            return NextResponse.json({ message: 'Invalid input data' }, { status: 400 });
        }

        const getDetailName = (collection: string, id: string) => {
            if (!id) return '';
            return allData[collection]?.find((d: any) => d.id === id)?.name || '';
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Tumen Tech TMS';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Үнийн санал', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // --- Company Header ---
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = 'Ulaanbaatar city, Mongolia';
        sheet.getCell('A1').font = { size: 10 };

        sheet.mergeCells('A3:F3');
        sheet.getCell('A3').value = 'Tumen Resources LLC, Mongol HD TOWER-905,';
        sheet.getCell('A3').font = { size: 10 };
        
        sheet.mergeCells('A4:F4');
        sheet.getCell('A4').value = 'Sukhbaatar district, Baga toiruu-49, 210646, Ulaanbaatar city, Mongolia';
        sheet.getCell('A4').font = { size: 10 };

        sheet.mergeCells('A6:F6');
        sheet.getCell('A6').value = { text: 'www.tumentech.mn', hyperlink: 'http://www.tumentech.mn' };
        sheet.getCell('A6').font = { color: { argb: 'FF0000FF' }, underline: true, size: 10 };
        
        sheet.mergeCells('A7:F7');
        sheet.getCell('A7').value = '7775-1111';
        sheet.getCell('A7').font = { size: 10 };

        // --- Bill To ---
        sheet.getCell('A9').value = 'BILL TO';
        sheet.getCell('A9').font = { bold: true, size: 10 };
        sheet.getCell('A10').value = order.customerName || '';
        sheet.getCell('A10').font = { size: 10 };
        sheet.getCell('A11').value = order.employeeName || '';
        sheet.getCell('A11').font = { size: 10 };
        sheet.getCell('A12').value = order.employeeEmail || '';
        sheet.getCell('A12').font = { size: 10 };
        sheet.getCell('A13').value = order.employeePhone || '';
        sheet.getCell('A13').font = { size: 10 };

        // --- Quote Info ---
        const quoteNumber = generateQuoteNumber();
        sheet.getCell('L10').value = 'Quote No:';
        sheet.getCell('L10').font = { size: 10 };
        sheet.getCell('M10').value = quoteNumber;
        sheet.getCell('M10').font = { size: 10 };
        sheet.getCell('L11').value = 'Quote Date:';
        sheet.getCell('L11').font = { size: 10 };
        const now = new Date();
        sheet.getCell('M11').value = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
        sheet.getCell('M11').font = { size: 10 };
        
        // --- Table Header ---
        const headerRow = sheet.getRow(15);
        const headers = [
            '№', 'Үйлчилгээний төрөл', 'Ачааны мэдээлэл', 'Тээвэр эхлэх цэг',
            'Тээвэр дуусах цэг', 'Нийт зай', 'Машины төрөл', 'Даац, Тэвшний хэмжээ',
            'Үнэлгээ', 'Хэмжээ нэгж', 'Нийт хөлс ₮', 'НӨАТ ₮', 'Нийт дүн ₮'
        ];
        headerRow.values = headers;
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        headerRow.height = 45;

        // --- Table Data ---
        let currentRowNum = 16;
        let grandTotalBeforeVat = 0;
        let grandTotalVat = 0;
        let grandTotal = 0;

        orderItems.forEach((item: any, index: number) => {
            const row = sheet.getRow(currentRowNum);
            const finalPrice = item.finalPrice || 0;
            const frequency = item.frequency || 1;
            const unitPrice = frequency > 0 ? finalPrice / frequency : finalPrice;
            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
            const vatAmount = item.withVAT ? finalPrice - priceBeforeVat : 0;

            grandTotalBeforeVat += priceBeforeVat;
            grandTotalVat += vatAmount;
            grandTotal += finalPrice;

            // Build cargo description
            const cargoDesc = item.cargoItems?.map((c: any) => {
                const parts = [];
                if (c.name) parts.push(c.name);
                if (c.quantity && c.unit) parts.push(`(${c.quantity} ${c.unit})`);
                return parts.join(' ');
            }).join(', ') || '';

            // Build start location
            const startRegion = getDetailName('regions', item.startRegionId);
            const startWarehouse = getDetailName('warehouses', item.startWarehouseId);
            const startLocation = [startRegion, startWarehouse].filter(Boolean).join(', ');

            // Build end location
            const endRegion = getDetailName('regions', item.endRegionId);
            const endWarehouse = getDetailName('warehouses', item.endWarehouseId);
            const endLocation = [endRegion, endWarehouse].filter(Boolean).join(', ');

            row.values = [
                index + 1,
                getDetailName('serviceTypes', item.serviceTypeId),
                cargoDesc,
                startLocation,
                endLocation,
                item.totalDistance ? `${item.totalDistance}км` : '',
                getDetailName('vehicleTypes', item.vehicleTypeId),
                getDetailName('trailerTypes', item.trailerTypeId),
                unitPrice,
                frequency,
                priceBeforeVat,
                vatAmount,
                finalPrice
            ];
            
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.font = { size: 9 };
            });
            
            // Center align some cells
            ['A', 'J'].forEach(col => {
                const cell = row.getCell(col);
                cell.alignment = { ...cell.alignment, horizontal: 'center' };
            });

            // Format number cells
            ['I', 'K', 'L', 'M'].forEach(col => {
                const cell = row.getCell(col);
                cell.numFmt = '#,##0';
                cell.alignment = { ...cell.alignment, horizontal: 'right' };
            });

            row.height = 60;
            currentRowNum++;
        });

        // --- Notes/Conditions Section ---
        currentRowNum += 1;
        sheet.getCell(`A${currentRowNum}`).value = 'Тайлбар';
        sheet.getCell(`A${currentRowNum}`).font = { bold: true, size: 10 };
        sheet.getCell(`A${currentRowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        
        currentRowNum += 1;
        const notesStartRow = currentRowNum;
        const defaultNotes = [
            'Ачилт: Захиалагч тал хариуцна',
            'Буулгалт: Захилагч тал хариуцна',
            `Маршрут: ${orderItems.length > 0 ? `${getDetailName('warehouses', orderItems[0].startWarehouseId)} - ${getDetailName('warehouses', orderItems[0].endWarehouseId)}` : ''}`,
            'ТХ-ийн бэлэн байдал: 24 цаг',
            'Тээвэрлэлтийн хугацаа: Стандартаар 48 цагын хугацаанд тээвэрлэлт хийнэ.',
            'Төлбөрийн нөхцөл: Гэрээний дагуу',
            'Даатгал: Тээвэрлэгчийн хариуцлагын даатгал /3 тэрбум/'
        ];
        
        sheet.mergeCells(`A${notesStartRow}:M${notesStartRow + 6}`);
        sheet.getCell(`A${notesStartRow}`).value = defaultNotes.join('\n');
        sheet.getCell(`A${notesStartRow}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        sheet.getCell(`A${notesStartRow}`).font = { size: 9 };
        sheet.getCell(`A${notesStartRow}`).border = { 
            top: { style: 'thin' }, 
            left: { style: 'thin' }, 
            bottom: { style: 'thin' }, 
            right: { style: 'thin' } 
        };
        
        // --- Column Widths ---
        sheet.columns = [
            { key: 'no', width: 5 }, 
            { key: 'service', width: 15 }, 
            { key: 'cargo', width: 35 },
            { key: 'start', width: 18 }, 
            { key: 'end', width: 18 }, 
            { key: 'distance', width: 12 },
            { key: 'vehicle', width: 15 }, 
            { key: 'trailer', width: 18 }, 
            { key: 'unitPrice', width: 12 },
            { key: 'quantity', width: 10 },
            { key: 'price', width: 14 }, 
            { key: 'vat', width: 12 }, 
            { key: 'total', width: 14 }
        ];

        // --- Write to buffer ---
        const buffer = await workbook.xlsx.writeBuffer();
        
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="quote-${quoteNumber}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Error generating Excel file:', error);
        return NextResponse.json({ message: 'Error generating Excel file', error: (error as Error).message }, { status: 500 });
    }
}
