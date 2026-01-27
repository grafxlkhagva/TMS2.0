
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
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { MapPin, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
    const [manualLat, setManualLat] = useState(initialCoordinates?.lat.toString() || '');
    const [manualLng, setManualLng] = useState(initialCoordinates?.lng.toString() || '');
    const [inputMode, setInputMode] = useState<'search' | 'manual'>('search');
  
    const {
      ready,
      value,
      suggestions: { status, data },
      setValue,
      clearSuggestions,
    } = usePlacesAutocomplete({
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
          setManualLat(lat.toFixed(6));
          setManualLng(lng.toFixed(6));
  
          try {
              const results = await getGeocode({ location: { lat, lng } });
              const address = results[0].formatted_address;
              setValue(address, false);
              onLocationSelect(address, { lat, lng });
          } catch(error) {
              console.error("Error reverse geocoding: ", error);
              // Хаяг олдохгүй бол координатаар хадгална
              const coordAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              setValue(coordAddress, false);
              onLocationSelect(coordAddress, { lat, lng });
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
          setManualLat(lat.toFixed(6));
          setManualLng(lng.toFixed(6));
          onLocationSelect(address, { lat, lng });
        } catch (error) {
          console.error('Error: ', error);
        }
      },
      [onLocationSelect, setValue, clearSuggestions]
    );

    // Гараар координат оруулах
    const handleManualCoordinates = useCallback(async () => {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      
      if (isNaN(lat) || isNaN(lng)) {
        return;
      }

      // Координатын хязгаар шалгах
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }

      setMarker({ lat, lng });
      setCenter({ lat, lng });

      try {
        const results = await getGeocode({ location: { lat, lng } });
        const address = results[0].formatted_address;
        setValue(address, false);
        onLocationSelect(address, { lat, lng });
      } catch (error) {
        // Хаяг олдохгүй бол координатаар хадгална
        const coordAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setValue(coordAddress, false);
        onLocationSelect(coordAddress, { lat, lng });
      }
    }, [manualLat, manualLng, onLocationSelect, setValue]);

    return (
        <div className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'search' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Хаягаар хайх
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <MapPin className="h-4 w-4" />
                Координат оруулах
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-3">
              <Popover open={status === 'OK'} onOpenChange={(open) => !open && clearSuggestions()}>
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
            </TabsContent>

            <TabsContent value="manual" className="mt-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="any"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="Өргөрөг (lat) жш: 47.9197"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    step="any"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="Уртраг (lng) жш: 106.9176"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleManualCoordinates}
                  disabled={!manualLat || !manualLng}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Байршуулах
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Өргөрөг: -90 ~ 90, Уртраг: -180 ~ 180. Жишээ: 47.9197, 106.9176 (Улаанбаатар)
              </p>
            </TabsContent>
          </Tabs>

          {/* Одоогийн координат харуулах */}
          {marker && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              <span className="font-medium">Сонгосон байршил:</span> {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
            </div>
          )}
    
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
          
          <p className="text-xs text-muted-foreground">
            Газрын зураг дээр дарж байршил сонгох боломжтой
          </p>
        </div>
      );
}

export default function LocationPicker(props: LocationPickerProps) {
  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
    preventLoading: !hasApiKey,
  });

  if (!hasApiKey) {
    return (
        <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground p-4 text-center rounded-md">
            Google Maps API түлхүүр тохируулагдаагүй байна.
        </div>
    );
  }

  if (loadError) return <div>Газрын зураг дуудахад алдаа гарлаа.</div>;
  if (!isLoaded) return <Skeleton className="h-[464px] w-full" />;

  return <LocationPickerInner {...props} />;
}

    
