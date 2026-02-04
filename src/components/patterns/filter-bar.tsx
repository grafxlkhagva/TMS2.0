import * as React from "react"

import { cn } from "@/lib/utils"

export type FilterBarProps = React.HTMLAttributes<HTMLDivElement> & {
  right?: React.ReactNode
}

/**
 * A lightweight, responsive wrapper for list filters (search, selects, date range, etc.).
 * Keeps consistent spacing and alignment across pages.
 */
export function FilterBar({ right, className, children, ...props }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
        {children}
      </div>
      {right ? (
        <div className="flex items-center gap-2 md:justify-end">{right}</div>
      ) : null}
    </div>
  )
}

