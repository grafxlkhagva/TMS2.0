
'use client';

import * as React from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import type { SafetyBriefing, Shipment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns"
import SignatureCanvas from 'react-signature-canvas'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Eraser } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import SafetyBriefingLayout from '@/components/safety-briefing-layout';

export default function SignSafetyBriefingPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [briefing, setBriefing] = React.useState<SafetyBriefing | null>(null);
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  React.useEffect(() => {
    if (!id || !db) return;
    document.body.classList.add('bg-muted');

    const fetchBriefing = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'safety_briefings', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const briefingData = { 
            id: docSnap.id, 
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt.toDate(),
            signedAt: docSnap.data().signedAt ? docSnap.data().signedAt.toDate() : undefined,
          } as SafetyBriefing;
          setBriefing(briefingData);
          
          if (briefingData.shipmentRef) {
             const shipmentSnap = await getDoc(briefingData.shipmentRef);
             if (shipmentSnap.exists()) {
                 setShipment({
                     id: shipmentSnap.id,
                     ...shipmentSnap.data()
                 } as Shipment);
             } else {
                 toast({ variant: 'destructive', title: 'Алдаа', description: 'Холбогдох тээвэрлэлтийн мэдээлэл олдсонгүй.' });
             }
          }

        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Аюулгүй ажиллагааны заавар олдсонгүй.' });
        }
      } catch (error) {
        console.error("Error fetching briefing:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBriefing();
    
    return () => {
        document.body.classList.remove('bg-muted');
    }
  }, [id, toast]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  }

  const handleSign = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Гарын үсгээ зурна уу.'});
        return;
    }
    if (!id || !db) return;
    setIsSubmitting(true);
    try {
        const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const briefingRef = doc(db, 'safety_briefings', id);

        const userAgent = navigator.userAgent;

        await updateDoc(briefingRef, {
            status: 'signed',
            signedAt: serverTimestamp(),
            signatureDataUrl: signatureDataUrl,
            userAgent: userAgent,
        });
        
        const updatedDoc = await getDoc(briefingRef);
        if (updatedDoc.exists()) {
            const updatedData = updatedDoc.data();
            setBriefing({
                id: updatedDoc.id,
                ...updatedData,
                createdAt: updatedData.createdAt.toDate(),
                signedAt: updatedData.signedAt.toDate(),
            } as SafetyBriefing)
        }
        
        toast({ title: 'Баярлалаа!', description: 'Зааврыг амжилттай баталгаажууллаа.'});

    } catch (error) {
        console.error("Error signing briefing:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Баталгаажуулахад алдаа гарлаа.'});
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!briefing || !shipment) {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
             <Card className="w-full max-w-2xl">
                <CardHeader><CardTitle>Алдаа</CardTitle></CardHeader>
                <CardContent><p>Зааврын мэдээлэл олдсонгүй эсвэл дутуу байна.</p></CardContent>
             </Card>
        </div>
    )
  }
  
  if (briefing.status === 'signed' && briefing.signedAt) {
    return (
         <div className="flex min-h-screen items-center justify-center p-4">
             <Alert className="max-w-md">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Заавар баталгаажсан</AlertTitle>
                <AlertDescription>
                    Та энэхүү зааврыг {format(briefing.signedAt, 'yyyy-MM-dd HH:mm')} цагт амжилттай баталгаажуулсан байна.
                </AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Аюулгүй ажиллагааны зааварчилгаа</CardTitle>
                <CardDescription>Доорх заавартай танилцаж, зөвшөөрч байвал гарын үсгээ зурж баталгаажуулна уу.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="prose prose-sm max-w-none border rounded-md p-6 bg-white">
                     <SafetyBriefingLayout 
                        briefing={briefing}
                        shipment={shipment}
                     />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-4">
                <div className="w-full">
                    <label className="text-sm font-medium">Гарын үсэг зурах талбар:</label>
                    <div className="mt-2 border rounded-md bg-white">
                        <SignatureCanvas
                            ref={sigCanvas} 
                            penColor='black'
                            canvasProps={{ className: 'w-full h-40' }} 
                        />
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={clearSignature}>
                        <Eraser className="mr-2 h-4 w-4"/> Арилгах
                    </Button>
                    <Button onClick={handleSign} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Зөвшөөрч, баталгаажуулах
                    </Button>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
