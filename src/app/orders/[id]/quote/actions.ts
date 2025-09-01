
'use server';

import ReactDOMServer from 'react-dom/server';
import puppeteer from 'puppeteer';
import CombinedQuotePrintLayout from '@/components/combined-quote-print-layout';

// This function needs to be serializable, so we pass plain objects.
export async function generateQuotePdf(data: any): Promise<{ success: boolean, pdfBase64?: string, error?: string }> {
  try {
    const htmlContent = ReactDOMServer.renderToString(
      CombinedQuotePrintLayout({ 
        order: data.order,
        orderItems: data.orderItems,
        allData: data.allData,
      })
    );

    // It's important to include the base CSS for Tailwind to work.
    // In a real-world scenario, you might read this from the filesystem.
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;
    
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set the HTML content of the page
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

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
