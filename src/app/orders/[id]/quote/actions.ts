
'use server';

import puppeteer from 'puppeteer';

// Helper to safely round numbers to 2 decimal places.
const roundCurrency = (value: number | undefined | null): number => {
  if (value == null || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
};

// Helper function to generate HTML for the quote.
// This avoids using ReactDOMServer in a Server Action.
const generateHtmlForQuote = (data: any): string => {
  const { order, orderItems, allData } = data;
  
  if (!order) return '<h1>Захиалга олдсонгүй.</h1>';

  const getServiceName = (id: string) => allData.serviceTypes.find((s: any) => s.id === id)?.name || 'N/A';
  const getRegionName = (id: string) => allData.regions.find((r: any) => r.id === id)?.name || 'N/A';
  const getWarehouseName = (id: string) => allData.warehouses.find((w: any) => w.id === id)?.name || 'N/A';
  const getVehicleTypeName = (id: string) => allData.vehicleTypes.find((v: any) => v.id === id)?.name || 'N/A';
  const getTrailerTypeName = (id: string) => allData.trailerTypes.find((t: any) => t.id === id)?.name || 'N/A';
  const getPackagingTypeName = (id: string) => allData.packagingTypes.find((p: any) => p.id === id)?.name || 'N/A';
  
  const { totalPayment, totalVat, totalFinalPrice } = orderItems.reduce(
    (acc: any, item: any) => {
      const finalPrice = roundCurrency(item.finalPrice);
      const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
      const vat = finalPrice - priceBeforeVat;
      
      acc.totalPayment += priceBeforeVat;
      acc.totalVat += vat;
      acc.totalFinalPrice += finalPrice;
      return acc;
    },
    { totalPayment: 0, totalVat: 0, totalFinalPrice: 0 }
  );
  
  const quoteDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
  
  const itemsHtml = orderItems.map((item: any) => {
      const frequency = item.frequency && item.frequency > 0 ? item.frequency : 1;
      const finalPrice = roundCurrency(item.finalPrice);
      const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
      const vatAmount = finalPrice - priceBeforeVat;
      const singleTransportPriceWithProfit = priceBeforeVat / frequency;

      const cargoHtml = (item.cargoItems || []).map((cargo: any) => `
        <div style="margin-bottom: 4px;">
            <p style="font-weight: 600;">${cargo.name}</p>
            <p style="padding-left: 8px; color: #555;">${cargo.quantity} ${cargo.unit} (${getPackagingTypeName(cargo.packagingTypeId)})</p>
        </div>
      `).join('');

      return `
        <tr>
          <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${getServiceName(item.serviceTypeId)}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${cargoHtml}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${getRegionName(item.startRegionId)}, ${getWarehouseName(item.startWarehouseId)}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${getRegionName(item.endRegionId)}, ${getWarehouseName(item.endWarehouseId)}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${item.totalDistance} км</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; vertical-align: top;">${getVehicleTypeName(item.vehicleTypeId)}, ${getTrailerTypeName(item.trailerTypeId)}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${roundCurrency(singleTransportPriceWithProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${frequency}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${roundCurrency(priceBeforeVat).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; vertical-align: top;">${roundCurrency(vatAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right; font-weight: 500; vertical-align: top;">${finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

  return `
    <div style="background-color: white; padding: 2rem; color: #1f2937; font-size: 10px; font-family: sans-serif;">
      <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #374151; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div><h1 style="font-size: 1.5rem; font-weight: bold;">Tumen Tech TMS</h1></div>
        <div style="text-align: right;">
          <h2 style="font-size: 1.25rem; font-weight: bold; text-transform: uppercase;">ҮНИЙН САНАЛ</h2>
          <p><strong>Огноо:</strong> ${quoteDate}</p>
          <p><strong>Захиалгын №:</strong> ${order.orderNumber}</p>
        </div>
      </header>

      <section style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1rem; font-weight: 600; border-bottom: 1px solid #6b7280; padding-bottom: 0.25rem; margin-bottom: 0.5rem;">Захиалагчийн мэдээлэл</h3>
        <p><strong>Байгууллага:</strong> ${order.customerName}</p>
        <p><strong>Хариуцсан ажилтан:</strong> ${order.employeeName}</p>
      </section>

      <table style="width: 100%; text-align: left; font-size: 9px; border-collapse: collapse;">
        <thead style="background-color: #f3f4f6; font-weight: bold;">
          <tr>
            <th style="padding: 4px; border: 1px solid #9ca3af;">Үйлчилгээний төрөл</th>
            <th style="padding: 4px; border: 1px solid #9ca3af;">Ачааны мэдээлэл</th>
            <th style="padding: 4px; border: 1px solid #9ca3af;">Ачих</th>
            <th style="padding: 4px; border: 1px solid #9ca3af;">Буулгах</th>
            <th style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Нийт зам</th>
            <th style="padding: 4px; border: 1px solid #9ca3af;">Тээврийн хэрэгсэл</th>
            <th style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Тээврийн үнэ</th>
            <th style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Тээврийн тоо</th>
            <th style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Нийт төлбөр</th>
            <th style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">НӨАТ</th>
            <th style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Нийт дүн</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot style="font-weight: bold; background-color: #f3f4f6;">
          <tr>
            <td colspan="8" style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">Нийт дүн:</td>
            <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">${roundCurrency(totalPayment).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">${roundCurrency(totalVat).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="padding: 4px; border: 1px solid #9ca3af; text-align: right;">${roundCurrency(totalFinalPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
        </tfoot>
      </table>
      
      <footer style="text-align: center; color: #6b7280; margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
          <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
      </footer>
    </div>
  `;
}


// This function needs to be serializable, so we pass plain objects.
export async function generateQuotePdf(data: any): Promise<{ success: boolean, pdfBase64?: string, error?: string }> {
  try {
    const htmlContent = generateHtmlForQuote(data);

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set the HTML content of the page
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Return the PDF as a base64 string
    return { success: true, pdfBase64: pdfBuffer.toString('base64') };

  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: 'An error occurred while generating the PDF.' };
  }
}
