
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewContractedTransportPage() {
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/contracted-transport">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Шинэ гэрээт тээвэр</h1>
        <p className="text-muted-foreground">
          Урт хугацааны гэрээний мэдээллийг оруулна уу.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Гэрээний мэдээлэл</CardTitle>
            <CardDescription>Энэ хэсэгт гэрээний ерөнхий мэдээллийг оруулна.</CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground">Формыг удахгүй нэмнэ.</p>
        </CardContent>
      </Card>
    </div>
  );
}
