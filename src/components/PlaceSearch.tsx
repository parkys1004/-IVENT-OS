import React, { useEffect, useRef } from 'react';

const GMPLPlaceAutocomplete = 'gmpl-place-autocomplete' as any;

interface PlaceSearchProps {
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
}

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelect, placeholder }) => {
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    const placeAutocomplete = autocompleteRef.current;

    const handlePlaceSelect = (event: any) => {
      // The event.target.value contains the place details in the new Google Places library
      const place = event.target.value; 
      console.log("선택된 장소:", place);
      if (onPlaceSelect) {
        onPlaceSelect(place);
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
        />
      </GMPLPlaceAutocomplete>
    </div>
  );
};

export default PlaceSearch;
