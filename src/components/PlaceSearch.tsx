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
  const [inputValue, setInputValue] = useState(defaultValue || '');

  useEffect(() => {
    if (defaultValue) {
      setInputValue(defaultValue);
    }
  }, [defaultValue]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const sessionToken = useRef<any>(null);

  useEffect(() => {
    if (isLoaded && !sessionToken.current) {
      const initPlaces = async () => {
        try {
          const { AutocompleteSessionToken } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
          sessionToken.current = new AutocompleteSessionToken();
        } catch (e) {
          console.error("Failed to load AutocompleteSessionToken", e);
        }
      };
      initPlaces();
    }
  }, [isLoaded]);

  useEffect(() => {
    const saved = localStorage.getItem('place_search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const addToHistory = (place: string) => {
    const newHistory = [place, ...history.filter(h => h !== place)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('place_search_history', JSON.stringify(newHistory));
  };

  const handleTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onInputChange) onInputChange(val);

    if (val.length > 0 && isLoaded) {
      try {
        const { AutocompleteSuggestion } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        const request = {
          input: val,
          sessionToken: sessionToken.current,
        };
        const { suggestions: newSuggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(newSuggestions || []);
      } catch (e) {
        console.error("Autocomplete fetch failed", e);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = async (suggestion: any) => {
    const placeSuggestion = suggestion.placePrediction;
    const description = placeSuggestion.text.text;
    
    setInputValue(description);
    addToHistory(description);
    setSuggestions([]);
    setIsFocused(false);

    if (onPlaceSelect || onInputChange) {
      if (isLoaded) {
        try {
          const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
          const place = new Place({
            id: placeSuggestion.placeId,
            requestedLanguage: 'ko',
          });

          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'addressComponents', 'location']
          });

          const result = {
            name: place.displayName,
            formatted_address: place.formattedAddress,
            address_components: place.addressComponents?.map((c: any) => ({
              long_name: c.longText,
              short_name: c.shortText,
              types: c.types
            })),
            geometry: {
              location: place.location
            }
          };

          if (onPlaceSelect) onPlaceSelect(result);
          if (onInputChange) onInputChange(place.displayName || description);
        } catch (error) {
          console.error("Place fetchFields failed", error);
          if (onPlaceSelect) onPlaceSelect({ name: description, formatted_address: description });
        }
      } else {
        if (onPlaceSelect) onPlaceSelect({ name: description, formatted_address: description });
      }
    }
  };

  const handleHistorySelect = (description: string) => {
    setInputValue(description);
    setSuggestions([]);
    setIsFocused(false);
    if (onPlaceSelect) onPlaceSelect({ name: description, formatted_address: description });
    if (onInputChange) onInputChange(description);
  };

  return (
    <div className="relative">
      <input 
        ref={inputRef}
        type="text"
        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 pl-4 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
        placeholder={placeholder || "장소 검색"} 
        value={inputValue}
        onChange={handleTextChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
      />
      
      {isFocused && (inputValue.length > 0 || history.length > 0) && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          {inputValue.length === 0 ? (
            history.map((item, i) => (
              <button key={i} type="button" className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 text-[14px] font-medium transition-colors flex items-center gap-3" onClick={() => handleHistorySelect(item)}>
                <span className="w-5 h-5 flex items-center justify-center text-slate-400">🕒</span>
                {item}
              </button>
            ))
          ) : (
            suggestions.map((s, i) => (
              <button key={i} type="button" className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 text-[14px] font-medium transition-colors flex items-center gap-3" onClick={() => handleSelect(s)}>
                <span className="w-5 h-5 flex items-center justify-center text-indigo-500">📍</span>
                {s.placePrediction?.text?.text || "장소 정보 없음"}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;
