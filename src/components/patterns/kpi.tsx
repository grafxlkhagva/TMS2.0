import * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type KpiGridProps = React.HTMLAttributes<HTMLDivElement>

export function KpiGrid({ className, ...props }: KpiGridProps) {
  return (
    <div
      className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}
      {...props}
    />
  )
}

export type KpiCardProps = {
  title: React.ReactNode
  value: React.ReactNode
  description?: React.ReactNode
  icon?: React.ElementType
  isLoading?: boolean
  className?: string
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading = false,
  className,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2" />
          {description ? <Skeleton className="mt-1 h-4 w-3/4" /> : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

