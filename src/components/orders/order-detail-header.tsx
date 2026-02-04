"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Order } from "@/types";
import { ArrowLeft, Edit, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, CircleDashed, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface OrderDetailHeaderProps {
    order: Order;
    onDelete: () => void;
}

const steps = [
    { id: 'Pending', label: 'Бүртгэгдсэн', icon: CircleDashed },
    { id: 'Processing', label: 'Боловсруулж буй', icon: Truck },
    { id: 'Completed', label: 'Дууссан', icon: CheckCircle2 },
];

export function OrderDetailHeader({ order, onDelete }: OrderDetailHeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const currentStepIndex = steps.findIndex(s => s.id === order.status) === -1 ? 0 : steps.findIndex(s => s.id === order.status);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/orders">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold font-headline">{order.orderNumber}</h1>
                            <Badge variant={order.status === 'Completed' ? 'success' : order.status === 'Cancelled' ? 'destructive' : 'secondary'}>
                                {order.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">{order.customerName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/orders/${order.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Засах
                        </Link>
                    </Button>
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                                onClick={() => {
                                    setDropdownOpen(false);
                                    setTimeout(() => onDelete(), 100);
                                }} 
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Устгах
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stepper */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
                <div className="flex justify-between relative z-10">
                    {steps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                <div className={`
                                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                                    ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted-foreground/30 text-muted-foreground'}
                                `}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className={`text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Нийт зардал (Төлөвлөгөө)</div>
                        <div className="text-2xl font-bold mt-1">₮---</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Нийт ашиг</div>
                        <div className="text-2xl font-bold mt-1 text-green-600">₮---</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Ачааны хэмжээ</div>
                        <div className="text-2xl font-bold mt-1">---</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Зай</div>
                        <div className="text-2xl font-bold mt-1">--- KM</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
