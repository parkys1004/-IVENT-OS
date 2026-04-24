import React, { useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';

interface PlaceSearchProps {
  onPlaceSelect?: (place: any) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelect, onInputChange, placeholder, defaultValue = '' }) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(defaultValue);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      console.log("Selected Place Details:", place);
      
      if (place) {
        const name = place.name || (typeof place === 'string' ? place : '');
        if (name) setInputValue(name);
        
        if (onPlaceSelect) {
          onPlaceSelect(place);
        }
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onInputChange) {
      onInputChange(val);
    }
  };

  return (
    <div className="relative">
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input 
          className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 pl-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
          placeholder={placeholder || "장소 검색"} 
          value={inputValue}
          onChange={handleTextChange}
        />
      </Autocomplete>
    </div>
  );
};

export default PlaceSearch;
