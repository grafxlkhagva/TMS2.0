
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
        };

        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        // Load custom font for Cyrillic support
        let customFont;
        let boldFont;
        let unicodeFontLoaded = false;
        try {
            const fontDir = path.join(process.cwd(), 'src', 'fonts');
            const regularFontPath = path.join(fontDir, 'NotoSans-Regular.ttf');
            const boldFontPath = path.join(fontDir, 'NotoSans-Bold.ttf');
            
            if (fs.existsSync(regularFontPath)) {
                const fontBytes = fs.readFileSync(regularFontPath);
                customFont = await pdfDoc.embedFont(fontBytes);
                unicodeFontLoaded = true;
            }
            if (fs.existsSync(boldFontPath)) {
                const boldFontBytes = fs.readFileSync(boldFontPath);
                boldFont = await pdfDoc.embedFont(boldFontBytes);
            }
        } catch (fontError) {
            console.error('Font loading error:', fontError);
        }

        // Always embed standard fallback fonts (WinAnsi only)
        const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fallbackBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Fallback to standard fonts if custom fonts failed
        if (!customFont) customFont = fallbackFont;
        if (!boldFont) boldFont = fallbackBoldFont;

        // Add page (A4 Landscape)
        const page = pdfDoc.addPage([841.89, 595.28]); // A4 landscape in points
        const { width, height } = page.getSize();

        // Colors
        const blue = rgb(0.31, 0.51, 0.74);
        const orange = rgb(1, 0.4, 0);
        const gray = rgb(0.4, 0.4, 0.4);
        const black = rgb(0, 0, 0);
        const white = rgb(1, 1, 1);
        const lightGray = rgb(0.85, 0.85, 0.85);

        let y = height - 40;

        const toWinAnsiSafe = (text: string) => text.replace(/[^\x00-\xFF]/g, '');
        const drawTextSafe = (text: string, opts: Parameters<typeof page.drawText>[1]) => {
            const raw = String(text ?? '');
            try {
                page.drawText(raw, opts);
            } catch {
                // If custom font fails or WinAnsi can't encode, draw sanitized text with fallback font.
                const safe = toWinAnsiSafe(raw) || ' ';
                page.drawText(safe, { ...opts, font: fallbackFont });
            }
        };

        // Header
        drawTextSafe('Ulaanbaatar city, Mongolia', { x: 40, y, size: 10, font: customFont, color: black });
        y -= 20;
        drawTextSafe('Tumen Resources LLC, Mongol HD TOWER-905,', { x: 40, y, size: 10, font: customFont, color: black });
        y -= 14;
        drawTextSafe('Sukhbaatar district, Baga toiruu-49, 210646, Ulaanbaatar city, Mongolia', { x: 40, y, size: 10, font: customFont, color: black });
        y -= 20;
        drawTextSafe('www.tumentech.mn', { x: 40, y, size: 10, font: customFont, color: rgb(0, 0, 1) });
        y -= 14;
        drawTextSafe('7775-1111', { x: 40, y, size: 10, font: customFont, color: black });

        // Logo - right side
        drawTextSafe('TUMEN TECH', { x: width - 150, y: height - 50, size: 18, font: boldFont, color: orange });
        drawTextSafe('DIGITAL TRUCKING COMPANY', { x: width - 150, y: height - 68, size: 8, font: customFont, color: gray });

        // Bill To section
        y -= 30;
        drawTextSafe('BILL TO', { x: 40, y, size: 10, font: boldFont, color: black });
        y -= 14;
        
        const customerName = order?.customerName || '';
        const employeeName = order?.employeeName || '';
        const employeeEmail = order?.employeeEmail || '';
        const employeePhone = order?.employeePhone || '';
        
        drawTextSafe(customerName, { x: 40, y, size: 10, font: customFont, color: black });
        y -= 14;
        drawTextSafe(employeeName, { x: 40, y, size: 10, font: customFont, color: black });
        y -= 14;
        drawTextSafe(employeeEmail, { x: 40, y, size: 10, font: customFont, color: black });
        y -= 14;
        drawTextSafe(employeePhone, { x: 40, y, size: 10, font: customFont, color: black });

        // Quote Info - right side
        const quoteY = height - 160;
        drawTextSafe('Quote No:', { x: width - 180, y: quoteY, size: 10, font: customFont, color: black });
        drawTextSafe(quoteNumber || 'Q0000', { x: width - 100, y: quoteY, size: 10, font: boldFont, color: black });
        drawTextSafe('Quote Date:', { x: width - 180, y: quoteY - 14, size: 10, font: customFont, color: black });
        const now = new Date();
        drawTextSafe(`${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`, { x: width - 100, y: quoteY - 14, size: 10, font: customFont, color: black });

        // Table
        const tableTop = height - 230;
        const tableLeft = 40;
        // Column widths tuned to avoid overlaps (sum must fit page)
        const colWidths = [22, 55, 95, 78, 78, 42, 60, 70, 50, 34, 55, 45, 55];
        const cellPaddingX = 4;
        const cellPaddingY = 4;
        const bodyFontSize = 8;
        const headerFontSize = 8;
        const lineHeight = 10; // in points
        const minRowHeight = 26;

        const wrapText = (text: string, font: any, size: number, maxWidth: number) => {
            const raw = String(text ?? '').trim();
            if (!raw) return [''];
            const words = raw.split(/\s+/);
            const lines: string[] = [];
            let current = '';

            const widthOf = (t: string) => {
                try {
                    return font.widthOfTextAtSize(t, size);
                } catch {
                    return fallbackFont.widthOfTextAtSize(toWinAnsiSafe(t), size);
                }
            };

            const pushCurrent = () => {
                if (current) lines.push(current);
                current = '';
            };

            for (const w of words) {
                const candidate = current ? `${current} ${w}` : w;
                if (widthOf(candidate) <= maxWidth) {
                    current = candidate;
                    continue;
                }

                // word itself longer than maxWidth -> hard split by characters
                if (!current && widthOf(w) > maxWidth) {
                    let chunk = '';
                    for (const ch of w) {
                        const cand = chunk + ch;
                        if (widthOf(cand) <= maxWidth) {
                            chunk = cand;
                        } else {
                            if (chunk) lines.push(chunk);
                            chunk = ch;
                        }
                    }
                    if (chunk) lines.push(chunk);
                    current = '';
                    continue;
                }

                pushCurrent();
                current = w;
            }
            pushCurrent();
            return lines.length ? lines : [''];
        };

        const drawWrappedCell = (text: string, x: number, topY: number, w: number, h: number, font: any) => {
            const maxW = Math.max(0, w - cellPaddingX * 2);
            const lines = wrapText(text, font, bodyFontSize, maxW);
            let yLine = topY - cellPaddingY - bodyFontSize;
            for (const line of lines) {
                if (yLine < topY - h + cellPaddingY) break; // don't overflow cell
                drawTextSafe(line, {
                    x: x + cellPaddingX,
                    y: yLine,
                    size: bodyFontSize,
                    font,
                    color: black,
                });
                yLine -= lineHeight;
            }
            return lines.length;
        };

        // Table headers (Mongolian template) — fallback to English if Unicode font not loaded
        const headers = unicodeFontLoaded
            ? ['№', 'Үйлчилгээний төрөл', 'Ачааны мэдээлэл', 'Тээвэр эхлэх цэг', 'Тээвэр дуусах цэг', 'Нийт зай', 'Машины төрөл', 'Даац, Тэвшний хэмжээ', 'Үнэлгээ', 'Хэмжээ нэгж', 'Нийт хөлс ₮', 'НӨАТ ₮', 'Нийт дүн ₮']
            : ['No', 'Service Type', 'Cargo Info', 'Loading Point', 'Unloading Point', 'Distance', 'Vehicle Type', 'Trailer Size', 'Unit Price', 'Qty', 'Subtotal', 'VAT', 'Total'];
        
        // Draw header (wrap long header labels)
        let tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const headerLinesPerCol = headers.map((h, i) =>
            wrapText(h, boldFont, headerFontSize, Math.max(0, colWidths[i] - cellPaddingX * 2))
        );
        const headerMaxLines = Math.max(1, ...headerLinesPerCol.map(ls => ls.length));
        const headerHeight = Math.max(34, headerMaxLines * lineHeight + cellPaddingY * 2);

        page.drawRectangle({
            x: tableLeft,
            y: tableTop - headerHeight,
            width: tableWidth,
            height: headerHeight,
            color: blue,
        });

        let xPos = tableLeft;
        headers.forEach((header, i) => {
            const lines = headerLinesPerCol[i];
            const totalTextH = lines.length * lineHeight;
            let yStart = tableTop - (headerHeight - (headerHeight - totalTextH) / 2) + (lineHeight - headerFontSize) / 2;
            // yStart is baseline-ish; adjust per line
            let yLine = tableTop - cellPaddingY - headerFontSize;
            if (lines.length > 1) {
                const topTextY = tableTop - (headerHeight - totalTextH) / 2 - headerFontSize;
                yLine = topTextY;
            }
            for (const line of lines) {
                // center each line horizontally within col
                let textW = 0;
                try {
                    textW = boldFont.widthOfTextAtSize(line, headerFontSize);
                } catch {
                    textW = fallbackBoldFont.widthOfTextAtSize(toWinAnsiSafe(line), headerFontSize);
                }
                drawTextSafe(line, {
                    x: xPos + (colWidths[i] - textW) / 2,
                    y: yLine,
                    size: headerFontSize,
                    font: boldFont,
                    color: white,
                });
                yLine -= lineHeight;
            }
            xPos += colWidths[i];
        });

        // Draw table rows
        let currentY = tableTop - headerHeight;
        
        orderItems.forEach((item: any, index: number) => {
            const finalPrice = item.finalPrice || 0;
            const frequency = item.frequency || 1;
            const unitPrice = frequency > 0 ? finalPrice / frequency : finalPrice;
            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
            const vatAmount = item.withVAT ? finalPrice - priceBeforeVat : 0;

            const cargoDesc = item.cargoItems?.map((c: any) => {
                if (c.name) return c.name;
                return '';
            }).filter(Boolean).join(', ') || '';

            const startWarehouse = getDetailName('warehouses', item.startWarehouseId);
            const endWarehouse = getDetailName('warehouses', item.endWarehouseId);

            const rowData = [
                String(index + 1),
                getDetailName('serviceTypes', item.serviceTypeId),
                cargoDesc,
                startWarehouse,
                endWarehouse,
                item.totalDistance ? `${item.totalDistance}km` : '',
                getDetailName('vehicleTypes', item.vehicleTypeId),
                getDetailName('trailerTypes', item.trailerTypeId),
                Math.round(unitPrice).toLocaleString(),
                String(frequency),
                Math.round(priceBeforeVat).toLocaleString(),
                Math.round(vatAmount).toLocaleString(),
                Math.round(finalPrice).toLocaleString()
            ];

            // Compute required row height based on wrapped lines
            const linesPerCol = rowData.map((t, i) =>
                wrapText(t, customFont, bodyFontSize, Math.max(0, colWidths[i] - cellPaddingX * 2)).length
            );
            const maxLines = Math.max(1, ...linesPerCol);
            const thisRowHeight = Math.max(minRowHeight, maxLines * lineHeight + cellPaddingY * 2);

            currentY -= thisRowHeight;

            // Draw row border
            page.drawRectangle({
                x: tableLeft,
                y: currentY,
                width: tableWidth,
                height: thisRowHeight,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 0.5,
            });

            // Draw cell text wrapped
            let cellX = tableLeft;
            rowData.forEach((cellText, colIndex) => {
                drawWrappedCell(cellText || '', cellX, currentY + thisRowHeight, colWidths[colIndex], thisRowHeight, customFont);
                cellX += colWidths[colIndex];
            });
        });

        // Notes section
        const notesY = currentY - 40;
        page.drawRectangle({
            x: tableLeft,
            y: notesY,
            width: 100,
            height: 18,
            color: lightGray,
        });
        drawTextSafe(unicodeFontLoaded ? 'Тайлбар' : 'Notes', { x: tableLeft + 5, y: notesY + 5, size: 10, font: boldFont, color: black });

        const notes = unicodeFontLoaded
            ? [
                'Ачилт: Захиалагч тал хариуцна',
                'Буулгалт: Захиалагч тал хариуцна',
                'ТХ-ийн бэлэн байдал: 24 цаг',
                'Тээвэрлэлтийн хугацаа: Стандартаар 48 цагын хугацаанд тээвэрлэлт хийнэ.',
                'Төлбөрийн нөхцөл: Гэрээний дагуу',
                'Даатгал: Тээвэрлэгчийн хариуцлагын даатгал /3 тэрбум/'
            ]
            : [
                'Loading: Customer responsibility',
                'Unloading: Customer responsibility',
                'Vehicle availability: 24 hours',
                'Transportation time: Standard 48 hours',
                'Payment terms: According to contract',
                'Insurance: Carrier liability /3 billion/'
            ];

        let noteY = notesY - 15;
        notes.forEach(note => {
            drawTextSafe(note, { x: tableLeft + 5, y: noteY, size: 8, font: customFont, color: black });
            noteY -= 12;
        });

        // Generate PDF bytes
        const pdfBytes = await pdfDoc.save();
        
        return new NextResponse(pdfBytes, {
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
