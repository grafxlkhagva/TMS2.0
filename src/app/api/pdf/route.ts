
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  try {
    const { htmlContent, cssContent } = await request.json();

    if (!htmlContent || !cssContent) {
      return new Response('Missing htmlContent or cssContent', { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    
    // Set the content with both HTML and CSS
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await browser.close();

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response('Failed to generate PDF', { status: 500 });
  }
}
