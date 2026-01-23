import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type VehicleStatus = 'Available' | 'Maintenance' | 'Ready' | 'In Use';

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
    vehicleTypeName?: string;
    trailerTypeId: string;
    trailerTypeName?: string;
    capacity: string;
    fuelType: 'Diesel' | 'Gasoline' | 'Electric' | 'Hybrid';
    status: VehicleStatus;
    notes?: string;
    createdAt: Date;
    imageUrls?: string[];
    driverId?: string;
    driverName?: string;
    assignedDriver?: {
        driverId: string;
        driverName: string;
    };
    odometer?: number;
    lastOdometerUpdate?: Date;
    specs?: {
        tankCapacity?: number;
        fuelType?: string;
        transmission?: string;
        axleConfig?: string;
        engineType?: string;
    };
    dates?: {
        purchase?: Date;
        warrantyExpiry?: Date;
        registrationExpiry?: Date;
        insuranceExpiry?: Date;
        roadPermitExpiry?: Date;
        inspectionExpiry?: Date;
    };
};

// User & Auth Types
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

// Driver Types
export type DriverStatus = 'Active' | 'Inactive' | 'On Leave';

export type Driver = {
    id: string;
    display_name: string;
    phone_number: string;
    status: DriverStatus;
    created_time: Date | string | Timestamp;
    photo_url?: string;
    authUid?: string;
    assignedVehicleId?: string;
    isAvailableForContracted?: boolean;
    registerNumber?: string;
    birthDate?: Date | Timestamp;
    licenseNumber?: string;
    licenseClasses?: string[];
    licenseExpiryDate?: Date | Timestamp;
    licenseImageUrl?: string;
    emergencyContact?: {
        name: string;
        phone: string;
    };
};

// Shipment Types
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

// Contracted Transport Types
export type ContractedTransportExecutionStatus = string;

export type AssignedVehicle = {
    vehicleId: string;
    licensePlate: string;
    trailerLicensePlate: string | null;
    status: 'Ready' | 'In-Trip';
    assignedDriver?: {
        driverId: string;
        driverName: string;
        driverAvatar?: string;
    }
};

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
    selectedCargoId?: string;
    totalLoadedWeight?: number;
    totalUnloadedWeight?: number;
    cargoColor?: string;
    imageUrls?: string[];
};

// Trip type for driver app (simplified view)
export type Trip = Shipment | ContractedTransportExecution;
