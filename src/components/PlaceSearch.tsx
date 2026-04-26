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
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const service = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    if (isLoaded && !service.current) {
      service.current = new window.google.maps.places.AutocompleteService();
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onInputChange) onInputChange(val);

    if (val.length > 0 && service.current) {
      service.current.getPlacePredictions({ input: val }, (predictions) => {
        setSuggestions(predictions || []);
      });
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (description: string) => {
    setInputValue(description);
    addToHistory(description);
    setSuggestions([]);
    setIsFocused(false);
    if (onPlaceSelect) onPlaceSelect({ description });
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
        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {inputValue.length === 0 ? (
            history.map((item, i) => (
              <button key={i} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 text-sm" onClick={() => handleSelect(item)}>
                {item}
              </button>
            ))
          ) : (
            suggestions.map((s, i) => (
              <button key={i} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 text-sm" onClick={() => handleSelect(s.description)}>
                {s.description}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;
