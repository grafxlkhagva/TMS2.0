"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Filter, SlidersHorizontal, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface OrderFiltersProps {
    dateRange?: DateRange;
    setDateRange: (date: DateRange | undefined) => void;
    statusFilter: string[];
    setStatusFilter: (status: string[]) => void;
    className?: string;
}

const statuses = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
];

export function OrderFilters({
    dateRange,
    setDateRange,
    statusFilter,
    setStatusFilter,
    className
}: OrderFiltersProps) {
    const [openStatus, setOpenStatus] = React.useState(false);

    const activeFilterCount = (dateRange ? 1 : 0) + statusFilter.length;

    const clearFilters = () => {
        setDateRange(undefined);
        setStatusFilter([]);
    };

    const toggleStatus = (value: string) => {
        if (statusFilter.includes(value)) {
            setStatusFilter(statusFilter.filter(s => s !== value));
        } else {
            setStatusFilter([...statusFilter, value]);
        }
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-dashed">
                            <Filter className="mr-2 h-4 w-4" />
                            Огноо
                            {dateRange?.from && (
                                <>
                                    <Separator orientation="vertical" className="mx-2 h-4" />
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                        1
                                    </Badge>
                                    <div className="hidden space-x-1 lg:flex">
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                            Selected
                                        </Badge>
                                    </div>
                                </>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} className="border-0" />
                    </PopoverContent>
                </Popover>

                <Popover open={openStatus} onOpenChange={setOpenStatus}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-dashed">
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            Статус
                            {statusFilter.length > 0 && (
                                <>
                                    <Separator orientation="vertical" className="mx-2 h-4" />
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                        {statusFilter.length}
                                    </Badge>
                                    <div className="hidden space-x-1 lg:flex">
                                        {statusFilter.length > 2 ? (
                                            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                {statusFilter.length} selected
                                            </Badge>
                                        ) : (
                                            statuses
                                                .filter((option) => statusFilter.includes(option.value))
                                                .map((option) => (
                                                    <Badge
                                                        variant="secondary"
                                                        key={option.value}
                                                        className="rounded-sm px-1 font-normal"
                                                    >
                                                        {option.label}
                                                    </Badge>
                                                ))
                                        )}
                                    </div>
                                </>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Статус хайх..." />
                            <CommandList>
                                <CommandEmpty>Олдсонгүй.</CommandEmpty>
                                <CommandGroup>
                                    {statuses.map((status) => {
                                        const isSelected = statusFilter.includes(status.value);
                                        return (
                                            <CommandItem
                                                key={status.value}
                                                onSelect={() => toggleStatus(status.value)}
                                            >
                                                <div
                                                    className={cn(
                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "opacity-50 [&_svg]:invisible"
                                                    )}
                                                >
                                                    <Check className={cn("h-4 w-4")} />
                                                </div>
                                                <span>{status.label}</span>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                                {statusFilter.length > 0 && (
                                    <>
                                        <div className="-mx-1 my-1 h-px bg-muted" />
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => setStatusFilter([])}
                                                className="justify-center text-center"
                                            >
                                                Цэвэрлэх
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        onClick={clearFilters}
                        className="h-8 px-2 lg:px-3"
                    >
                        Цэвэрлэх
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
