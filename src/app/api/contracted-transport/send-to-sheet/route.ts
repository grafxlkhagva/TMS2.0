import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

const convertDateFields = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }
    
    if (data instanceof Timestamp) {
        return data.toDate();
    }
    
    if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'seconds' in data && 'nanoseconds' in data) {
         if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
            return new Timestamp(data.seconds, data.nanoseconds).toDate();
        }
    }
    
    if (typeof data === 'string') {
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
        const { contract, execution, relatedData } = payload;

        const sheetId = process.env.CONTRACTED_TRANSPORT_SHEET_ID;
        const sheetName = process.env.CONTRACTED_TRANSPORT_SHEET_NAME;

        if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !sheetId || !sheetName) {
            throw new Error("Google Sheets environment variables for contracted transport are not configured.");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const sentDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const executionDate = execution.date ? format(new Date(execution.date), 'yyyy-MM-dd') : 'N/A';
        const loadedDate = execution.statusHistory.find((h:any) => h.status === 'Loaded')?.date;
        const deliveredDate = execution.statusHistory.find((h:any) => h.status === 'Delivered')?.date;
        
        const cargoSummary = execution.selectedCargo.join(', ');

        const newRow = [
            contract.contractNumber, // Гэрээний №
            sentDate, // Илгээсэн огноо
            executionDate, // Гүйцэтгэлийн огноо
            contract.customerName, // Харилцагч
            execution.driverName || 'N/A', // Жолоочийн нэр
            execution.vehicleLicense || 'N/A', // Машины дугаар
            `${relatedData.startRegionName}, ${relatedData.startWarehouseName}`, // Ачих цэг
            `${relatedData.endRegionName}, ${relatedData.endWarehouseName}`, // Буулгах цэг
            cargoSummary, // Сонгосон ачаа
            loadedDate ? format(new Date(loadedDate), 'yyyy-MM-dd HH:mm') : '-', // Ачсан огноо
            deliveredDate ? format(new Date(deliveredDate), 'yyyy-MM-dd HH:mm') : '-', // Хүргэгдсэн огноо
            execution.totalLoadedWeight || 0, // Ачсан жин (тн)
            execution.totalUnloadedWeight || 0, // Буулгасан жин (тн)
            (execution.totalLoadedWeight || 0) - (execution.totalUnloadedWeight || 0), // Зөрүү (тн)
            contract.route.totalDistance, // Зам (км)
            statusTranslations[execution.status as keyof typeof statusTranslations] || execution.status, // Явц
        ];
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: sheetName,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRow],
            },
        });

        return NextResponse.json({ success: true, message: 'Data sent to Google Sheet successfully' });

    } catch (error) {
        console.error('Error sending data to Google Sheets:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ message: 'Error sending data to Google Sheets', error: errorMessage }, { status: 500 });
    }
}


const statusTranslations: Record<string, string> = {
    Pending: 'Хүлээгдэж буй',
    Loaded: 'Ачсан',
    Unloaded: 'Буулгасан',
    Delivered: 'Хүргэгдсэн',
};
