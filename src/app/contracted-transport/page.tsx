
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


export default function ContractedTransportPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Гэрээт тээвэр</h1>
          <p className="text-muted-foreground">
            Урт хугацааны, давтагдах тээвэрлэлтийн гэрээнүүд.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/contracted-transport/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ гэрээт тээвэр
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Гэрээт тээврийн жагсаалт</CardTitle>
          <CardDescription>Нийт 0 гэрээ байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гэрээний №</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Харилцагч</TableHead>
                <TableHead>Чиглэл</TableHead>
                <TableHead>Давтамж</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        Бүртгэлтэй гэрээт тээвэр олдсонгүй.
                    </TableCell>
                 </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
