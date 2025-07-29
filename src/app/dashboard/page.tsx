import Link from 'next/link';
import { PlusCircle, FileDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { shipments, getStatusColor } from '@/lib/data';
import type { ShipmentStatus } from '@/types';

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const colorClass = getStatusColor(status).replace('bg-', 'text-').replace('-500', '-foreground');
  const variant = status === 'Delivered' ? 'default' : status === 'Pending' ? 'secondary' : status === 'Delayed' ? 'destructive' : 'outline';
  
  return <Badge variant={variant}>{status}</Badge>;
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your active shipments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/shipments/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Shipment
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/reports">
              <FileDown className="mr-2 h-4 w-4" />
              Generate Report
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Shipments</CardTitle>
          <CardDescription>A list of all shipments currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">{shipment.id}</TableCell>
                  <TableCell>{shipment.destination}</TableCell>
                  <TableCell>{shipment.recipient}</TableCell>
                  <TableCell>
                    <StatusBadge status={shipment.status} />
                  </TableCell>
                  <TableCell>{shipment.deliveryDate.toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
