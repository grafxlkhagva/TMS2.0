import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type LoadingStateProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "page" | "card" | "chart"
}

export function LoadingState({
  variant = "page",
  className,
  ...props
}: LoadingStateProps) {
  if (variant === "card") {
    return (
      <div className={cn("space-y-3", className)} {...props}>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (variant === "chart") {
    return <Skeleton className={cn("h-[350px] w-full", className)} {...props} />
  }

  // page
  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

