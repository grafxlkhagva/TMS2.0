
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
    if (!id) return;
    document.body.classList.add('bg-muted');

    const fetchContract = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'contracts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const contractData = { id: docSnap.id, ...docSnap.data() } as Contract;
          setContract(contractData);

          const shipmentSnap = await getDoc(contractData.shipmentRef);
          if (shipmentSnap.exists()) {
             const shipmentData = shipmentSnap.data() as Shipment;
             setShipment(shipmentData);
             const orderItemSnap = await getDoc(shipmentData.orderItemRef);
             if (orderItemSnap.exists()) {
                setOrderItem(orderItemSnap.data() as OrderItem);
             }
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
    setIsSubmitting(true);
    try {
        const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const contractRef = doc(db, 'contracts', id);
        await updateDoc(contractRef, {
            status: 'signed',
            signedAt: serverTimestamp(),
            signatureDataUrl: signatureDataUrl,
            // In a real app, you would collect IP and User Agent from the backend
            // for security and audit purposes.
        });
        
        // Refetch to show signed state
        const updatedDoc = await getDoc(contractRef);
        const updatedData = updatedDoc.data();
        setContract({
            id: updatedDoc.id,
            ...updatedData,
            createdAt: updatedData?.createdAt.toDate(),
            signedAt: updatedData?.signedAt.toDate()
        } as Contract)
        
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
  
  const finalPrice = orderItem.finalPrice || 0;

  if (contract.status === 'signed') {
    return (
         <div className="flex min-h-screen items-center justify-center p-4">
             <Alert className="max-w-md">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Гэрээ баталгаажсан</AlertTitle>
                <AlertDescription>
                    Та энэхүү гэрээг {format(contract.signedAt!, 'yyyy-MM-dd HH:mm')} цагт амжилттай баталгаажуулсан байна.
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
            <CardContent className="prose prose-sm max-w-none">
                 <h2 className="text-center">Тээвэрлэлтийн гэрээ №{shipment.shipmentNumber}</h2>
                 <p className="text-right">Огноо: {format(contract.createdAt.toDate(), 'yyyy-MM-dd')}</p>
                 <p>
                    Энэхүү гэрээг нэг талаас "Түмэн Тех ТМС" (цаашид "Захиалагч" гэх), нөгөө талаас 
                    жолооч <strong>{contract.driverInfo.name}</strong> (Утас: {contract.driverInfo.phone}) 
                    (цаашид "Гүйцэтгэгч" гэх) нар дараах нөхцлөөр харилцан тохиролцож байгуулав.
                </p>
                <h3>1. Гэрээний зүйл</h3>
                <p>
                    Захиалагч нь дор дурдсан ачааг, заасан чиглэлийн дагуу тээвэрлүүлэх ажлыг Гүйцэтгэгчид даалгаж,
                    Гүйцэтгэгч нь уг ажлыг хэлэлцэн тохирсон үнээр, хугацаанд нь чанартай гүйцэтгэх үүргийг хүлээнэ.
                </p>
                <ul>
                    <li><strong>Чиглэл:</strong> {shipment.route.startWarehouse} &rarr; {shipment.route.endWarehouse}</li>
                    <li><strong>Хүргэх хугацаа:</strong> {format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')}</li>
                </ul>
                <h3>2. Гэрээний үнэ, төлбөрийн нөхцөл</h3>
                <p>
                    Тээвэрлэлтийн нийт хөлс нь <strong>{finalPrice.toLocaleString()}₮</strong> байна. 
                    Төлбөрийг тээвэрлэлт дууссаны дараа ажлын 3 хоногт багтаан Гүйцэтгэгчийн данс руу шилжүүлнэ.
                </p>
                <h3>3. Талуудын үүрэг</h3>
                <p>...</p>
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
