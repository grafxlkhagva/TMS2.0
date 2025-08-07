

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
  id:string;
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

export type Customer = {
  id: string;
  name: string;
  registerNumber: string;
  industry: string;
  address: string;
  officePhone: string;
  email: string;
  note?: string;
  createdAt: Date;
  logoUrl?: string;
  createdBy: {
    uid: string;
    name: string;
  };
};

export type CustomerEmployee = {
  id: string;
  customerId: string;
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  position: string;
  note?: string;
  createdAt: Date;
};

export type Industry = {
  id: string;
  name: string;
  createdAt: Date;
};

export type Warehouse = {
    id: string;
    name: string;
    location: string;
    regionId: string;
    geolocation: {
        lat: number;
        lng: number;
    };
    conditions: string;
    contactInfo: string;
    contactName?: string;
    contactPosition?: string;
    note?: string;
    customerId?: string;
    customerName?: string;
    createdAt: Date;
    updatedAt?: Date;
};

export type Region = {
  id: string;
  name: string;
  createdAt: Date;
};

export type ServiceType = {
  id: string;
  name: string;
  createdAt: Date;
};

export type VehicleType = {
  id: string;
  name: string;
  createdAt: Date;
};

export type TrailerType = {
  id: string;
  name: string;
  createdAt: Date;
};

export type PackagingType = {
  id: string;
  name: string;
  createdAt: Date;
};

export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
export type OrderItemStatus = 'Pending' | 'Assigned' | 'In Transit' | 'Delivered' | 'Cancelled';

export type LoadingUnloadingResponsibility = 'Захиалагч хариуцах' | 'Тээвэрлэгч хариуцах';
export type VehicleAvailability = '8 цаг' | '12 цаг' | '24 цаг' | '48 цаг' | '7 хоног' | '14 хоног';
export type PaymentTerm = 'Урьдчилгаа 30%' | 'Урьдчилгаа 40%' | 'Урьдчилгаа 50%' | 'Тээвэрлэлт дуусаад' | 'Гэрээгээр тохиролцоно';

export type TransportationConditions = {
    loading: LoadingUnloadingResponsibility;
    unloading: LoadingUnloadingResponsibility;
    permits: {
      roadPermit: boolean;
      roadToll: boolean;
    };
    vehicleAvailability: VehicleAvailability;
    paymentTerm: PaymentTerm;
    insurance: string;
    additionalConditions?: string;
};

export type Order = {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    employeeId: string;
    employeeName: string;
    status: OrderStatus;
    createdAt: Date;
    createdBy: {
        uid: string;
        name: string;
    };
    conditions?: TransportationConditions;
};

export type OrderItem = {
    id: string;
    orderId: string;
    startRegionId: string;
    startWarehouseId: string;
    endRegionId: string;
    endWarehouseId: string;
    loadingStartDate: Date;
    loadingEndDate: Date;
    unloadingStartDate: Date;
    unloadingEndDate: Date;
    serviceTypeId: string;
    vehicleTypeId: string;
    trailerTypeId: string;
    totalDistance: number;
    status: OrderItemStatus;
    createdAt: Date;
    frequency: number;
    acceptedQuoteId?: string;
    finalPrice?: number;
    profitMargin?: number;
    withVAT?: boolean;
    cargoItems?: OrderItemCargo[];
};

export type OrderItemCargo = {
    id: string;
    orderItemId: string;
    name: string;
    quantity: number;
    unit: string;
    packagingTypeId: string;
    notes?: string;
};

export type DriverQuote = {
    id: string;
    orderItemId: string;
    driverName: string;
    driverPhone: string;
    price: number;
    notes?: string;
    createdAt: Date;
    status: 'Pending' | 'Accepted' | 'Rejected';
};
