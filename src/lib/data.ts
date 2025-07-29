import type { Vehicle, Driver } from '@/types';

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
