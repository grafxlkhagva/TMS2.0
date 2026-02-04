"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableSelectItem = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = "Сонгох...",
  searchPlaceholder = "Хайх...",
  emptyText = "Олдсонгүй.",
  disabled,
  allowClear = true,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => items.find((i) => i.value === value),
    [items, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", !selected && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {allowClear && value ? (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onValueChange("");
                      setOpen(false);
                    }}
                    className="justify-center text-center"
                  >
                    Цэвэрлэх
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}

            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      item.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

