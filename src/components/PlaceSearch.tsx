import React, { useEffect, useRef, useState } from 'react';

const GMPLPlaceAutocomplete = 'gmpl-place-autocomplete' as any;

interface PlaceSearchProps {
  onPlaceSelect?: (place: any) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelect, onInputChange, placeholder, defaultValue = '' }) => {
  const autocompleteRef = useRef<any>(null);
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    const placeAutocomplete = autocompleteRef.current;

    const handlePlaceSelect = (event: any) => {
      // For @googlemaps/extended-component-library, the selected place is in event.target.selectedPlace
      const place = event.target.selectedPlace || event.detail?.place || event.target.value; 
      console.log("Selected Place Details:", place);
      
      if (place) {
        const name = place.displayName || place.name || (typeof place === 'string' ? place : '');
        if (name) setInputValue(name);
        
        if (onPlaceSelect) {
          onPlaceSelect(place);
        }
      }
    };

    if (placeAutocomplete) {
      placeAutocomplete.addEventListener('gmp-placeselect', handlePlaceSelect);
    }

    return () => {
      if (placeAutocomplete) {
        placeAutocomplete.removeEventListener('gmp-placeselect', handlePlaceSelect);
      }
    };
  }, [onPlaceSelect]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onInputChange) {
      onInputChange(val);
    }
  };

  return (
    <div className="relative">
      <GMPLPlaceAutocomplete 
        ref={autocompleteRef}
        style={{ width: '100%' }}
      >
        <input 
          slot="input" 
          className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 pl-10 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
          placeholder={placeholder || "장소 검색"} 
          value={inputValue}
          onChange={handleTextChange}
        />
      </GMPLPlaceAutocomplete>
    </div>
  );
};

export default PlaceSearch;
