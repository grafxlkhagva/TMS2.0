import type { Shipment, Vehicle, Driver, ShipmentStatus, VehicleStatus } from '@/types';

export const drivers: Driver[] = [
  { id: 'd001', name: 'John Doe', avatarUrl: 'https://placehold.co/100x100' },
  { id: 'd002', name: 'Jane Smith', avatarUrl: 'https://placehold.co/100x100' },
  { id: 'd003', name: 'Mike Johnson', avatarUrl: 'https://placehold.co/100x100' },
  { id: 'd004', name: 'Emily Brown', avatarUrl: 'https://placehold.co/100x100' },
];

export const vehicles: Vehicle[] = [
  { id: 'v001', model: 'Ford Transit', licensePlate: 'AB123CD', status: 'Available', driverId: null },
  { id: 'v002', model: 'Mercedes Sprinter', licensePlate: 'EF456GH', status: 'In Use', driverId: 'd001' },
  { id: 'v003', model: 'RAM ProMaster', licensePlate: 'IJ789KL', status: 'Available', driverId: null },
  { id: 'v004', model: 'Nissan NV200', licensePlate: 'MN012OP', status: 'Maintenance', driverId: null },
  { id: 'v005', model: 'Ford Transit', licensePlate: 'QR345ST', status: 'In Use', driverId: 'd003' },
];

export const shipments: Shipment[] = [
  { id: 'S001', destination: '123 Main St, Anytown, USA', recipient: 'Alice Johnson', status: 'In Transit', deliveryDate: new Date('2024-08-15') },
  { id: 'S002', destination: '456 Oak Ave, Somewhere, USA', recipient: 'Bob Williams', status: 'Delivered', deliveryDate: new Date('2024-08-12') },
  { id: 'S003', destination: '789 Pine Ln, Elsewhere, USA', recipient: 'Charlie Brown', status: 'Pending', deliveryDate: new Date('2024-08-20') },
  { id: 'S004', destination: '101 Maple Dr, Anycity, USA', recipient: 'Diana Miller', status: 'Delayed', deliveryDate: new Date('2024-08-14') },
  { id: 'S005', destination: '212 Birch Rd, Someplace, USA', recipient: 'Evan Davis', status: 'In Transit', deliveryDate: new Date('2024-08-18') },
  { id: 'S006', destination: '333 Cedar Ct, Newville, USA', recipient: 'Fiona Garcia', status: 'Pending', deliveryDate: new Date('2024-08-22') },
];

export const getStatusColor = (status: ShipmentStatus | VehicleStatus) => {
  switch (status) {
    case 'In Transit':
    case 'In Use':
      return 'bg-blue-500';
    case 'Delivered':
    case 'Available':
      return 'bg-green-500';
    case 'Pending':
      return 'bg-yellow-500';
    case 'Delayed':
    case 'Maintenance':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};
