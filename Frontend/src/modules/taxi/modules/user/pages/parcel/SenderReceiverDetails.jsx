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
} from 'lucide-react';
import { GoogleMap } from '@react-google-maps/api';
import api from '../../../../shared/api/axiosInstance';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../../admin/utils/googleMaps';
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
        className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] px-0 py-0 sm:px-4 sm:py-6"
      >
        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="mx-auto flex h-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl sm:rounded-[30px]"
        >
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
            <div className="min-w-0 pr-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Map Picker</p>
              <h3 className="mt-1 text-[20px] font-black tracking-tight text-gray-900">{title}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] font-bold text-gray-500">{value || 'Move the map and confirm the exact point.'}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl bg-gray-50 p-2.5 text-slate-700 active:scale-95">
              <X size={18} strokeWidth={2.8} />
            </button>
          </div>

          <div className="relative flex-1 bg-slate-100">
            {!HAS_VALID_GOOGLE_MAPS_KEY && (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="rounded-[20px] bg-white/95 px-5 py-4 shadow-sm">
                  <p className="text-[12px] font-black text-slate-900">Google Maps key missing</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && loadError && (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="rounded-[20px] bg-white/95 px-5 py-4 shadow-sm">
                  <p className="text-[12px] font-black text-slate-900">Map failed to load</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">Check Google Maps browser key restrictions.</p>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && !loadError && !isLoaded && (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 rounded-[18px] bg-white/95 px-4 py-3 shadow-sm">
                  <LoaderCircle size={18} className="animate-spin text-slate-500" />
                  <span className="text-[12px] font-black text-slate-700">Loading map</span>
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
                  zoomControl: true,
                  clickableIcons: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                  mapTypeControl: false,
                  gestureHandling: 'greedy',
                }}
              />
            )}

            <Motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-20"
              animate={{ y: isDragging ? -12 : 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <div className="relative -translate-x-1/2 -translate-y-full">
                <div className="absolute left-1/2 top-full h-4 w-5 -translate-x-1/2 rounded-full bg-slate-950/30 blur-[3px]" />
                <div className="relative flex h-[46px] w-9 justify-center">
                  <div className="absolute top-0 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.28)] ring-4 ring-white">
                    <div className="h-2.5 w-2.5 rounded-full bg-white" />
                  </div>
                  <div className="absolute top-[27px] h-0 w-0 border-l-[8px] border-r-[8px] border-t-[15px] border-l-transparent border-r-transparent border-t-slate-950" />
                </div>
              </div>
            </Motion.div>

            <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 rounded-[20px] border border-white/80 bg-white/95 px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.12)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-orange-50 text-primary">
                  <MapPin size={17} strokeWidth={2.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {isResolvingAddress ? 'Finding Address' : 'Selected Point'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] font-black leading-snug text-slate-900">
                    {isResolvingAddress ? 'Reading the map pin...' : selectedAddress}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">{formatLatLngLabel(center)}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isLocating}
              className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3.5 py-2 text-[11px] font-black text-slate-700 shadow-sm active:scale-[0.99] disabled:opacity-70"
            >
              <Navigation size={14} className={isLocating ? 'animate-pulse' : ''} strokeWidth={2.5} />
              {isLocating ? 'Locating...' : 'Use My Location'}
            </button>
          </div>

          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Confirming</p>
              <p className="mt-1 line-clamp-2 text-[12px] font-black leading-snug text-slate-900">{selectedAddress}</p>
            </div>
            <button
              type="button"
              onClick={() => onConfirm(latLngToCoordPair(center), selectedAddress)}
              className="flex h-14 w-full items-center justify-center rounded-[18px] bg-slate-900 text-[14px] font-black uppercase tracking-wide text-white shadow-lg"
            >
              {confirmLabel}
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

      <header className="bg-white px-5 py-6 flex items-center gap-6 border-b border-gray-50 shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-90 transition-all">
          <ArrowLeft size={24} className="text-gray-900" strokeWidth={3} />
        </button>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
            {parcelState.parcelType || 'Parcel'} - {parcelState.weight || 'Under 5kg'} - {parcelState.deliveryScope === 'outstation' ? 'Outstation' : 'In City'}
          </p>
          <h1 className="text-[20px] font-extrabold text-gray-900 tracking-tight leading-none">Select Route</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-8 overflow-y-auto no-scrollbar pb-4">

        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <MapPin size={18} strokeWidth={3} />
            </div>
            <h3 className="text-[16px] font-black text-gray-900 tracking-tight leading-none">Pickup & Drop</h3>
          </div>

          <div className="bg-white rounded-[32px] p-5 shadow-lg border border-slate-100 space-y-4">
            <div className="relative flex flex-col gap-5">
              
              {/* Vertical dotted connector line */}
              <div className="absolute left-[9px] top-[26px] bottom-[26px] w-[1.5px] border-l-[1.5px] border-dotted border-slate-300 pointer-events-none" />

              {/* Pickup Input Row */}
              <div className="flex items-start gap-3 relative">
                <div className="mt-[13px] w-5 h-5 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center shrink-0 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Pickup Location</label>
                  <div className={`flex items-center bg-slate-50 border rounded-xl px-3 py-2.5 transition-all ${errors.pickup ? 'border-red-200 bg-red-50/20' : 'border-slate-100 focus-within:border-slate-300'}`}>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => {
                        setPickup(e.target.value);
                        clearError('pickup');
                      }}
                      placeholder="Enter pickup area or landmark"
                      className="w-full bg-transparent border-none text-[14px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                    />
                    {pickup.length > 0 && (
                      <button onClick={() => setPickup('')} className="ml-1 text-slate-300 hover:text-slate-500 shrink-0">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {errors.pickup && <p className="text-[10px] font-black text-red-500 mt-1">{errors.pickup}</p>}
                  
                  {/* Pickup Suggestions */}
                  {pickupSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pickupSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelectPickup(item)}
                          className="rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-[9px] font-semibold text-slate-400">Pin: {formatCoordLabel(pickupCoords)}</p>
                </div>
                
                {/* Actions for Pickup */}
                <div className="flex flex-col gap-1.5 mt-[15px] shrink-0">
                  <button
                    type="button"
                    onClick={useCurrentPickupLocation}
                    disabled={isLocatingPickup}
                    className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 transition-colors border border-slate-100 flex items-center justify-center"
                    title="Use Current Location"
                  >
                    <Navigation size={13} className={isLocatingPickup ? 'animate-pulse' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMapPicker('pickup')}
                    className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 transition-colors border border-slate-100 flex items-center justify-center"
                    title="Choose on Map"
                  >
                    <MapPin size={13} />
                  </button>
                </div>
              </div>

              {/* Drop Input Row */}
              <div className="flex items-start gap-3 relative">
                <div className="mt-[13px] w-5 h-5 rounded-full border-2 border-orange-500 bg-white flex items-center justify-center shrink-0 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Drop Location</label>
                  <div className={`flex items-center bg-slate-50 border rounded-xl px-3 py-2.5 transition-all ${errors.drop ? 'border-red-200 bg-red-50/20' : 'border-slate-100 focus-within:border-slate-300'}`}>
                    <input
                      type="text"
                      value={drop}
                      onChange={(e) => {
                        setDrop(e.target.value);
                        clearError('drop');
                      }}
                      placeholder="Enter delivery area or landmark"
                      className="w-full bg-transparent border-none text-[14px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
                    />
                    {drop.length > 0 && (
                      <button onClick={() => setDrop('')} className="ml-1 text-slate-300 hover:text-slate-500 shrink-0">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {errors.drop && <p className="text-[10px] font-black text-red-500 mt-1">{errors.drop}</p>}

                  {/* Drop Suggestions */}
                  {dropSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dropSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelectDrop(item)}
                          className="rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-[9px] font-semibold text-slate-400">Pin: {formatCoordLabel(dropCoords)}</p>
                </div>

                {/* Actions for Drop */}
                <div className="flex flex-col gap-1.5 mt-[15px] shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveMapPicker('drop')}
                    className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 transition-colors border border-slate-100 flex items-center justify-center"
                    title="Choose on Map"
                  >
                    <MapPin size={13} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="space-y-4 pb-24">
          <div className="bg-white rounded-[32px] p-5 shadow-lg shadow-gray-100 border border-gray-50">
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-gray-100/60 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Est. Distance</span>
                <span className="text-[14px] font-black text-gray-900">
                  {(distanceMeters / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="h-px bg-gray-100 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Est. Delivery Fare</span>
                <span className="text-[18px] font-black text-emerald-600">
                  ₹{calculatedFare}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-50 pb-10 sticky bottom-0 z-30">
        <Motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleProceed}
          disabled={isProceeding}
          className="w-full bg-[#1C2833] py-5 rounded-[28px] text-[18px] font-black text-white shadow-xl shadow-gray-200 active:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isProceeding ? (
            <>
              <LoaderCircle size={18} className="animate-spin text-white" />
              <span>Resolving Locations...</span>
            </>
          ) : (
            <>
              <span>Choose Delivery Vehicle</span>
              <ChevronRight size={20} className="opacity-40" />
            </>
          )}
        </Motion.button>
      </div>
    </div>
  );
};

export default SenderReceiverDetails;
