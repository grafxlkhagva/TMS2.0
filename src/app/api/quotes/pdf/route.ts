
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import QuoteDocument from '@/components/pdf/QuoteDocument';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.order || !body.orderItems || !body.allData) {
            return NextResponse.json({ message: 'Үнийн санал үүсгэхэд шаардлагатай мэдээлэл дутуу байна.' }, { status: 400 });
        }

        const pdfStream = await renderToStream(
            <QuoteDocument 
                order={body.order}
                orderItems={body.orderItems}
                allData={body.allData}
            />
        );
        
        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Quote_${body.order.orderNumber}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error("PDF Generation Error:", error);
        return NextResponse.json({ message: error.message || 'PDF үүсгэх явцад дотоод системийн алдаа гарлаа.' }, { status: 500 });
    }
}
