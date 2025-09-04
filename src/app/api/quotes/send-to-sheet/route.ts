
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// Helper to convert Firestore Timestamps or date strings to JS Date objects recursively
const convertDateFields = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }
    
    if (data instanceof Timestamp) {
        return data.toDate();
    }
    
    // Handle Firestore-like object structure from serialization
    if (typeof data === 'object' && data !== null && 'seconds' in data && 'nanoseconds' in data) {
        return new Timestamp(data.seconds, data.nanoseconds).toDate();
    }
    
    // Handle date strings (like ISO strings)
    if (typeof data === 'string') {
         // Basic check to see if it's a date-like string
        const parsedDate = new Date(data);
        if (!isNaN(parsedDate.getTime()) && data.includes('T') && data.length > 10) {
            return parsedDate;
        }
    }

    if (Array.isArray(data)) {
        return data.map(item => convertDateFields(item));
    }
    
    if (typeof data === 'object' && data.constructor === Object) {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertDateFields(data[key]);
        }
        return newData;
    }
    
    return data;
};


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const payload = convertDateFields(body);
        const { order, orderItem, quote, allData } = payload;

        if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SHEET_NAME) {
            throw new Error("Google Sheets environment variables are not configured.");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
            ],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const getDetailName = (collection: string, id: string) => {
            if (!allData || !allData[collection] || !id) {
                return id || 'N/A';
            }
            return allData[collection]?.find((d: any) => d.id === id)?.name || id;
        }

        const cargoInfo = orderItem.cargoItems?.map((c: any) => `${c.quantity}${c.unit} ${c.name}`).join(', ') || '';
        
        const VAT_RATE = 0.1;
        const profitMargin = (orderItem.profitMargin || 0) / 100;
        const priceWithProfit = profitMargin > 0 ? quote.price / (1 - profitMargin) : quote.price;
        const vatAmount = orderItem.withVAT ? priceWithProfit * VAT_RATE : 0;
        const finalPrice = priceWithProfit + vatAmount;
        const profitAmount = priceWithProfit - quote.price;
        
        const sentDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        
        const newRow = [
            sentDate, // Илгээсэн огноо
            getDetailName('regions', orderItem.startRegionId), // Ачих бүс
            getDetailName('regions', orderItem.endRegionId), // Буулгах бүс
            getDetailName('serviceTypes', orderItem.serviceTypeId), // Үйлчилгээний төрөл
            orderItem.frequency, // Давтамж
            getDetailName('warehouses', orderItem.startWarehouseId), // Ачих агуулах
            getDetailName('warehouses', orderItem.endWarehouseId), // Буулгах агуулах
            orderItem.totalDistance, // Нийт зам (км)
            format(new Date(orderItem.loadingStartDate), 'yyyy-MM-dd'), // Ачих огноо
            format(new Date(orderItem.unloadingEndDate), 'yyyy-MM-dd'), // Буулгах огноо
            getDetailName('vehicleTypes', orderItem.vehicleTypeId), // Машин
            getDetailName('trailerTypes', orderItem.trailerTypeId), // Тэвш
            orderItem.profitMargin || 0, // Ашгийн хувь (%)
            cargoInfo, // Ачааны нэгтгэл
            order.orderNumber, // Захиалгын №
            order.customerName, // Харилцагч
            quote.driverName, // Жолоочийн нэр
            quote.driverPhone, // Жолоочийн утас
            quote.price, // Жолоочийн санал (₮)
            vatAmount, // НӨАТ (₮)
            profitAmount, // Ашиг (₮)
            finalPrice, // Нийт дүн (₮)
            quote.notes || '', // Жолоочийн тэмдэглэл
        ];
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: process.env.GOOGLE_SHEET_NAME,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRow],
            },
        });

        return NextResponse.json({ success: true, message: 'Data sent to Google Sheet successfully' });

    } catch (error) {
        console.error('Error sending data to Google Sheets:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ message: 'Error sending data to Google Sheets', error: errorMessage, details: error }, { status: 500 });
    }
}
