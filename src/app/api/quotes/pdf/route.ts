
import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Timestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const VAT_RATE = 0.1;

// Helper to convert Firestore Timestamps
const convertTimestamps = (data: any): any => {
    if (!data) return data;
    if (data instanceof Timestamp) return data.toDate();
    if (Array.isArray(data)) return data.map(item => convertTimestamps(item));
    if (typeof data === 'object' && data.constructor === Object) {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertTimestamps(data[key]);
        }
        return newData;
    }
    return data;
};

// Load and add custom font to jsPDF
const addCyrillicFont = (doc: jsPDF) => {
    try {
        // Read font files
        const fontDir = path.join(process.cwd(), 'src', 'fonts');
        const regularFontPath = path.join(fontDir, 'Roboto-Regular.ttf');
        const boldFontPath = path.join(fontDir, 'Roboto-Bold.ttf');
        
        if (fs.existsSync(regularFontPath)) {
            const regularFontData = fs.readFileSync(regularFontPath);
            const regularBase64 = regularFontData.toString('base64');
            doc.addFileToVFS('Roboto-Regular.ttf', regularBase64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        }
        
        if (fs.existsSync(boldFontPath)) {
            const boldFontData = fs.readFileSync(boldFontPath);
            const boldBase64 = boldFontData.toString('base64');
            doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
            doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        }
        
        return true;
    } catch (error) {
        console.error('Error loading fonts:', error);
        return false;
    }
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const payload = convertTimestamps(body);
        const { order, orderItems, allData, quoteNumber } = payload;
        
        if (!order || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            return NextResponse.json({ message: 'Invalid input data' }, { status: 400 });
        }

        const getDetailName = (collection: string, id: string) => {
            if (!id) return '';
            return allData[collection]?.find((d: any) => d.id === id)?.name || '';
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        // Add Cyrillic font support
        const fontLoaded = addCyrillicFont(doc);
        const fontFamily = fontLoaded ? 'Roboto' : 'helvetica';
        
        doc.setFont(fontFamily, 'normal');
        
        // Header
        doc.setFontSize(10);
        doc.text('Ulaanbaatar city, Mongolia', 14, 15);
        doc.text('Tumen Resources LLC, Mongol HD TOWER-905,', 14, 22);
        doc.text('Sukhbaatar district, Baga toiruu-49, 210646, Ulaanbaatar city, Mongolia', 14, 29);
        
        doc.setTextColor(0, 0, 255);
        doc.text('www.tumentech.mn', 14, 38);
        doc.setTextColor(0, 0, 0);
        doc.text('7775-1111', 14, 45);

        // Logo placeholder - right side
        doc.setFontSize(16);
        doc.setFont(fontFamily, 'bold');
        doc.setTextColor(255, 102, 0);
        doc.text('TUMEN TECH', 240, 25);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('DIGITAL TRUCKING COMPANY', 240, 32);
        doc.setTextColor(0, 0, 0);

        // Bill To
        doc.setFontSize(10);
        doc.setFont(fontFamily, 'bold');
        doc.text('BILL TO', 14, 55);
        doc.setFont(fontFamily, 'normal');
        doc.text(order?.customerName || '', 14, 62);
        doc.text(order?.employeeName || '', 14, 69);
        doc.text(order?.employeeEmail || '', 14, 76);
        doc.text(order?.employeePhone || '', 14, 83);

        // Quote Info - right side
        doc.text('Quote No:', 230, 62);
        doc.text(quoteNumber || 'Q0000', 260, 62);
        doc.text('Quote Date:', 230, 69);
        const now = new Date();
        doc.text(`${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`, 260, 69);

        // Table
        const tableData = orderItems.map((item: any, index: number) => {
            const finalPrice = item.finalPrice || 0;
            const frequency = item.frequency || 1;
            const unitPrice = frequency > 0 ? finalPrice / frequency : finalPrice;
            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
            const vatAmount = item.withVAT ? finalPrice - priceBeforeVat : 0;

            const cargoDesc = item.cargoItems?.map((c: any) => {
                const parts = [];
                if (c.name) parts.push(c.name);
                if (c.quantity && c.unit) parts.push(`(${c.quantity} ${c.unit})`);
                return parts.join(' ');
            }).join(', ') || '';

            const startWarehouse = getDetailName('warehouses', item.startWarehouseId);
            const startRegion = getDetailName('regions', item.startRegionId);
            const startLocation = [startWarehouse, startRegion].filter(Boolean).join(', ');

            const endWarehouse = getDetailName('warehouses', item.endWarehouseId);
            const endRegion = getDetailName('regions', item.endRegionId);
            const endLocation = [endWarehouse, endRegion].filter(Boolean).join(', ');

            return [
                index + 1,
                getDetailName('serviceTypes', item.serviceTypeId),
                cargoDesc,
                startLocation,
                endLocation,
                item.totalDistance ? `${item.totalDistance}км` : '',
                getDetailName('vehicleTypes', item.vehicleTypeId),
                getDetailName('trailerTypes', item.trailerTypeId),
                Math.round(unitPrice).toLocaleString(),
                frequency,
                Math.round(priceBeforeVat).toLocaleString(),
                Math.round(vatAmount).toLocaleString(),
                Math.round(finalPrice).toLocaleString()
            ];
        });

        autoTable(doc, {
            startY: 92,
            head: [[
                '№', 'Үйлчилгээ', 'Ачааны мэдээлэл', 'Ачих цэг',
                'Буулгах цэг', 'Зай', 'Машины төрөл', 'Чиргүүл',
                'Нэгж үнэ', 'Тоо', 'Дүн', 'НӨАТ', 'Нийт'
            ]],
            body: tableData,
            theme: 'grid',
            styles: {
                font: fontFamily,
                fontSize: 7,
            },
            headStyles: {
                fillColor: [79, 129, 189],
                textColor: [255, 255, 255],
                fontSize: 7,
                halign: 'center',
                font: fontFamily,
            },
            bodyStyles: {
                fontSize: 7,
                cellPadding: 2,
                font: fontFamily,
            },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 20 },
                2: { cellWidth: 35 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 15 },
                6: { cellWidth: 20 },
                7: { cellWidth: 25 },
                8: { cellWidth: 18, halign: 'right' },
                9: { cellWidth: 10, halign: 'center' },
                10: { cellWidth: 20, halign: 'right' },
                11: { cellWidth: 18, halign: 'right' },
                12: { cellWidth: 20, halign: 'right' }
            },
            margin: { left: 14, right: 14 }
        });

        // Notes section
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFillColor(217, 217, 217);
        doc.rect(14, finalY, 40, 7, 'F');
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(9);
        doc.text('Тайлбар', 16, finalY + 5);

        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(8);
        const notes = [
            'Ачилт: Захиалагч тал хариуцна',
            'Буулгалт: Захиалагч тал хариуцна',
            'ТХ-ийн бэлэн байдал: 24 цаг',
            'Тээвэрлэлтийн хугацаа: Стандартаар 48 цагын хугацаанд',
            'Төлбөрийн нөхцөл: Гэрээний дагуу',
            'Даатгал: Тээвэрлэгчийн хариуцлагын даатгал /3 тэрбум/'
        ];
        
        let noteY = finalY + 14;
        notes.forEach(note => {
            doc.text(note, 16, noteY);
            noteY += 5;
        });

        // Generate PDF buffer
        const pdfBuffer = doc.output('arraybuffer');
        
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="quote-${quoteNumber}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating PDF file:', error);
        return NextResponse.json({ message: 'Error generating PDF file', error: (error as Error).message }, { status: 500 });
    }
}
