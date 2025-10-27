'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function DirectShipmentsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Шууд тээвэрлэлт</h1>
        <p className="text-muted-foreground">
          Энэ хэсэгт хөгжүүлэлт хийгдэж байна.
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Truck className="h-8 w-8" />
          </div>
          <CardTitle>Тун удахгүй</CardTitle>
          <CardDescription>
            Шууд тээвэрлэлт үүсгэх, удирдах боломж энд нэмэгдэнэ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for future content */}
        </CardContent>
      </Card>
    </div>
  );
}
