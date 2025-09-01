
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Order,
  OrderItem,
  ServiceType,
  Region,
  VehicleType,
  TrailerType,
  Warehouse,
  PackagingType,
  OrderItemCargo,
} from '@/types';
import ReactDOMServer from 'react-dom/server';
import CombinedQuotePrintLayout from '@/components/combined-quote-print-layout';

const toDateSafe = (date: any): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'string' || typeof date === 'number') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }
  return undefined;
};

async function getQuoteData(orderId: string, itemIds: string[]) {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderDocSnap = await getDoc(orderDocRef);

    if (!orderDocSnap.exists()) {
        throw new Error('Захиалга олдсонгүй.');
    }
    const orderData = orderDocSnap.data();
    const order = { 
      id: orderDocSnap.id, 
      ...orderData,
      createdAt: toDateSafe(orderData.createdAt)
    } as Order;

    const [warehouseSnap, serviceTypeSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap] = await Promise.all([
      getDocs(query(collection(db, "warehouses"), orderBy("name"))),
      getDocs(query(collection(db, "service_types"), orderBy("name"))),
      getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
      getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
      getDocs(query(collection(db, "regions"), orderBy("name"))),
      getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
    ]);

    const allData = {
        warehouses: warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)),
        serviceTypes: serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)),
        vehicleTypes: vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)),
        trailerTypes: trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)),
        regions: regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)),
        packagingTypes: packagingTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingType)),
    };
    
    const itemsPromises = itemIds.map(async (itemId) => {
        const itemDoc = await getDoc(doc(db, 'order_items', itemId));
        if (!itemDoc.exists()) return null;

        const itemData = itemDoc.data();
        const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', itemDoc.id));
        const cargoSnapshot = await getDocs(cargoQuery);
        const cargoItems = cargoSnapshot.docs.map(cargoDoc => ({ id: cargoDoc.id, ...cargoDoc.data() } as OrderItemCargo));
        
        return { 
            id: itemDoc.id, 
            ...itemData, 
            cargoItems, 
            createdAt: toDateSafe(itemData.createdAt),
            loadingStartDate: toDateSafe(itemData.loadingStartDate),
            loadingEndDate: toDateSafe(itemData.loadingEndDate),
            unloadingStartDate: toDateSafe(itemData.unloadingStartDate),
            unloadingEndDate: toDateSafe(itemData.unloadingEndDate),
        } as OrderItem;
    });

    const orderItems = (await Promise.all(itemsPromises)).filter((item): item is OrderItem => item !== null);

    return { order, orderItems, allData };
}

export async function POST(request: Request) {
    try {
        const { orderId, itemIds } = await request.json();

        if (!orderId || !itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json({ message: 'Захиалгын дугаар болон тээвэрлэлтийн мэдээлэл дутуу байна.' }, { status: 400 });
        }

        const { order, orderItems, allData } = await getQuoteData(orderId, itemIds);

        const html = ReactDOMServer.renderToStaticMarkup(
            CombinedQuotePrintLayout({ order, orderItems, allData })
        );

        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setContent(`
          <html>
            <head>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
                body { font-family: 'Inter', sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #9ca3af; padding: 4px; text-align: left; vertical-align: top; }
                th { background-color: #f3f4f6; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                .text-base { font-size: 1rem; line-height: 1.5rem; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });
        await browser.close();
        
        return new NextResponse(pdf, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Quote_${order.orderNumber}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error("PDF Generation Error:", error);
        return NextResponse.json({ message: error.message || 'PDF үүсгэх явцад дотоод системийн алдаа гарлаа.' }, { status: 500 });
    }
}
