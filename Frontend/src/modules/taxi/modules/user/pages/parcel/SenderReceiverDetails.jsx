import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  Navigation,
  X,
  Package,
} from 'lucide-react';
import { GoogleMap } from '@react-google-maps/api';
import api from '../../../../shared/api/axiosInstance';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader, RAPIDO_MAP_STYLE } from '../../../admin/utils/googleMaps';
import { userAuthService } from '../../services/authService';

const Motion = motion;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const LOCATION_COORDS = {
  'Pipaliyahana, Indore': [75.9048, 22.7039],
  'Vijay Nagar': [75.8937, 22.7533],
  'Vijay Nagar Square': [75.8947, 22.7518],
  Rajwada: [75.8553, 22.7187],
  Bhawarkua: [75.8586, 22.6926],
  'MG Road': [75.8721, 22.7196],
  'Palasia Square': [75.8863, 22.7242],
  'LIG Colony': [75.8904, 22.7322],
  'Scheme No 54': [75.8978, 22.7567],
  'AB Road': [75.8878, 22.7423],
  'Geeta Bhawan': [75.8834, 22.7208],
  'Sapna Sangeeta': [75.8587, 22.6984],
  'Mahalaxmi Nagar': [75.9114, 22.7676],
};
const POPULAR_LOCATIONS = Object.keys(LOCATION_COORDS);
const DEFAULT_COORDS = { lat: 22.7196, lng: 75.8577 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const getCoords = (title, fallback = [75.8577, 22.7196]) => LOCATION_COORDS[title] || fallback;

const readStoredUserInfo = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const coordPairToLatLng = (coords, fallback = DEFAULT_COORDS) => {
  if (Array.isArray(coords) && coords.length >= 2) {
    const [lng, lat] = coords;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  return fallback;
};

const latLngToCoordPair = (position) => [Number(position.lng), Number(position.lat)];

const formatCoordLabel = (coords) => {
  const position = coordPairToLatLng(coords);
  return `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
};

const formatLatLngLabel = (position) => `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;

const PhoneInput = ({ label, value, onChange, error, name, onClearError }) => (
  <div className="space-y-1">
    <label className="text-[12px] font-black text-gray-400 ml-1">{label}</label>
    <div
      className={`flex items-center gap-3 rounded-2xl p-4 ring-2 transition-all ${
        error
          ? 'bg-red-50 ring-red-100'
          : value && PHONE_REGEX.test(value)
            ? 'bg-green-50 ring-green-100'
            : 'bg-gray-50/50 ring-transparent'
      }`}
    >
      <Phone
        size={18}
        className={
          error ? 'text-red-400' : value && PHONE_REGEX.test(value) ? 'text-green-500' : 'text-gray-400'
        }
      />
      <input
        type="tel"
        maxLength={10}
        className="flex-1 bg-transparent border-none text-[15px] font-bold text-gray-900 focus:outline-none placeholder:text-gray-300"
        value={value}
        placeholder="10-digit mobile number"
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          onChange(val);
          if (onClearError) onClearError(name);
        }}
      />
      {value && PHONE_REGEX.test(value) && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
    </div>
    <AnimatePresence>
      {error && (
        <Motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-[11px] font-black text-red-500 ml-2 flex items-center gap-1"
        >
          <AlertCircle size={11} strokeWidth={3} />
          {error}
        </Motion.p>
      )}
    </AnimatePresence>
  </div>
);

const AddressField = ({ label, value, onChange, error, suggestions, onPickSuggestion }) => (
  <div className="space-y-2">
    <label className="text-[12px] font-black text-gray-400 ml-1">{label}</label>
    <div className={`rounded-2xl p-4 ring-2 transition-all ${error ? 'bg-red-50 ring-red-100' : 'bg-gray-50/50 ring-transparent'}`}>
      <div className="flex items-center gap-3">
        <MapPin size={18} className={error ? 'text-red-400' : 'text-blue-500'} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter area or landmark"
          className="flex-1 bg-transparent border-none text-[15px] font-bold text-gray-900 focus:outline-none placeholder:text-gray-300"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPickSuggestion(item)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
    <AnimatePresence>
      {error && (
        <Motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-[11px] font-black text-red-500 ml-2 flex items-center gap-1"
        >
          <AlertCircle size={11} strokeWidth={3} />
          {error}
        </Motion.p>
      )}
    </AnimatePresence>
  </div>
);

const MapPickerSheet = ({ open, title, confirmLabel, value, initialCoords, onClose, onConfirm }) => {
  const { isLoaded, loadError } = useAppGoogleMapsLoader();
  const [center, setCenter] = useState(coordPairToLatLng(initialCoords));
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(value || formatCoordLabel(initialCoords));
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef(null);
  const draggingRef = useRef(false);
  const geocodeTimerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const resetTimer = setTimeout(() => {
      setCenter(coordPairToLatLng(initialCoords));
      setSelectedAddress(value || formatCoordLabel(initialCoords));
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [initialCoords, open, value]);

  useEffect(() => {
    if (!open || !isLoaded || !window.google?.maps?.Geocoder) {
      return undefined;
    }

    clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      setIsResolvingAddress(true);
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ location: center }, (results, status) => {
        setIsResolvingAddress(false);

        if (status === 'OK' && results?.[0]?.formatted_address) {
          setSelectedAddress(results[0].formatted_address);
          return;
        }

        setSelectedAddress(formatLatLngLabel(center));
      });
    }, 500);

    return () => clearTimeout(geocodeTimerRef.current);
  }, [center, isLoaded, open]);

  const commitMapCenter = () => {
    if (!mapRef.current) {
      return;
    }

    const mapCenter = mapRef.current.getCenter();
    if (!mapCenter) {
      return;
    }

    const next = { lat: mapCenter.lat(), lng: mapCenter.lng() };
    setCenter((current) => {
      const samePoint = Math.abs(current.lat - next.lat) < 0.000001 && Math.abs(current.lng - next.lng) < 0.000001;
      return samePoint ? current : next;
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSelectedAddress('Location permission is not available on this device.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setIsLocating(false);
        setCenter(next);
        if (mapRef.current) {
          mapRef.current.panTo(next);
          mapRef.current.setZoom(16);
        }
      },
      () => {
        setIsLocating(false);
        setSelectedAddress('Could not fetch your current location. Move the map manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="w-full max-w-lg h-full sm:h-[620px] sm:max-h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden bg-white shadow-2xl"
        >
          {/* Minimalist Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-white z-10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                <MapPin size={16} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 tracking-tight leading-none">{title}</h3>
                <p className="mt-1 text-[11px] font-normal text-gray-500 truncate">Pan map to set exact location</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200/80 active:scale-95 flex items-center justify-center text-gray-600 transition-all shrink-0 ml-3"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Map Section */}
          <div className="relative flex-1 bg-gray-50 min-h-0">
            {!HAS_VALID_GOOGLE_MAPS_KEY && (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="rounded-xl bg-white px-5 py-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">Google Maps key missing</p>
                  <p className="mt-1 text-[11px] text-gray-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && loadError && (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="rounded-xl bg-white px-5 py-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">Map failed to load</p>
                  <p className="mt-1 text-[11px] text-gray-500">Check Google Maps browser key restrictions.</p>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && !loadError && !isLoaded && (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-100">
                  <LoaderCircle size={16} className="animate-spin text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">Loading map...</span>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && !loadError && isLoaded && (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={center}
                zoom={16}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
                onUnmount={() => {
                  mapRef.current = null;
                }}
                onDragStart={() => {
                  draggingRef.current = true;
                  setIsDragging(true);
                }}
                onDragEnd={() => {
                  draggingRef.current = false;
                  setIsDragging(false);
                  commitMapCenter();
                }}
                onIdle={() => {
                  if (!mapRef.current || draggingRef.current) {
                    return;
                  }

                  commitMapCenter();
                }}
                options={{
                  disableDefaultUI: true,
                  zoomControl: false,
                  clickableIcons: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                  mapTypeControl: false,
                  gestureHandling: 'greedy',
                  styles: RAPIDO_MAP_STYLE,
                }}
              />
            )}

            {/* Clean Custom Map Pin */}
            <Motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-20"
              animate={{ y: isDragging ? -14 : 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center">
                <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white shadow-lg ring-[3px] ring-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                </div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-900 -mt-0.5" />
                <div className="w-2.5 h-1 rounded-full bg-black/25 blur-[1px] mt-1" />
              </div>
            </Motion.div>

            {/* Minimalist Floating Locate Button */}
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isLocating}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-md border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-70"
            >
              <Navigation size={14} className={isLocating ? 'animate-spin text-yellow-500' : 'text-gray-700'} strokeWidth={2.2} />
              <span>{isLocating ? 'Locating...' : 'Locate me'}</span>
            </button>
          </div>

          {/* Minimalist Bottom Drawer */}
          <div className="bg-white px-5 pt-4 pb-5 border-t border-gray-100 shadow-lg z-10 shrink-0">
            <div className="flex items-start gap-3 mb-4">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                {isResolvingAddress ? (
                  <LoaderCircle size={16} className="animate-spin text-gray-700" />
                ) : (
                  <MapPin size={16} strokeWidth={2.2} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-gray-400">Selected location</span>
                  {isResolvingAddress && <span className="text-[10px] font-medium text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">Updating...</span>}
                </div>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                  {isResolvingAddress ? 'Resolving address...' : selectedAddress}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onConfirm(latLngToCoordPair(center), selectedAddress)}
              disabled={isResolvingAddress}
              className="w-full bg-gray-900 hover:bg-black active:scale-[0.99] disabled:opacity-70 text-white py-3.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{confirmLabel}</span>
              <ChevronRight size={16} className="opacity-70" strokeWidth={2.5} />
            </button>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
};

const SenderReceiverDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded: isGoogleMapsLoaded } = useAppGoogleMapsLoader();
  const parcelState = location.state || {};
  const storedUser = useMemo(() => readStoredUserInfo(), []);
  const [senderName, setSenderName] = useState(() => parcelState.senderName || storedUser?.name || '');
  const [senderMobile, setSenderMobile] = useState(() => parcelState.senderMobile || storedUser?.phone || '');
  const [receiverName, setReceiverName] = useState(() => parcelState.receiverName || '');
  const [receiverMobile, setReceiverMobile] = useState(() => parcelState.receiverMobile || '');
  const [pickup, setPickup] = useState(() => parcelState.pickup || '');
  const [drop, setDrop] = useState(() => parcelState.drop || '');
  const [pickupCoords, setPickupCoords] = useState(() => parcelState.pickupCoords || getCoords(parcelState.pickup || '', [75.8577, 22.7196]));
  const [dropCoords, setDropCoords] = useState(() => parcelState.dropCoords || getCoords(parcelState.drop || '', [75.8577, 22.7196]));
  const [activeMapPicker, setActiveMapPicker] = useState(null);
  const [isLocatingPickup, setIsLocatingPickup] = useState(false);
  const [errors, setErrors] = useState({});
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [pricingRules, setPricingRules] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);

  // Geolocation and Dynamic Suggestions State
  const [userCoords, setUserCoords] = useState(null);
  const [nearbySuggestions, setNearbySuggestions] = useState(() => POPULAR_LOCATIONS.slice(0, 4));
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [lastGeocodedPickup, setLastGeocodedPickup] = useState(() => parcelState.pickup || '');
  const [lastGeocodedDrop, setLastGeocodedDrop] = useState(() => parcelState.drop || '');
  const [isProceeding, setIsProceeding] = useState(false);

  // 1. Fetch user coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('User geolocation fetch failed:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // 2. Reverse geocode userCoords to populate nearbySuggestions
  useEffect(() => {
    if (!userCoords || !isGoogleMapsLoaded || !window.google?.maps?.Geocoder) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: userCoords }, (results, status) => {
      if (status === 'OK' && results) {
        const suggestions = [];
        for (const result of results) {
          const sublocalityComp = result.address_components.find(
            (c) => c.types.includes('sublocality') || c.types.includes('neighborhood')
          );
          let name = '';
          if (sublocalityComp) {
            name = sublocalityComp.long_name;
          } else {
            name = result.formatted_address.split(',')[0];
          }

          if (name && !suggestions.includes(name) && name.length > 2) {
            suggestions.push(name);
          }
          if (suggestions.length >= 4) break;
        }

        // Fallback to parts of formatted address
        if (suggestions.length < 4) {
          for (const result of results) {
            const shortAddress = result.formatted_address.split(',').slice(0, 2).join(',').trim();
            if (shortAddress && !suggestions.includes(shortAddress)) {
              suggestions.push(shortAddress);
            }
            if (suggestions.length >= 4) break;
          }
        }

        if (suggestions.length > 0) {
          setNearbySuggestions(suggestions.slice(0, 4));
        }
      }
    });
  }, [userCoords, isGoogleMapsLoaded]);

  // 3. Autocomplete for pickup input
  useEffect(() => {
    if (!isGoogleMapsLoaded || !window.google?.maps?.places?.AutocompleteService) {
      if (!pickup.trim()) {
        setPickupSuggestions(nearbySuggestions);
      } else {
        setPickupSuggestions(POPULAR_LOCATIONS.filter(item => item.toLowerCase().includes(pickup.toLowerCase())).slice(0, 4));
      }
      return;
    }

    if (!pickup.trim()) {
      setPickupSuggestions(nearbySuggestions);
      return;
    }

    const timer = setTimeout(() => {
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      const request = {
        input: pickup,
        componentRestrictions: { country: 'in' },
      };

      if (userCoords) {
        request.locationBias = {
          radius: 50000,
          center: userCoords,
        };
      }

      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === 'OK' && predictions) {
          setPickupSuggestions(predictions.map((p) => p.description).slice(0, 4));
        } else {
          setPickupSuggestions(POPULAR_LOCATIONS.filter(item => item.toLowerCase().includes(pickup.toLowerCase())).slice(0, 4));
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [pickup, nearbySuggestions, userCoords, isGoogleMapsLoaded]);

  // 4. Autocomplete for drop input
  useEffect(() => {
    if (!isGoogleMapsLoaded || !window.google?.maps?.places?.AutocompleteService) {
      if (!drop.trim()) {
        setDropSuggestions(nearbySuggestions);
      } else {
        setDropSuggestions(POPULAR_LOCATIONS.filter(item => item.toLowerCase().includes(drop.toLowerCase())).slice(0, 4));
      }
      return;
    }

    if (!drop.trim()) {
      setDropSuggestions(nearbySuggestions);
      return;
    }

    const timer = setTimeout(() => {
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      const request = {
        input: drop,
        componentRestrictions: { country: 'in' },
      };

      if (userCoords) {
        request.locationBias = {
          radius: 50000,
          center: userCoords,
        };
      }

      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === 'OK' && predictions) {
          setDropSuggestions(predictions.map((p) => p.description).slice(0, 4));
        } else {
          setDropSuggestions(POPULAR_LOCATIONS.filter(item => item.toLowerCase().includes(drop.toLowerCase())).slice(0, 4));
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [drop, nearbySuggestions, userCoords, isGoogleMapsLoaded]);

  // 5. Geocoding helper resolver
  const resolveCoords = (address) => {
    return new Promise((resolve) => {
      if (!isGoogleMapsLoaded || !window.google?.maps?.Geocoder) {
        resolve(LOCATION_COORDS[address] || null);
        return;
      }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          resolve([loc.lng(), loc.lat()]);
        } else {
          resolve(LOCATION_COORDS[address] || null);
        }
      });
    });
  };

  const handleSelectPickup = async (item) => {
    setPickup(item);
    clearError('pickup');
    const coords = await resolveCoords(item);
    if (coords) {
      setPickupCoords(coords);
      setLastGeocodedPickup(item);
    }
  };

  const handleSelectDrop = async (item) => {
    setDrop(item);
    clearError('drop');
    const coords = await resolveCoords(item);
    if (coords) {
      setDropCoords(coords);
      setLastGeocodedDrop(item);
    }
  };

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [pricingRes, vehiclesRes] = await Promise.all([
          api.get('/users/set-prices'),
          api.get('/users/vehicle-types'),
        ]);
        if (!active) return;
        
        const rules = pricingRes?.data?.results || pricingRes?.data?.data || (Array.isArray(pricingRes) ? pricingRes : []);
        const catalog = vehiclesRes?.data?.results || vehiclesRes?.data?.vehicle_types || (Array.isArray(vehiclesRes) ? vehiclesRes : []);
        
        setPricingRules(rules);
        setVehicleTypes(catalog);
      } catch (err) {
        console.error('Error fetching dynamic pricing info:', err);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const pickupLatLng = useMemo(() => coordPairToLatLng(pickupCoords), [pickupCoords]);
  const dropLatLng = useMemo(() => coordPairToLatLng(dropCoords, null), [dropCoords]);

  const calculateHaversineDistance = (fromCoords, toCoords) => {
    const [fromLng, fromLat] = fromCoords || [];
    const [toLng, toLat] = toCoords || [];
    if (![fromLng, fromLat, toLng, toLat].every(Number.isFinite)) return 0;
    
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(toLat - fromLat);
    const dLng = toRad(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  useEffect(() => {
    const fallbackMeters = calculateHaversineDistance(pickupCoords, dropCoords);
    if (!dropLatLng) {
      setDistanceMeters(fallbackMeters);
      return;
    }

    if (!isGoogleMapsLoaded || !window.google?.maps?.DirectionsService) {
      setDistanceMeters(fallbackMeters);
      return;
    }

    let active = true;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pickupLatLng,
        destination: dropLatLng,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (!active) return;
        if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0];
          setDistanceMeters(leg.distance?.value || fallbackMeters);
        } else {
          setDistanceMeters(fallbackMeters);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [pickupCoords, dropCoords, pickupLatLng, dropLatLng, isGoogleMapsLoaded]);

  // Abstracted fare computer for dynamic distance/coords routing
  const computeFare = (meters) => {
    const activeTypes = vehicleTypes.filter((type) => type.active !== false && Number(type.status ?? 1) !== 0);
    const preferredType = String(parcelState.goodsTypeFor || '').trim();
    
    const preferredLabels = preferredType
      .split(',')
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean)
      .filter(entry => entry !== 'both');

    let matchedVehicle = null;
    
    for (const label of preferredLabels) {
      matchedVehicle = activeTypes.find(type => String(type.name || type.vehicle_type || type.label).toLowerCase() === label);
      if (matchedVehicle) break;
    }
    
    if (!matchedVehicle) {
      matchedVehicle = activeTypes.find(type => {
        const val = `${type.name || ''} ${type.icon_types || ''} ${type.transport_type || ''}`.toLowerCase();
        return val.includes('bike') || val.includes('delivery') || val.includes('parcel');
      }) || activeTypes[0];
    }

    if (!matchedVehicle) {
      return parcelState.weightRule?.base_price || 45;
    }

    const vehicleTypeId = matchedVehicle._id || matchedVehicle.id;
    const deliveryRules = pricingRules.filter(
      (rule) =>
        Number(rule.active ?? 1) === 1 &&
        String(rule.status || 'active').toLowerCase() !== 'inactive' &&
        (String(rule.transport_type).toLowerCase() === 'delivery' ||
          String(rule.transport_type).toLowerCase() === 'both') &&
        String(rule.vehicle_type?._id || rule.vehicle_type || rule.type_id) === String(vehicleTypeId)
    );

    const activeRule = deliveryRules[0];

    if (!activeRule) {
      const rule = parcelState.weightRule;
      if (rule) {
        const distanceKm = meters / 1000;
        const extraDistanceKm = Math.max(0, distanceKm - Number(rule.base_distance || 0));
        const subtotal = Number(rule.base_price || 0) + (extraDistanceKm * Number(rule.price_per_distance || 0));
        return Math.max(0, Math.round(subtotal));
      }
      return 45;
    }

    const selectedWeight = parcelState.weight || 'Under 5kg';
    const weightRule = Array.isArray(activeRule.parcel_weight_ranges) && activeRule.parcel_weight_ranges.find(
      (r) => String(r.weight_range).trim().toLowerCase() === String(selectedWeight).trim().toLowerCase()
    );

    const rule = weightRule || activeRule.parcel_weight_ranges?.[0] || parcelState.weightRule;

    if (!rule) {
      return 45;
    }

    const distanceKm = meters / 1000;
    const basePrice = Number(rule.base_price || 0);
    const baseDistance = Number(rule.base_distance || 0);
    const pricePerDistance = Number(rule.price_per_distance || 0);
    const extraDistanceKm = Math.max(0, distanceKm - baseDistance);
    const serviceTax = Number(activeRule.service_tax || 0);

    const subtotal = basePrice + (extraDistanceKm * pricePerDistance);
    const total = subtotal + (subtotal * serviceTax) / 100;
    return Math.max(0, Math.round(total));
  };

  const calculatedFare = useMemo(() => computeFare(distanceMeters), [pricingRules, vehicleTypes, distanceMeters, parcelState.weight, parcelState.weightRule, parcelState.goodsTypeFor]);

  useEffect(() => {
    let active = true;

    const hydrateSenderDetails = async () => {
      try {
        const response = await userAuthService.getCurrentUser();
        const user = response?.data?.user || response?.data?.data || {};

        if (!active || (!user?.name && !user?.phone)) {
          return;
        }

        const nextName = user.name || '';
        const nextPhone = user.phone || '';

        if (nextName || nextPhone) {
          window.localStorage.setItem('userInfo', JSON.stringify({
            ...storedUser,
            ...user,
          }));
        }

        setSenderName((current) => {
          const normalized = String(current || '').trim();
          const storedName = String(storedUser?.name || '').trim();

          if (!normalized || normalized === storedName) {
            return nextName || current;
          }

          return current;
        });

        setSenderMobile((current) => {
          const normalized = String(current || '').trim();
          const storedPhone = String(storedUser?.phone || '').trim();

          if (!normalized || normalized === storedPhone) {
            return nextPhone || current;
          }

          return current;
        });
      } catch {
        // Keep local fallback if profile fetch is unavailable.
      }
    };

    hydrateSenderDetails();

    return () => {
      active = false;
    };
  }, [storedUser]);

  const validate = () => {
    const nextErrors = {};
    if (!pickup.trim()) nextErrors.pickup = 'Pickup location is required';
    if (!drop.trim()) nextErrors.drop = 'Drop location is required';
    if (!senderName.trim()) nextErrors.senderName = 'Sender name is required';
    if (!senderMobile.trim() || senderMobile.trim().length < 10) nextErrors.senderMobile = 'Valid 10-digit sender phone required';
    if (!receiverName.trim()) nextErrors.receiverName = 'Receiver name is required';
    if (!receiverMobile.trim() || receiverMobile.trim().length < 10) nextErrors.receiverMobile = 'Valid 10-digit receiver phone required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearError = (key) => {
    if (!errors[key]) return;
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const resolveAddressFromCoords = (position) =>
    new Promise((resolve) => {
      if (!isGoogleMapsLoaded || !window.google?.maps?.Geocoder) {
        resolve(formatLatLngLabel(position));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results?.[0]?.formatted_address) {
          resolve(results[0].formatted_address);
          return;
        }

        resolve(formatLatLngLabel(position));
      });
    });

  const useCurrentPickupLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, pickup: 'Current location is not available on this device' }));
      return;
    }

    setIsLocatingPickup(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const coords = latLngToCoordPair(next);
        const address = await resolveAddressFromCoords(next);

        setPickupCoords(coords);
        setPickup(address || formatLatLngLabel(next));
        setLastGeocodedPickup(address || formatLatLngLabel(next));
        clearError('pickup');
        setIsLocatingPickup(false);
      },
      () => {
        setIsLocatingPickup(false);
        setErrors((prev) => ({ ...prev, pickup: 'Allow location permission or choose pickup on the map' }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const handleProceed = async () => {
    if (!validate()) return;
    setIsProceeding(true);

    try {
      let finalPickupCoords = pickupCoords;
      let finalDropCoords = dropCoords;

      if (pickup !== lastGeocodedPickup) {
        const resolved = await resolveCoords(pickup);
        if (resolved) {
          finalPickupCoords = resolved;
          setPickupCoords(resolved);
          setLastGeocodedPickup(pickup);
        }
      }

      if (drop !== lastGeocodedDrop) {
        const resolved = await resolveCoords(drop);
        if (resolved) {
          finalDropCoords = resolved;
          setDropCoords(resolved);
          setLastGeocodedDrop(drop);
        }
      }

      // Calculate directions route distance with final resolved coords
      let finalDistanceMeters = distanceMeters;
      if (pickup !== lastGeocodedPickup || drop !== lastGeocodedDrop) {
        finalDistanceMeters = await new Promise((resolve) => {
          const fallback = calculateHaversineDistance(finalPickupCoords, finalDropCoords);
          if (!isGoogleMapsLoaded || !window.google?.maps?.DirectionsService) {
            resolve(fallback);
            return;
          }
          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route(
            {
              origin: coordPairToLatLng(finalPickupCoords),
              destination: coordPairToLatLng(finalDropCoords),
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
                resolve(result.routes[0].legs[0].distance?.value || fallback);
              } else {
                resolve(fallback);
              }
            }
          );
        });
        setDistanceMeters(finalDistanceMeters);
      }

      const finalFare = computeFare(finalDistanceMeters);

      navigate('/taxi/user/ride/select-vehicle', {
        state: {
          ...parcelState,
          pickup,
          drop,
          pickupCoords: finalPickupCoords,
          dropCoords: finalDropCoords,
          senderName: senderName || storedUser?.name || 'Sender',
          senderMobile: senderMobile || storedUser?.phone || '9999999999',
          receiverName: receiverName || 'Receiver',
          receiverMobile: receiverMobile || '9999999999',
          paymentMethod: 'Cash',
          fare: finalFare,
          weightRule: parcelState.weightRule || null,
          deliveryScope: parcelState.deliveryScope || 'city',
          isOutstation: Boolean(parcelState.isOutstation || parcelState.deliveryScope === 'outstation'),
          parcel: {
            category: parcelState.parcelType || 'Parcel',
            weight: parcelState.weight || 'Under 5kg',
            description: parcelState.description || '',
            deliveryScope: parcelState.deliveryScope || 'city',
            isOutstation: Boolean(parcelState.isOutstation || parcelState.deliveryScope === 'outstation'),
            senderName: senderName || storedUser?.name || 'Sender',
            senderMobile: senderMobile || storedUser?.phone || '9999999999',
            receiverName: receiverName || 'Receiver',
            receiverMobile: receiverMobile || '9999999999',
          },
          isParcel: true,
        },
      });
    } catch (err) {
      console.error('Error in handling routing proceed:', err);
    } finally {
      setIsProceeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] max-w-lg mx-auto flex flex-col font-sans relative">
      <MapPickerSheet
        open={activeMapPicker === 'pickup'}
        title="Choose Pickup Point"
        value={pickup}
        initialCoords={pickupCoords}
        confirmLabel="Confirm Pickup on Map"
        onClose={() => setActiveMapPicker(null)}
        onConfirm={(coords, address) => {
          setPickupCoords(coords);
          setPickup(address || formatCoordLabel(coords));
          setLastGeocodedPickup(address || formatCoordLabel(coords));
          clearError('pickup');
          setActiveMapPicker(null);
        }}
      />
      <MapPickerSheet
        open={activeMapPicker === 'drop'}
        title="Choose Delivery Point"
        value={drop}
        initialCoords={dropCoords}
        confirmLabel="Confirm Delivery on Map"
        onClose={() => setActiveMapPicker(null)}
        onConfirm={(coords, address) => {
          setDropCoords(coords);
          setDrop(address || formatCoordLabel(coords));
          setLastGeocodedDrop(address || formatCoordLabel(coords));
          clearError('drop');
          setActiveMapPicker(null);
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white px-5 py-4 flex items-center gap-3.5 border-b border-gray-200/80 sticky top-0 z-20"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all shrink-0"
        >
          <ArrowLeft size={20} className="text-gray-800" strokeWidth={2} />
        </motion.button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
            {parcelState.parcelType || 'Parcel'} • {parcelState.weight || 'Under 5kg'}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-gray-800 leading-tight">Sender & Receiver</h1>
        </div>
        <div className="rounded-full border border-gray-200/80 bg-gray-100/80 px-3 py-1 text-[11px] font-medium text-gray-600 shrink-0 flex items-center gap-1.5">
          <Package size={13} className="text-gray-400" />
          <span>Step 3 of 3</span>
        </div>
      </motion.header>

      {/* Content Area */}
      <div className="flex-1 px-5 pt-5 pb-44 space-y-5 overflow-y-auto no-scrollbar">
        
        {/* Step Progress Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
          className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Step 3 of 3</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-yellow-600">Pickup & Delivery</span>
          </div>
          
          {/* Progress Bar Segments */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="h-1 flex-1 rounded-full bg-yellow-400" />
            <div className="h-1 flex-1 rounded-full bg-yellow-400" />
            <div className="h-1 flex-1 rounded-full bg-yellow-400" />
          </div>
          
          <h2 className="mt-3.5 text-[15px] font-semibold tracking-tight text-gray-800">Contact & Address Details</h2>
          <p className="mt-0.5 text-xs font-normal text-gray-500">Enter pickup point, sender details, delivery address, and receiver phone.</p>
        </motion.div>

        {/* Sender Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
          className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Pickup Details (Sender)</span>
            </div>
            <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50/60 px-2 py-0.5 rounded-md">From</span>
          </div>

          {/* Pickup Address Input */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 block mb-1">Pickup Location <span className="text-red-500">*</span></label>
            <div className={`flex items-center bg-gray-50 border rounded-xl px-3 py-2 transition-all ${errors.pickup ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 focus-within:bg-white'}`}>
              <MapPin size={16} className="text-emerald-600 mr-2 shrink-0" strokeWidth={2} />
              <input
                type="text"
                value={pickup}
                onChange={(e) => {
                  setPickup(e.target.value);
                  clearError('pickup');
                }}
                placeholder="Enter pickup area, building, or landmark"
                className="w-full bg-transparent border-none text-sm font-normal text-gray-800 focus:outline-none placeholder:text-gray-400"
              />
              {pickup.length > 0 && (
                <button type="button" onClick={() => setPickup('')} className="ml-1 text-gray-300 hover:text-gray-500 shrink-0">
                  <X size={14} />
                </button>
              )}
              <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-2">
                <button
                  type="button"
                  onClick={useCurrentPickupLocation}
                  disabled={isLocatingPickup}
                  className="p-1 rounded-md hover:bg-gray-200/60 text-gray-500 transition-colors"
                  title="Use Current Location"
                >
                  <Navigation size={14} className={isLocatingPickup ? 'animate-pulse text-yellow-600' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMapPicker('pickup')}
                  className="p-1 rounded-md hover:bg-gray-200/60 text-gray-500 transition-colors"
                  title="Choose on Map"
                >
                  <MapPin size={14} />
                </button>
              </div>
            </div>
            {errors.pickup && <p className="text-xs font-normal text-red-500 mt-1">{errors.pickup}</p>}

            {/* Suggestions */}
            {pickupSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pickupSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectPickup(item)}
                    className="rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 px-2 py-1 text-[11px] font-normal text-gray-600 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 my-1" />

          {/* Sender Contact Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 block mb-1">Sender Name <span className="text-red-500">*</span></label>
              <div className={`flex items-center bg-gray-50 border rounded-xl px-3 py-2 transition-all ${errors.senderName ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 focus-within:bg-white'}`}>
                <User size={15} className="text-gray-400 mr-2 shrink-0" strokeWidth={1.8} />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    clearError('senderName');
                  }}
                  placeholder="Sender name"
                  className="w-full bg-transparent border-none text-sm font-normal text-gray-800 focus:outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.senderName && <p className="text-xs font-normal text-red-500 mt-1">{errors.senderName}</p>}
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 block mb-1">Sender Phone <span className="text-red-500">*</span></label>
              <div className={`flex items-center bg-gray-50 border rounded-xl px-3 py-2 transition-all ${errors.senderMobile ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 focus-within:bg-white'}`}>
                <Phone size={15} className="text-gray-400 mr-2 shrink-0" strokeWidth={1.8} />
                <input
                  type="tel"
                  maxLength={10}
                  value={senderMobile}
                  onChange={(e) => {
                    setSenderMobile(e.target.value.replace(/\D/g, ''));
                    clearError('senderMobile');
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full bg-transparent border-none text-sm font-normal text-gray-800 focus:outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.senderMobile && <p className="text-xs font-normal text-red-500 mt-1">{errors.senderMobile}</p>}
            </div>
          </div>
        </motion.div>

        {/* Receiver Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
          className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Delivery Details (Receiver)</span>
            </div>
            <span className="text-[11px] font-normal text-orange-600 bg-orange-50/60 px-2 py-0.5 rounded-md">To</span>
          </div>

          {/* Drop Address Input */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 block mb-1">Delivery Location <span className="text-red-500">*</span></label>
            <div className={`flex items-center bg-gray-50 border rounded-xl px-3 py-2 transition-all ${errors.drop ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 focus-within:bg-white'}`}>
              <MapPin size={16} className="text-orange-600 mr-2 shrink-0" strokeWidth={2} />
              <input
                type="text"
                value={drop}
                onChange={(e) => {
                  setDrop(e.target.value);
                  clearError('drop');
                }}
                placeholder="Enter delivery area, building, or landmark"
                className="w-full bg-transparent border-none text-sm font-normal text-gray-800 focus:outline-none placeholder:text-gray-400"
              />
              {drop.length > 0 && (
                <button type="button" onClick={() => setDrop('')} className="ml-1 text-gray-300 hover:text-gray-500 shrink-0">
                  <X size={14} />
                </button>
              )}
              <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-2">
                <button
                  type="button"
                  onClick={() => setActiveMapPicker('drop')}
                  className="p-1 rounded-md hover:bg-gray-200/60 text-gray-500 transition-colors"
                  title="Choose on Map"
                >
                  <MapPin size={14} />
                </button>
              </div>
            </div>
            {errors.drop && <p className="text-xs font-normal text-red-500 mt-1">{errors.drop}</p>}

            {/* Suggestions */}
            {dropSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dropSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectDrop(item)}
                    className="rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 px-2 py-1 text-[11px] font-normal text-gray-600 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 my-1" />

          {/* Receiver Contact Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 block mb-1">Receiver Name <span className="text-red-500">*</span></label>
              <div className={`flex items-center bg-gray-50 border rounded-xl px-3 py-2 transition-all ${errors.receiverName ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 focus-within:bg-white'}`}>
                <User size={15} className="text-gray-400 mr-2 shrink-0" strokeWidth={1.8} />
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => {
                    setReceiverName(e.target.value);
                    clearError('receiverName');
                  }}
                  placeholder="Receiver name"
                  className="w-full bg-transparent border-none text-sm font-normal text-gray-800 focus:outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.receiverName && <p className="text-xs font-normal text-red-500 mt-1">{errors.receiverName}</p>}
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400 block mb-1">Receiver Phone <span className="text-red-500">*</span></label>
              <div className={`flex items-center bg-gray-50 border rounded-xl px-3 py-2 transition-all ${errors.receiverMobile ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 focus-within:bg-white'}`}>
                <Phone size={15} className="text-gray-400 mr-2 shrink-0" strokeWidth={1.8} />
                <input
                  type="tel"
                  maxLength={10}
                  value={receiverMobile}
                  onChange={(e) => {
                    setReceiverMobile(e.target.value.replace(/\D/g, ''));
                    clearError('receiverMobile');
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full bg-transparent border-none text-sm font-normal text-gray-800 focus:outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.receiverMobile && <p className="text-xs font-normal text-red-500 mt-1">{errors.receiverMobile}</p>}
            </div>
          </div>
        </motion.div>

        {/* Distance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs space-y-2"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-gray-400">Est. Route Distance</span>
            <span className="font-semibold text-gray-800">{(distanceMeters / 1000).toFixed(1)} km</span>
          </div>
        </motion.div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pointer-events-none z-30">
        <Motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleProceed}
          disabled={isProceeding}
          className="pointer-events-auto w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 py-3.5 rounded-xl text-[15px] font-semibold shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          {isProceeding ? (
            <>
              <LoaderCircle size={18} className="animate-spin text-gray-900" />
              <span>Resolving Locations...</span>
            </>
          ) : (
            <>
              <span>Choose Delivery Vehicle</span>
              <ChevronRight size={18} className="opacity-70" strokeWidth={2.5} />
            </>
          )}
        </Motion.button>
      </div>
    </div>
  );
};

export default SenderReceiverDetails;
