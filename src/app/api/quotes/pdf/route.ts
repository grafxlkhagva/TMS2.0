
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Helper to safely round numbers to 2 decimal places.
const roundCurrency = (value: number | undefined | null): number => {
  if (value == null) return 0;
  return Math.round(value * 100) / 100;
};

// This function now receives all necessary data directly
function generateHtmlForPdf({ order, orderItems, allData }: { order: any; orderItems: any[]; allData: any }) {
    const getServiceName = (id: string) => allData.serviceTypes.find((s: any) => s.id === id)?.name || 'N/A';
    const getRegionName = (id: string) => allData.regions.find((r: any) => r.id === id)?.name || 'N/A';
    const getWarehouseName = (id: string) => allData.warehouses.find((w: any) => w.id === id)?.name || 'N/A';
    const getVehicleTypeName = (id: string) => allData.vehicleTypes.find((v: any) => v.id === id)?.name || 'N/A';
    const getTrailerTypeName = (id: string) => allData.trailerTypes.find((t: any) => t.id === id)?.name || 'N/A';
    const getPackagingTypeName = (id: string) => allData.packagingTypes.find((p: any) => p.id === id)?.name || 'N/A';

    const acceptedItems = orderItems.filter(
        (item) => item.acceptedQuoteId && item.finalPrice != null
    );

    const { totalPayment, totalVat, totalFinalPrice } = acceptedItems.reduce(
        (acc, item) => {
            const finalPrice = roundCurrency(item.finalPrice);
            const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
            const vat = finalPrice - priceBeforeVat;
            
            acc.totalPayment += priceBeforeVat;
            acc.totalVat += vat;
            acc.totalFinalPrice += finalPrice;
            return acc;
        }, { totalPayment: 0, totalVat: 0, totalFinalPrice: 0 }
    );
    
    const quoteDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('mn-MN') : new Date().toLocaleDateString('mn-MN');

    const itemsHtml = acceptedItems.length > 0 ? acceptedItems.map(item => {
        const frequency = item.frequency && item.frequency > 0 ? item.frequency : 1;
        const finalPrice = roundCurrency(item.finalPrice);
        const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
        const vatAmount = finalPrice - priceBeforeVat;
        const singleTransportPriceWithProfit = priceBeforeVat / frequency;

        const cargoHtml = (item.cargoItems || []).map((cargo: any) => `
            <dt style="font-weight: 600;">${cargo.name}</dt>
            <dd style="padding-left: 0.5rem; margin-bottom: 0.25rem;">${cargo.quantity} ${cargo.unit} (${getPackagingTypeName(cargo.packagingTypeId)})</dd>
        `).join('');

        return `
            <tr>
                <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${getServiceName(item.serviceTypeId)}</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;"><dl>${cargoHtml}</dl></td>
                <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;"><p>${getRegionName(item.startRegionId)}</p><p style="color: #4b5563;">${getWarehouseName(item.startWarehouseId)}</p></td>
                <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;"><p>${getRegionName(item.endRegionId)}</p><p style="color: #4b5563;">${getWarehouseName(item.endWarehouseId)}</p></td>
                <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${item.totalDistance} км</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${getVehicleTypeName(item.vehicleTypeId)}, ${getTrailerTypeName(item.trailerTypeId)}</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${roundCurrency(singleTransportPriceWithProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${frequency}</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${roundCurrency(priceBeforeVat).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${roundCurrency(vatAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; font-weight: 500; vertical-align: top;">${finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    }).join('') : `<tr><td colspan="11" style="text-align: center; padding: 1rem; border: 1px solid #9ca3af;">Үнийн саналд оруулахаар сонгогдсон тээвэрлэлт алга.</td></tr>`;

    return `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #9ca3af; padding: 4px; font-size: 9px; }
            th { background-color: #f3f4f6; font-weight: 700; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #374151; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            .footer { text-align: center; color: #6b7280; margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 8px;}
          </style>
        </head>
        <body>
          <div style="background-color: white; padding: 2rem; color: #1f2937; font-size: 10px;">
            <header class="header">
              <div><h1 style="font-size: 1.5rem; font-weight: 700;">Tumen Tech TMS</h1></div>
              <div style="text-align: right;">
                <h2 style="font-size: 1.25rem; font-weight: 700; text-transform: uppercase;">ҮНИЙН САНАЛ</h2>
                <div style="display: flex; justify-content: flex-end; margin-top: 0.25rem;"><p style="font-weight: 700;">Огноо:</p><p style="margin-left: 0.25rem;">${quoteDate}</p></div>
                <div style="display: flex; justify-content: flex-end; margin-top: 0.25rem;"><p style="font-weight: 700;">Захиалгын №:</p><p style="margin-left: 0.25rem;">${order.orderNumber}</p></div>
              </div>
            </header>

            <section style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 1rem; font-weight: 600; border-bottom: 1px solid #9ca3af; padding-bottom: 0.25rem; margin-bottom: 0.5rem;">Захиалагчийн мэдээлэл</h3>
              <div><p><strong>Байгууллага:</strong><span style="margin-left: 0.25rem;">${order.customerName}</span></p></div>
              <div><p><strong>Хариуцсан ажилтан:</strong><span style="margin-left: 0.25rem;">${order.employeeName}</span></p></div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Үйлчилгээний төрөл</th><th>Ачааны мэдээлэл</th><th>Ачих</th><th>Буулгах</th><th style="text-align: right;">Нийт зам</th><th>Тээврийн хэрэгсэл</th><th style="text-align: right;">Тээврийн үнэ</th><th style="text-align: right;">Тээврийн тоо</th><th style="text-align: right;">Нийт төлбөр</th><th style="text-align: right;">НӨАТ</th><th style="text-align: right;">Нийт дүн</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
              ${acceptedItems.length > 0 ? `
                <tfoot style="font-weight: 700; background-color: #f3f4f6;">
                  <tr>
                    <td colspan="8" style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Нийт дүн:</td>
                    <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">${roundCurrency(totalPayment).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">${roundCurrency(totalVat).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">${roundCurrency(totalFinalPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tfoot>` : ''
              }
            </table>
            
            <footer class="footer">
              <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
            </footer>
          </div>
        </body>
      </html>
    `;
}

export async function POST(request: Request) {
    try {
        const { order, orderItems, allData } = await request.json();

        if (!order || !orderItems || !Array.isArray(orderItems) || !allData) {
            return NextResponse.json({ message: 'Үнийн санал үүсгэхэд шаардлагатай мэдээлэл дутуу байна.' }, { status: 400 });
        }

        const html = generateHtmlForPdf({ order, orderItems, allData });

        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'networkidle0' });

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
