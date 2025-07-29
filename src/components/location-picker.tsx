
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GoogleMap,
  useLoadScript,
  Marker,
} from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { Input } from '@/components/ui/input';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: 'var(--radius)',
};

const defaultCenter = {
  lat: 47.91976,
  lng: 106.91763,
};

type LocationPickerProps = {
    onLocationSelect: (address: string, latLng: { lat: number; lng: number }) => void;
    initialValue?: string;
    initialCoordinates?: { lat: number; lng: number };
}

const libraries: ('places')[] = ['places'];

function LocationPickerInner({ onLocationSelect, initialValue, initialCoordinates }: LocationPickerProps) {
    const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(initialCoordinates || null);
    const [center, setCenter] = useState(initialCoordinates || defaultCenter);
  
    const {
      ready,
      value,
      suggestions: { status, data },
      setValue,
      clearSuggestions,
    } = usePlacesAutocomplete({
      requestOptions: {
        // location: new google.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
        // radius: 100 * 1000, // 100km
      },
      debounce: 300,
    });
    
    useEffect(() => {
        if(initialValue) {
            setValue(initialValue, false);
        }
    }, [initialValue, setValue]);
  
    const handleMapClick = useCallback(
      async (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          setMarker({ lat, lng });
  
          try {
              const results = await getGeocode({ location: { lat, lng } });
              const address = results[0].formatted_address;
              setValue(address, false);
              onLocationSelect(address, { lat, lng });
          } catch(error) {
              console.error("Error reverse geocoding: ", error);
          }
        }
      },
      [onLocationSelect, setValue]
    );
  
    const handleSelect = useCallback(
      async (address: string) => {
        setValue(address, false);
        clearSuggestions();
  
        try {
          const results = await getGeocode({ address });
          const { lat, lng } = await getLatLng(results[0]);
          setMarker({ lat, lng });
          setCenter({ lat, lng });
          onLocationSelect(address, { lat, lng });
        } catch (error) {
          console.error('Error: ', error);
        }
      },
      [onLocationSelect, setValue, clearSuggestions]
    );

    return (
        <div className="space-y-4">
           <Popover open={status === 'OK' && ready} onOpenChange={(open) => !open && clearSuggestions()}>
             <PopoverTrigger asChild>
                <div className="relative">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={!ready}
                        placeholder="Хаягаар хайх..."
                        autoComplete="off"
                    />
                </div>
             </PopoverTrigger>
             <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                <ul className="bg-background rounded-md shadow-lg">
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={() => handleSelect(description)}
                            className="p-2 hover:bg-accent cursor-pointer text-sm"
                        >
                           {description}
                        </li>
                    ))}
                </ul>
             </PopoverContent>
           </Popover>
    
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={marker ? 15 : 10}
            center={center}
            onClick={handleMapClick}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
            }}
          >
            {marker && <Marker position={marker} />}
          </GoogleMap>
        </div>
      );
}

export default function LocationPicker(props: LocationPickerProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  if (loadError) return <div>Газрын зураг дуудахад алдаа гарлаа.</div>;
  if (!isLoaded) return <Skeleton className="h-[464px] w-full" />;

  return <LocationPickerInner {...props} />;
}
