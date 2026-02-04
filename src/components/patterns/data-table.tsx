import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type DataTableProps = React.HTMLAttributes<HTMLDivElement> & {
  header: React.ReactNode
  colSpan: number
  isLoading?: boolean
  isEmpty?: boolean
  empty?: React.ReactNode
  skeletonRows?: number
}

const widthClasses = ["w-24", "w-32", "w-40", "w-20", "w-28", "w-36"]

export function DataTable({
  header,
  colSpan,
  isLoading = false,
  isEmpty = false,
  empty,
  skeletonRows = 5,
  className,
  children,
  ...props
}: DataTableProps) {
  return (
    <div className={className} {...props}>
      <Table>
        <TableHeader>{header}</TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows colSpan={colSpan} rows={skeletonRows} />
          ) : isEmpty ? (
            <TableEmptyRow colSpan={colSpan}>{empty}</TableEmptyRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export type TableEmptyRowProps = {
  colSpan: number
  children?: React.ReactNode
  cellClassName?: string
}

export function TableEmptyRow({
  colSpan,
  children,
  cellClassName,
}: TableEmptyRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={cn("h-64 p-0", cellClassName)}>
        {children}
      </TableCell>
    </TableRow>
  )
}

export type TableSkeletonRowsProps = {
  colSpan: number
  rows?: number
}

export function TableSkeletonRows({ colSpan, rows = 5 }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: colSpan }).map((__, cellIdx) => (
            <TableCell key={cellIdx}>
              <Skeleton
                className={cn(
                  "h-5",
                  widthClasses[(rowIdx + cellIdx) % widthClasses.length]
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

