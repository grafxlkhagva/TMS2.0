"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Order } from "@/types";
import { MoreVertical, Trash2, FileSpreadsheet, CircleDollarSign, TrendingUp, Package, Route } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrderDetailHeaderProps {
    order: Order;
    onDelete: () => void;
}

export function OrderDetailHeader({ order, onDelete }: OrderDetailHeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end gap-2">
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

            <div className="rounded-xl bg-stone-800 p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-400/20 p-2">
                            <CircleDollarSign className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Нийт зардал</p>
                            <p className="text-xl font-bold text-white">₮---</p>
                        </div>
                    </div>

                    <Separator orientation="vertical" className="h-10 bg-stone-600" />

                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-400/20 p-2">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Нийт ашиг</p>
                            <p className="text-xl font-bold text-emerald-400">₮---</p>
                        </div>
                    </div>

                    <Separator orientation="vertical" className="h-10 bg-stone-600" />

                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-sky-400/20 p-2">
                            <Package className="h-5 w-5 text-sky-400" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Ачааны хэмжээ</p>
                            <p className="text-xl font-bold text-white">---</p>
                        </div>
                    </div>

                    <Separator orientation="vertical" className="h-10 bg-stone-600" />

                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-orange-400/20 p-2">
                            <Route className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Зай</p>
                            <p className="text-xl font-bold text-white">--- KM</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
