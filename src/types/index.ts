export type ShipmentStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Delayed';

export type Shipment = {
  id: string;
  destination: string;
  recipient: string;
  status: ShipmentStatus;
  deliveryDate: Date;
};

export type VehicleStatus = 'Available' | 'In Use' | 'Maintenance';

export type Vehicle = {
  id: string;
  model: string;
  licensePlate: string;
  status: VehicleStatus;
  driverId: string | null;
};

export type Driver = {
  id: string;
  name: string;
  avatarUrl: string;
};
