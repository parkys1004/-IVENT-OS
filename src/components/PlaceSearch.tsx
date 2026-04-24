import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../context/GoogleMapsContext';

interface PlaceSearchProps {
  onPlaceSelect?: (place: any) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
}

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelect, onInputChange, placeholder, value, defaultValue = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    if (value !== undefined && inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["address_components", "geometry", "formatted_address", "name"],
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && onPlaceSelect) {
        onPlaceSelect(place);
      }
      if (place?.name && onInputChange) {
        onInputChange(place.name);
      }
    });

    return () => {
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [isLoaded, onPlaceSelect]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onInputChange) {
      onInputChange(e.target.value);
    }
  };

  return (
    <div className="relative">
      <input 
        ref={inputRef}
        type="text"
        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 pl-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
        placeholder={placeholder || "장소 검색"} 
        defaultValue={value !== undefined ? undefined : defaultValue}
        onChange={handleTextChange}
      />
    </div>
  );
};

export default PlaceSearch;
