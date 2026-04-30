import React, { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

const LIBRARIES: ("places" | "marker")[] = ["places", "marker"];

export const GoogleMapsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isPlaceholder = apiKey === 'MY_GOOGLE_MAPS_API_KEY' || apiKey === '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: isPlaceholder ? '' : apiKey,
    libraries: LIBRARIES,
    language: 'ko',
    region: 'KR'
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded: isPlaceholder ? false : isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (context === undefined) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
};
