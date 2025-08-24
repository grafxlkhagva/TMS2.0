
'use client';

import * as React from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import type { Contract, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns"
import SignatureCanvas from 'react-signature-canvas'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Eraser } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ContractPrintLayout from '@/components/contract-print-layout';

export default function SignContractPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [contract, setContract] = React.useState<Contract | null>(null);
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [orderItem, setOrderItem] = React.useState<OrderItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  React.useEffect(() => {
    if (!id || !db) return;
    document.body.classList.add('bg-muted');

    const fetchContract = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'contracts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const contractData = { 
            id: docSnap.id, 
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt.toDate(),
            signedAt: docSnap.data().signedAt ? docSnap.data().signedAt.toDate() : undefined,
             estimatedDeliveryDate: docSnap.data().estimatedDeliveryDate.toDate(),
          } as Contract;
          setContract(contractData);
          
          if (!contractData.shipmentId) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээнд холбогдох тээвэрлэлтийн мэдээлэл олдсонгүй.' });
             setIsLoading(false);
             return;
          }

          const shipmentRef = doc(db, 'shipments', contractData.shipmentId);
          const shipmentSnap = await getDoc(shipmentRef);
          
          if (shipmentSnap.exists()) {
             const shipmentData = {
                ...shipmentSnap.data(),
                estimatedDeliveryDate: shipmentSnap.data().estimatedDeliveryDate.toDate()
             } as Shipment;
             setShipment(shipmentData);

             if (!shipmentData.orderItemRef) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрт холбогдох захиалгын мэдээлэл олдсонгүй.' });
                setIsLoading(false);
                return;
             }
             const orderItemSnap = await getDoc(shipmentData.orderItemRef);
             if (orderItemSnap.exists()) {
                setOrderItem(orderItemSnap.data() as OrderItem);
             } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалгын дэлгэрэнгүй мэдээлэл олдсонгүй.' });
             }
          } else {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлтийн мэдээлэл олдсонгүй.' });
          }
        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ олдсонгүй.' });
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchContract();
    
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
        const contractRef = doc(db, 'contracts', id);

        // Fetch user agent and IP (IP requires a server-side function in a real app)
        const userAgent = navigator.userAgent;

        await updateDoc(contractRef, {
            status: 'signed',
            signedAt: serverTimestamp(),
            signatureDataUrl: signatureDataUrl,
            userAgent: userAgent,
            // ipAddress: would be set by a server function
        });
        
        // Refetch to show signed state
        const updatedDoc = await getDoc(contractRef);
        if (updatedDoc.exists()) {
            const updatedData = updatedDoc.data();
            setContract({
                id: updatedDoc.id,
                ...updatedData,
                createdAt: updatedData.createdAt.toDate(),
                signedAt: updatedData.signedAt.toDate(),
                estimatedDeliveryDate: updatedData.estimatedDeliveryDate.toDate(),
            } as Contract)
        }
        
        toast({ title: 'Баярлалаа!', description: 'Гэрээг амжилттай баталгаажууллаа.'});

    } catch (error) {
        console.error("Error signing contract:", error);
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

  if (!contract || !shipment || !orderItem) {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
             <Card className="w-full max-w-2xl">
                <CardHeader><CardTitle>Алдаа</CardTitle></CardHeader>
                <CardContent><p>Гэрээний мэдээлэл олдсонгүй эсвэл дутуу байна.</p></CardContent>
             </Card>
        </div>
    )
  }
  
  if (contract.status === 'signed' && contract.signedAt) {
    return (
         <div className="flex min-h-screen items-center justify-center p-4">
             <Alert className="max-w-md">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Гэрээ баталгаажсан</AlertTitle>
                <AlertDescription>
                    Та энэхүү гэрээг {format(contract.signedAt, 'yyyy-MM-dd HH:mm')} цагт амжилттай баталгаажуулсан байна.
                </AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Тээвэрлэлтийн гэрээ</CardTitle>
                <CardDescription>Доорх гэрээний нөхцөлтэй танилцаж, зөвшөөрч байвал гарын үсгээ зурж баталгаажуулна уу.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="prose prose-sm max-w-none border rounded-md p-6 bg-white">
                     <ContractPrintLayout 
                        contract={contract}
                        shipment={shipment}
                        orderItem={orderItem}
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
