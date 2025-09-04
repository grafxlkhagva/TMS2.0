
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { Timestamp } from 'firebase/firestore';

const VAT_RATE = 0.1;

// Helper to convert Firestore Timestamps to JS Date objects recursively
const convertTimestamps = (data: any): any => {
    if (data instanceof Timestamp) {
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestamps);
    }
    if (data !== null && typeof data === 'object') {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertTimestamps(data[key]);
        }
        return newData;
    }
    return data;
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
            return allData[collection]?.find((d: any) => d.id === id)?.name || id;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Tumen Tech TMS';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Үнийн санал', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // --- Company Header ---
        sheet.mergeCells('A1:E1');
        sheet.getCell('A1').value = 'Tumen Resources LLC, Mongol HD TOWER-905,';
        sheet.mergeCells('A2:E2');
        sheet.getCell('A2').value = 'Sukhbaatar district, Baga toiruu-49, 210646, Ulaanbaatar city, Mongolia';
        sheet.mergeCells('A4:E4');
        sheet.getCell('A4').value = { text: 'www.tumentech.mn', hyperlink: 'http://www.tumentech.mn' };
        sheet.getCell('A4').font = { color: { argb: 'FF0000FF' }, underline: true };
        sheet.mergeCells('A5:E5');
        sheet.getCell('A5').value = '7775-1111, 80888999';

        // --- Bill To ---
        sheet.getCell('A7').value = 'BILL TO';
        sheet.getCell('A7').font = { bold: true };
        sheet.getCell('A8').value = order.customerName;
        sheet.getCell('A9').value = order.employeeName;
        
        // --- Quote Info ---
        sheet.getCell('L8').value = 'Quote No:';
        sheet.getCell('M8').value = order.orderNumber ? order.orderNumber.replace('ORD', 'Q') : '';
        sheet.getCell('L9').value = 'Quote Date:';
        sheet.getCell('M9').value = new Date();
        
        // --- Table Header ---
        const headerRow = sheet.getRow(11);
        const headers = [
            '№', 'Үйлчилгээний төрөл', 'Ачааны мэдээлэл', 'Тээвэр эхлэх цэг',
            'Тээвэр дуусах цэг', 'Нийт зай', 'Машины төрөл', 'Даац, Тэвшний хэмжээ',
            'Хэмжээ нэгж', 'Нийт хөлс ₮', 'НӨАТ ₮', 'Нийт дүн ₮'
        ];
        headerRow.values = headers;
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        headerRow.height = 40;

        // --- Table Data ---
        let currentRowNum = 12;
        orderItems.forEach((item: any, index: number) => {
            const row = sheet.getRow(currentRowNum);
            const finalPrice = item.finalPrice || 0;
            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
            const vatAmount = item.withVAT ? finalPrice - priceBeforeVat : 0;

            row.values = [
                index + 1,
                getDetailName('serviceTypes', item.serviceTypeId),
                item.cargoItems?.map((c: any) => `${c.quantity}${c.unit} ${c.name}`).join('\n') || '',
                getDetailName('warehouses', item.startWarehouseId),
                getDetailName('warehouses', item.endWarehouseId),
                `${item.totalDistance}км`,
                getDetailName('vehicleTypes', item.vehicleTypeId),
                getDetailName('trailerTypes', item.trailerTypeId),
                item.frequency,
                priceBeforeVat,
                vatAmount,
                finalPrice
            ];
            
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            
             // Center align some cells
            ['A', 'I'].forEach(col => {
                const cell = row.getCell(col);
                cell.alignment = { ...cell.alignment, horizontal: 'center' };
            });

            // Format number cells
            ['J', 'K', 'L'].forEach(col => {
                const cell = row.getCell(col);
                cell.numFmt = '#,##0.00';
            });

            row.height = 45;
            currentRowNum++;
        });
        
        // --- Additional Conditions ---
        currentRowNum += 1;
        const conditionsCell = sheet.getCell(`A${currentRowNum}`);
        const conditions = order.conditions;
        let conditionsText = '';
        if (conditions) {
            conditionsText = [
                `Ачилт: ${conditions.loading}`,
                `Буулгалт: ${conditions.unloading}`,
                 // Assuming you have a way to describe the route. This is a placeholder.
                `Маршрут: ${getDetailName('regions', orderItems[0].startRegionId)} - ${getDetailName('regions', orderItems[0].endRegionId)}`,
                `ТХ-ийн бэлэн байдал: ${conditions.vehicleAvailability}`,
                `Тээвэрлэлтийн хугацаа: Стандарт`,
                `Буцах ачаа: Буцахдаа ачаагүй`, // Placeholder
                `Төлбөрийн нөхцөл: ${conditions.paymentTerm}`,
                `Даатгал: ${conditions.insurance}`
            ].join('\n');
        }
        
        sheet.mergeCells(`A${currentRowNum}:L${currentRowNum + 4}`);
        conditionsCell.value = conditionsText;
        conditionsCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        
        // --- Column Widths ---
        sheet.columns = [
            { key: 'no', width: 5 }, { key: 'service', width: 20 }, { key: 'cargo', width: 30 },
            { key: 'start', width: 20 }, { key: 'end', width: 20 }, { key: 'distance', width: 15 },
            { key: 'vehicle', width: 20 }, { key: 'trailer', width: 25 }, { key: 'quantity', width: 10 },
            { key: 'price', width: 15 }, { key: 'vat', width: 15 }, { key: 'total', width: 15 }
        ];

        // --- Write to buffer ---
        const buffer = await workbook.xlsx.writeBuffer();
        
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="quote-${order.orderNumber}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Error generating Excel file:', error);
        return NextResponse.json({ message: 'Error generating Excel file', error: (error as Error).message }, { status: 500 });
    }
}
