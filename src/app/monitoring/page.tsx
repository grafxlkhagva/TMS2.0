import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Flag } from 'lucide-react';
import { drivers, vehicles } from '@/lib/data';

export default function MonitoringPage() {
  const monitoredVehicle = vehicles.find(v => v.status === 'In Use');
  const monitoredDriver = drivers.find(d => d.id === monitoredVehicle?.driverId);

  return (
    <div className="container mx-auto py-6 h-full flex flex-col">
       <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Real-Time Monitoring</h1>
        <p className="text-muted-foreground">
          Track active shipments and driver locations.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg overflow-hidden shadow-lg border">
            <Image
                src="https://placehold.co/1200x800"
                alt="Map showing driver route"
                width={1200}
                height={800}
                className="w-full h-full object-cover"
                data-ai-hint="map route"
            />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Driver & Route Details</CardTitle>
          </CardHeader>
          <CardContent>
            {monitoredDriver && monitoredVehicle ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border">
                    <AvatarImage src={monitoredDriver.avatarUrl} data-ai-hint="person portrait" />
                    <AvatarFallback>{monitoredDriver.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{monitoredDriver.name}</p>
                    <p className="text-sm text-muted-foreground">{monitoredVehicle.model} ({monitoredVehicle.licensePlate})</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Current Location</p>
                      <p className="text-muted-foreground">456 Oak Ave, Somewhere, USA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Flag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Final Destination</p>
                      <p className="text-muted-foreground">123 Main St, Anytown, USA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Estimated Time of Arrival</p>
                      <p className="text-muted-foreground">2:45 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <p>No active drivers being monitored.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
