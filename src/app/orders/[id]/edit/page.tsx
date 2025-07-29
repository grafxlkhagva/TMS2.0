
'use client';

// Placeholder for Edit Order Page
// This page can be used to edit the main order details like status, etc.
// The order items are managed on the detail page itself.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function EditOrderPage() {
    const { id } = useParams<{ id: string }>();
    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Захиалга засах</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Энэ хуудас нь захиалгын үндсэн мэдээллийг (жишээ нь статус) засахад зориулагдсан.</p>
                    <p>Тээврийн зүйлсийг <Link href={`/orders/${id}`} className="text-primary hover:underline">дэлгэрэнгүй хуудаснаас</Link> удирдна уу.</p>
                </CardContent>
            </Card>
        </div>
    )
}
