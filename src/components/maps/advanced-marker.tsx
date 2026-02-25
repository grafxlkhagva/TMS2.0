'use client';

import * as React from 'react';
import { useGoogleMap } from '@react-google-maps/api';

type LatLngLiteral = google.maps.LatLngLiteral;

type AdvancedMarkerProps = {
  position: LatLngLiteral;
  title?: string;
  onClick?: () => void;
  color?: string;
  borderColor?: string;
  glyph?: string;
  scale?: number;
};

export function AdvancedMarker({
  position,
  title,
  onClick,
  color = '#2563eb',
  borderColor = '#1e40af',
  glyph,
  scale = 1,
}: AdvancedMarkerProps) {
  const map = useGoogleMap();

  React.useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const markerLib = (google.maps as any).marker;
    if (!markerLib?.AdvancedMarkerElement || !markerLib?.PinElement) return;

    const pin = new markerLib.PinElement({
      background: color,
      borderColor,
      glyphColor: '#ffffff',
      glyph: glyph || undefined,
      scale,
    });

    const marker = new markerLib.AdvancedMarkerElement({
      map,
      position,
      title,
      content: pin.element,
    });

    let listener: google.maps.MapsEventListener | null = null;
    if (onClick) {
      listener = marker.addListener('click', onClick);
    }

    return () => {
      if (listener) google.maps.event.removeListener(listener);
      marker.map = null;
    };
  }, [map, position, title, onClick, color, borderColor, glyph, scale]);

  return null;
}
