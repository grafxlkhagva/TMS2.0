import * as React from "react"

import { cn } from "@/lib/utils"

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ElementType
  action?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-10",
        className
      )}
      {...props}
    >
      {Icon ? (
        <div className="mb-4 rounded-full bg-muted/30 p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

