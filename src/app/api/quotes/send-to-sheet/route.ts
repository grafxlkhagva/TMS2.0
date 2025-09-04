
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { TransportationConditions } from '@/types';

// Helper to convert Firestore Timestamps or date strings to JS Date objects recursively
const convertDateFields = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }
    // Handle Firestore Timestamp
    if (data.seconds !== undefined && data.nanoseconds !== undefined && typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
        try {
            return new Timestamp(data.seconds, data.nanoseconds).toDate();
        } catch (e) {
            // Not a valid timestamp, return as is
            return data;
        }
    }
    // Handle date strings
    if (typeof data === 'string') {
         // Basic check to see if it's a date-like string
        const parsedDate = new Date(data);
        if (!isNaN(parsedDate.getTime()) && data.includes('T') && data.length > 10) {
            return parsedDate;
        }
    }

    if (Array.isArray(data)) {
        return data.map(convertDateFields);
    }
    if (typeof data === 'object') {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertDateFields(data[key]);
        }
        return newData;
    }
    return data;
};

const formatConditions = (conditions?: TransportationConditions) => {
    if (!conditions) return 'N/A';
    
    const parts = [
        `Ачилт: ${conditions.loading}`,
        `Буулгалт: ${conditions.unloading}`,
        `Даатгал: ${conditions.insurance}`,
        `Төлбөр: ${conditions.paymentTerm}`,
        `ТХ бэлэн байдал: ${conditions.vehicleAvailability}`,
        `Зөвшөөрөл: ${conditions.permits?.roadPermit ? 'Замын зөвшөөрөл' : ''}${conditions.permits?.roadPermit && conditions.permits?.roadToll ? ', ' : ''}${conditions.permits?.roadToll ? 'Замын хураамж' : ''}`
    ];

    if (conditions.additionalConditions) {
        parts.push(`Нэмэлт: ${conditions.additionalConditions}`);
    }

    return parts.join(' | ');
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { order, orderItem, quote, allData } = convertDateFields(body);

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
            `${getDetailName('regions', orderItem.startRegionId)}, ${getDetailName('warehouses', orderItem.startWarehouseId)}`,
            `${getDetailName('regions', orderItem.endRegionId)}, ${getDetailName('warehouses', orderItem.endWarehouseId)}`,
            cargoInfo,
            vehicleInfo,
            quote.driverName,
            quote.driverPhone,
            quote.price,
            vatAmount,
            profitAmount,
            finalPrice,
            quote.notes || '',
            formatConditions(order.conditions),
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
        // Provide more detailed error response
        return NextResponse.json({ message: 'Error sending data to Google Sheets', error: errorMessage, details: error }, { status: 500 });
    }
}
