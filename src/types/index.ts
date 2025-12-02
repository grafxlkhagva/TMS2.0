

import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type ShipmentStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Delayed';

export type VehicleStatus = 'Available' | 'In Use' | 'Maintenance';

export type Vehicle = {
  id: string;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  year: number;
  importedYear: number;
  licensePlate: string;
  licensePlateDigits: string;
  licensePlateChars: string;
  trailerLicensePlate?: string;
  trailerLicensePlateDigits?: string;
  trailerLicensePlateChars?: string;
  vin: string;
  vehicleTypeId: string;
  trailerTypeId: string;
  capacity: string;
  fuelType: 'Diesel' | 'Gasoline' | 'Electric' | 'Hybrid';
  status: VehicleStatus;
  notes?: string;
  driverId: string | null;
  driverName?: string;
  createdAt: Date;
  imageUrls?: string[];
};

export type DriverStatus = 'Active' | 'Inactive' | 'On Leave';

export type Driver = {
  id: string;
  display_name: string;
  phone_number: string;
  status: DriverStatus;
  created_time: Date | string | Timestamp;
  photo_url?: string;
  authUid?: string; // To link with Firebase Auth user
};

export type UserRole = 'admin' | 'management' | 'transport_manager' | 'finance_manager' | 'customer_officer' | 'manager' | 'driver';
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
  assignedTo?: {
    uid: string;
    name: string;
  };
  assignedToRef?: DocumentReference;
};

export type CustomerEmployee = {
  id: string;
  customerId: string;
  customerRef?: DocumentReference;
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
    regionRef?: DocumentReference;
    geolocation: {
        lat: number;
        lng: number;
    };
    conditions: string;
    contactInfo: string;
    contactName?: string;
    contactPosition?: string;
    customerId?: string;
    customerName?: string;
    customerRef?: DocumentReference;
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

export type VehicleMake = {
  id: string;
  name: string;
  createdAt: Date;
};

export type VehicleModel = {
  id: string;
  name: string;
  makeId: string;
  createdAt: Date;
};

export type PackagingType = {
  id: string;
  name: string;
  createdAt: Date;
};

export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
export type OrderItemStatus = 'Pending' | 'Assigned' | 'Shipped' | 'In Transit' | 'Delivered' | 'Cancelled';

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
    customerRef?: DocumentReference;
    employeeId: string;
    employeeName: string;
    employeeRef?: DocumentReference;
    transportManagerId?: string;
    transportManagerName?: string;
    transportManagerRef?: DocumentReference;
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
    orderRef?: DocumentReference;
    startRegionId: string;
    startRegionRef?: DocumentReference;
    startWarehouseId: string;
    startWarehouseRef?: DocumentReference;
    endRegionId: string;
    endRegionRef?: DocumentReference;
    endWarehouseId: string;
    endWarehouseRef?: DocumentReference;
    loadingStartDate: Date;
    loadingEndDate: Date;
    unloadingStartDate: Date;
    unloadingEndDate: Date;
    serviceTypeId: string;
    serviceTypeRef?: DocumentReference;
    vehicleTypeId: string;
    vehicleTypeRef?: DocumentReference;
    trailerTypeId: string;
    trailerTypeRef?: DocumentReference;
    totalDistance: number;
    status: OrderItemStatus;
    createdAt: Date;
    frequency: number;
    acceptedQuoteId?: string;
    finalPrice?: number;
    profitMargin?: number;
    withVAT?: boolean;
    tenderStatus?: 'Open' | 'Closed';
    cargoItems?: OrderItemCargo[];
};

export type OrderItemCargo = {
    id: string;
    orderItemId: string;
    orderItemRef?: DocumentReference;
    name: string;
    quantity: number;
    unit: string;
    packagingTypeId: string;
    packagingTypeRef?: DocumentReference;
    notes?: string;
};

export type DriverQuote = {
    id: string;
    orderItemId: string;
    orderItemRef?: DocumentReference;
    driverName: string;
    driverPhone: string;
    price: number;
    notes?: string;
    createdAt: Date;
    status: 'Pending' | 'Accepted' | 'Rejected';
    channel: 'Phone' | 'App';
};

export type ShipmentStatusType = 'Preparing' | 'Ready For Loading' | 'Loading' | 'In Transit' | 'Unloading' | 'Delivered' | 'Delayed' | 'Cancelled';

export type Shipment = {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderRef?: DocumentReference;
  orderNumber: string;
  orderItemId: string;
  orderItemRef?: DocumentReference;
  customerId: string;
  customerRef?: DocumentReference;
  customerName: string;
  driverInfo: {
    name: string;
    phone: string;
    quoteId: string;
  };
  driverId?: string;
  driverRef?: DocumentReference;
  route: {
    startRegion: string;
    endRegion: string;
    startWarehouse: string;
    endWarehouse: string;
  };
  routeRefs?: {
    startWarehouseRef: DocumentReference;
    endWarehouseRef: DocumentReference;
  };
  vehicleInfo: {
    vehicleType: string;
    trailerType: string;
  };
  status: ShipmentStatusType;
  createdAt: Date;
  estimatedDeliveryDate: Date;
  checklist: {
    contractSigned: boolean;
    safetyBriefingCompleted: boolean;
    sentDriverInfoToCustomer: boolean;
    sentLoadingInfoToCustomer: boolean;
    receivedEbarimtAccount: boolean;
    providedAccountToFinance: boolean;
    loadingChecklistCompleted: boolean;
    loadingPhotoTaken: boolean;
    cargoDocumentsReceived: boolean;
    informedCustomerOnLoad: boolean;
    unloadingChecklistCompleted: boolean;
    deliveryDocumentsSigned: boolean;
    unloadingPhotoTaken: boolean;
    informedCustomerOnUnload: boolean;
    unloadingDocumentsAttached: boolean;
  };
};

export type ContractStatus = 'pending' | 'signed' | 'declined' | 'expired';

export type Contract = {
    id: string;
    shipmentId: string;
    shipmentRef: DocumentReference;
    shipmentNumber: string;
    orderId: string;
    orderRef: DocumentReference;
    // Snapshot of key information at time of creation
    driverInfo: {
        name: string;
        phone: string;
    };
    routeInfo: {
        start: string;
        end: string;
    };
    vehicleInfo: {
        type: string;
    };
    price: number;
    priceWithVAT: boolean;
    estimatedDeliveryDate: Date;
    // Contract status and audit trail
    status: ContractStatus;
    createdAt: Date;
    content?: string; // Optional: For storing the exact HTML/text of the contract
    signedAt?: Date;
    signatureDataUrl?: string;
    ipAddress?: string;
    userAgent?: string;
};

export type SafetyBriefingStatus = 'pending' | 'signed';

export type SafetyBriefing = {
    id: string;
    shipmentId: string;
    shipmentRef: DocumentReference;
    driverInfo: {
        name: string;
        phone: string;
    };
    status: SafetyBriefingStatus;
    createdAt: Date;
    signedAt?: Date;
    signatureDataUrl?: string;
    userAgent?: string;
};

export type ShipmentUpdateStatus = 'On Schedule' | 'Delayed';

export type ShipmentUpdate = {
  id: string;
  shipmentId: string;
  shipmentRef: DocumentReference;
  createdAt: Date;
  createdBy: {
    uid: string;
    name: string;
  };
  location: string;
  distanceCovered: number;
  status: ShipmentUpdateStatus;
  roadConditions: string;
  notes?: string;
};

export type ContractedTransportStatus = 'Active' | 'Expired' | 'Cancelled';
export type ContractedTransportFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type ContractedTransportExecutionStatus = string;

export type RouteStop = {
  id: string;
  description: string;
}

export type ContractedTransportExecution = {
    id: string;
    contractId: string;
    date: Date;
    status: ContractedTransportExecutionStatus;
    statusHistory: { status: ContractedTransportExecutionStatus, date: Date | Timestamp }[];
    vehicleId?: string;
    vehicleLicense?: string;
    driverId?: string;
    driverName?: string;
    createdAt: Date;
    selectedCargo: string[];
    totalLoadedWeight?: number;
    totalUnloadedWeight?: number;
    cargoColor?: string;
}

export type ContractedTransportCargoItem = {
    id: string;
    name: string;
    unit: string;
    packagingTypeId: string;
    notes?: string;
    driverPrice: number;
    mainContractorPrice?: number;
    ourPrice?: number;
    color?: string;
};

export type AssignedDriver = {
    driverId: string;
    driverName: string;
    driverPhone: string;
    assignedVehicleId?: string;
}

export type ContractedTransport = {
  id: string;
  contractNumber: string;
  title: string;
  customerId: string;
  customerRef?: DocumentReference;
  customerName: string;
  startDate: Date;
  endDate: Date;
  frequency: ContractedTransportFrequency;
  customFrequencyDetails?: string; // E.g., "Every Tuesday and Thursday"
  route: {
    startRegionId: string;
    startWarehouseId: string;
    endRegionId: string;
    endWarehouseId: string;
    totalDistance: number;
  };
  routeStops: RouteStop[];
  cargoItems: ContractedTransportCargoItem[];
  status: ContractedTransportStatus;
  createdAt: Date;
  updatedAt?: Date;
  transportManagerId: string;
  transportManagerRef?: DocumentReference;
  createdBy: {
    uid: string;
    name: string;
  };
  assignedDrivers: AssignedDriver[];
  assignedVehicles: {
    vehicleId: string;
    licensePlate: string;
    trailerLicensePlate?: string;
    modelName: string;
  }[];
};

    

    


    
