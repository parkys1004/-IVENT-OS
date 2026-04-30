import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsContext';

interface AdvancedGoogleMapProps {
  center: google.maps.LatLngLiteral;
  zoom?: number;
  title?: string;
  className?: string;
}

export default function AdvancedGoogleMap({ 
  center, 
  zoom = 16, 
  title = 'Marker',
  className = "w-full h-full"
}: AdvancedGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { isLoaded } = useGoogleMaps();
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<any>(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = async () => {
      try {
        // Import libraries
        const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        // Initialize map
        if (!googleMapInstance.current) {
          googleMapInstance.current = new Map(mapRef.current!, {
            center,
            zoom,
            mapId: "8d6e82d5e91219d383b5200c", // Provided by user
            disableDefaultUI: true,
            zoomControl: true,
          });
        } else {
          googleMapInstance.current.setCenter(center);
          googleMapInstance.current.setZoom(zoom);
        }

        // Initialize marker
        if (markerInstance.current) {
          markerInstance.current.map = null;
        }

        markerInstance.current = new AdvancedMarkerElement({
          map: googleMapInstance.current,
          position: center,
          title: title,
        });
      } catch (error) {
        console.error("Error initializing advanced map:", error);
      }
    };

    initMap();

    return () => {
      if (markerInstance.current) {
        markerInstance.current.map = null;
      }
    };
  }, [isLoaded, center, zoom, title]);

  return <div ref={mapRef} className={className} id="map" />;
}
