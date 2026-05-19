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
  const { isLoaded } = useGoogleMaps();
  const [inputValue, setInputValue] = useState(defaultValue || value || '');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (defaultValue) setInputValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (value !== undefined && value !== inputValue) setInputValue(value);
  }, [value]);

  useEffect(() => {
    const saved = localStorage.getItem('place_search_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  const addToHistory = (place: string) => {
    const next = [place, ...history.filter(h => h !== place)].slice(0, 5);
    setHistory(next);
    localStorage.setItem('place_search_history', JSON.stringify(next));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onInputChange) onInputChange(val);

    if (val.length > 1 && isLoaded) {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input: val, language: 'ko' },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const mainText = prediction.structured_formatting?.main_text || prediction.description;
    const description = prediction.description;

    setInputValue(mainText);
    addToHistory(mainText);
    setSuggestions([]);
    setIsFocused(false);

    if (onInputChange) onInputChange(mainText);

    if (onPlaceSelect) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: prediction.place_id, language: 'ko' }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const r = results[0];
          onPlaceSelect({
            name: mainText,
            formatted_address: r.formatted_address,
            address_components: r.address_components,
            geometry: r.geometry,
          });
        } else {
          onPlaceSelect({ name: mainText, formatted_address: description });
        }
      });
    }
  };

  const handleHistorySelect = (item: string) => {
    setInputValue(item);
    setSuggestions([]);
    setIsFocused(false);
    if (onPlaceSelect) onPlaceSelect({ name: item, formatted_address: item });
    if (onInputChange) onInputChange(item);
  };

  const showDropdown = isFocused && (suggestions.length > 0 || (inputValue.length === 0 && history.length > 0));

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
        placeholder={placeholder || "장소 검색"}
        value={inputValue}
        onChange={handleTextChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
      />

      {showDropdown && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
          {inputValue.length === 0 ? (
            history.map((item, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 text-[14px] font-medium transition-colors flex items-center gap-3"
                onClick={() => handleHistorySelect(item)}
              >
                <span className="text-slate-400">🕒</span>
                {item}
              </button>
            ))
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors flex items-start gap-3"
                onClick={() => handleSelect(s)}
              >
                <span className="mt-0.5 shrink-0 text-indigo-500">📍</span>
                <div>
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-white">
                    {s.structured_formatting?.main_text || s.description}
                  </p>
                  {s.structured_formatting?.secondary_text && (
                    <p className="text-[12px] text-slate-400 mt-0.5">{s.structured_formatting.secondary_text}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;
