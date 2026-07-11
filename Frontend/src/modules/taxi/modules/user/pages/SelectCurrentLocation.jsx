import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, X, Search, Navigation, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../shared/api/axiosInstance';
import { useAppGoogleMapsLoader, HAS_VALID_GOOGLE_MAPS_KEY } from '../../admin/utils/googleMaps';
import { saveTaxiLocation } from '../services/savedLocation';

const POPULAR_LOCATIONS = [
  { title: 'Vijay Nagar, Indore', address: 'Vijay Nagar, Indore, Madhya Pradesh' },
  { title: 'Rajwada, Indore', address: 'Rajwada, Old Palasia, Indore, MP' },
  { title: 'Vijayawada, AP', address: 'Vijayawada, Andhra Pradesh, India' },
  { title: 'LIG Colony, Indore', address: 'LIG Colony, Indore, Madhya Pradesh' },
  { title: 'Bhawarkua, Indore', address: 'Bhawarkua, Indore, Madhya Pradesh' },
];

const SelectCurrentLocation = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState(POPULAR_LOCATIONS);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { isLoaded } = useAppGoogleMapsLoader();

  // Search/Autocomplete using Google Places or Geocoder
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(POPULAR_LOCATIONS);
      return;
    }

    if (!window.google?.maps?.places) {
      // Fallback local search if Google Maps is not fully loaded/keyed
      const filtered = POPULAR_LOCATIONS.filter(
        (loc) =>
          loc.title.toLowerCase().includes(query.toLowerCase()) ||
          loc.address.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setIsSearching(true);
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      autocompleteService.getPlacePredictions(
        { input: query, componentRestrictions: { country: 'in' } },
        (predictions, status) => {
          setIsSearching(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const formatted = predictions.map((p) => ({
              title: p.structured_formatting.main_text,
              address: p.description,
              placeId: p.place_id,
            }));
            setSuggestions(formatted);
          }
        }
      );
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle location selection
  const handleSelectLocation = async (loc) => {
    try {
      if (loc.placeId && window.google?.maps) {
        // Resolve coordinates using Geocoder for selected placeId
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ placeId: loc.placeId }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            saveTaxiLocation({ lat, lng, address: loc.address });
            toast.success('Location updated successfully!');
            navigate('/taxi/user');
          } else {
            toast.error('Unable to get location details.');
          }
        });
      } else {
        // Fallback or popular location coordinates resolution
        const LOCAL_COORDS = {
          'Vijay Nagar, Indore': { lat: 22.7533, lng: 75.8937 },
          'Rajwada, Indore': { lat: 22.7187, lng: 75.8553 },
          'Vijayawada, AP': { lat: 16.5062, lng: 80.6480 },
          'LIG Colony, Indore': { lat: 22.7322, lng: 75.8904 },
          'Bhawarkua, Indore': { lat: 22.6926, lng: 75.8586 },
        };
        const coords = LOCAL_COORDS[loc.title] || { lat: 22.7196, lng: 75.8577 };
        saveTaxiLocation({ lat: coords.lat, lng: coords.lng, address: loc.address });
        toast.success('Location updated successfully!');
        navigate('/taxi/user');
      }
    } catch (err) {
      toast.error('Failed to save selected location.');
    }
  };

  // Get current GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            setIsLocating(false);
            if (status === 'OK' && results?.[0]) {
              saveTaxiLocation({
                lat: latitude,
                lng: longitude,
                address: results[0].formatted_address,
              });
              toast.success('Location updated successfully!');
              navigate('/taxi/user');
            } else {
              saveTaxiLocation({ lat: latitude, lng: longitude, address: 'Current Location' });
              toast.success('Location updated successfully!');
              navigate('/taxi/user');
            }
          });
        } else {
          setIsLocating(false);
          saveTaxiLocation({ lat: latitude, lng: longitude, address: 'Current Location' });
          toast.success('Location updated successfully!');
          navigate('/taxi/user');
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error('Unable to retrieve your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-lg mx-auto font-sans relative overflow-hidden flex flex-col pb-6">
      {/* Header */}
      <header className="sticky top-0 z-35 bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/taxi/user')}
          className="p-2 -ml-2 active:scale-95 transition-all rounded-full hover:bg-slate-50"
        >
          <ArrowLeft size={22} className="text-slate-800" strokeWidth={2.5} />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settings</p>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none mt-0.5">Select your location</h1>
        </div>
      </header>

      {/* Input Section */}
      <div className="px-5 pt-4">
        <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-3.5 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 transition-all shadow-sm">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, area or street..."
            autoFocus
            className="w-full bg-transparent border-none text-[15px] font-medium text-slate-800 focus:outline-none placeholder:text-slate-350 ml-3"
          />
          {query.length > 0 && (
            <button onClick={() => setQuery('')} className="shrink-0 ml-2">
              <X size={16} className="text-slate-400 hover:text-slate-600 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Current Location Option */}
      <div className="px-5 mt-4">
        <button
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition active:scale-[0.99] group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center justify-center shrink-0">
            {isLocating ? (
              <LoaderCircle size={18} className="animate-spin text-yellow-600" />
            ) : (
              <Navigation size={18} className="text-yellow-600 fill-yellow-50" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-[15px] font-bold text-slate-800 leading-tight group-hover:text-yellow-600 transition-colors">
              Use Current Location
            </h4>
            <p className="text-[12px] text-slate-400 font-medium mt-0.5">Detect location using GPS</p>
          </div>
        </button>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 px-5 mt-6 overflow-y-auto">
        <h2 className="text-[11px] font-bold text-slate-400 mb-3 ml-1 uppercase tracking-widest">
          {query.trim().length > 0 ? 'Search results' : 'Suggested Locations'}
        </h2>

        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-10">
            <LoaderCircle size={32} className="animate-spin text-slate-300" />
            <p className="text-xs text-slate-400 font-semibold mt-3 uppercase tracking-wider">Searching...</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {suggestions.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectLocation(loc)}
                className="w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors"
              >
                <div className="mt-0.5 w-9 h-9 rounded-xl bg-slate-50 border border-slate-100/50 flex items-center justify-center shrink-0 text-slate-400">
                  <MapPin size={16} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-semibold text-slate-800 leading-tight">{loc.title}</h4>
                  <p className="text-[12px] text-slate-400 font-medium mt-1 line-clamp-1">{loc.address}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[14px] font-semibold text-slate-600">No results found for "{query}"</p>
            <p className="text-[12px] font-medium text-slate-400 mt-1">Try check spelling or try another query</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectCurrentLocation;
