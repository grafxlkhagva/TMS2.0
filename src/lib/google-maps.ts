import type { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAPS_SCRIPT_ID = 'tms-google-maps-script';
export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places', 'geometry', 'marker'];
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
