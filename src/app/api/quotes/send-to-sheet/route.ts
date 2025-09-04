
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { format } from 'date-fns';

// Helper to convert Firestore Timestamps to JS Date objects recursively
const convertTimestamps = (data: any): any => {
    if (data?.seconds) { // Basic check for Firestore Timestamp-like object
        return new Date(data.seconds * 1000);
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
        const { order, orderItem, quote, allData } = convertTimestamps(body);

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
            return allData[collection]?.find((d: any) => d.id === id)?.name || id;
        }

        const cargoInfo = orderItem.cargoItems?.map((c: any) => `${c.quantity}${c.unit} ${c.name}`).join(', ') || '';
        const vehicleInfo = `${getDetailName('vehicleTypes', orderItem.vehicleTypeId)}, ${getDetailName('trailerTypes', orderItem.trailerTypeId)}`;

        const VAT_RATE = 0.1;
        const priceWithProfit = quote.price * (1 + (orderItem.profitMargin || 0) / 100);
        const vatAmount = orderItem.withVAT ? priceWithProfit * VAT_RATE : 0;
        const finalPrice = priceWithProfit + vatAmount;
        const profitAmount = priceWithProfit - quote.price;
        
        const newRow = [
            format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            order.orderNumber,
            order.customerName,
            getDetailName('warehouses', orderItem.startWarehouseId),
            getDetailName('warehouses', orderItem.endWarehouseId),
            cargoInfo,
            vehicleInfo,
            quote.driverName,
            quote.driverPhone,
            quote.price,
            vatAmount,
            profitAmount,
            finalPrice,
            quote.notes || '',
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
        return NextResponse.json({ message: 'Error sending data to Google Sheets', error: (error as Error).message }, { status: 500 });
    }
}
