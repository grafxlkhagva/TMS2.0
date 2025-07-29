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

export type UserRole = 'admin' | 'transport_manager' | 'finance_manager' | 'customer_officer' | 'manager';
export type UserStatus = 'pending' | 'active' | 'inactive';

export type SystemUser = {
  uid: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  avatarUrl?: string;
};
