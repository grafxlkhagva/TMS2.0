
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useParams } from 'next/navigation';

export default function EditContractedTransportPage() {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href={`/contracted-transport/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Гэрээт тээвэр засах</h1>
        <p className="text-muted-foreground">
          Гэрээний дугаар: {id}
        </p>
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Мэдээлэл засах</CardTitle>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground">Засварлах формыг удахгүй нэмнэ.</p>
        </CardContent>
      </Card>
    </div>
  );
}
