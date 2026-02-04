import * as React from "react"

import { cn } from "@/lib/utils"

export type PageContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: "tight" | "default" | "comfortable"
}

const sizeClasses: Record<NonNullable<PageContainerProps["size"]>, string> = {
  tight: "py-4 space-y-4",
  default: "py-6 space-y-6",
  comfortable: "py-8 space-y-8",
}

export function PageContainer({
  size = "default",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn("container mx-auto", sizeClasses[size], className)}
      {...props}
    />
  )
}

