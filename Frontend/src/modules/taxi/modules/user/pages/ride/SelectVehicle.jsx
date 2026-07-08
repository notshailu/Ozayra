import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, X, Banknote, CreditCard, ChevronDown, ChevronRight, LoaderCircle, Package, ShieldCheck, Clock, Truck, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import api from '../../../../shared/api/axiosInstance';
import { getLocalUserToken, userAuthService } from '../../services/authService';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader, RAPIDO_MAP_STYLE } from '../../../admin/utils/googleMaps';

import CarIcon from '../../../../assets/icons/car.webp';
import BikeIcon from '../../../../assets/icons/bike.webp';
import AutoIcon from '../../../../assets/icons/auto.webp';
import TruckIcon from '../../../../assets/icons/truck.webp';
import EhcvIcon from '../../../../assets/icons/ehcv.webp';
import HcvIcon from '../../../../assets/icons/hcv.webp';
import LcvIcon from '../../../../assets/icons/LCV.webp';
import McvIcon from '../../../../assets/icons/mcv.webp';
import LuxuryIcon from '../../../../assets/icons/Luxury.webp';
import PremiumIcon from '../../../../assets/icons/Premium.webp';
import SuvIcon from '../../../../assets/icons/SUV.webp';

const defaultIcons = {
  car: CarIcon,
  bike: BikeIcon,
  auto: AutoIcon,
  truck: TruckIcon,
  ehcb: EhcvIcon,
  ehcv: EhcvIcon,
  HCV: HcvIcon,
  hcv: HcvIcon,
  LCV: LcvIcon,
  lcv: LcvIcon,
  MCV: McvIcon,
  mcv: McvIcon,
  Luxary: LuxuryIcon,
  luxury: LuxuryIcon,
  premium: PremiumIcon,
  suv: SuvIcon,
};


const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const toLatLng = (coords, fallback = { lat: 22.7196, lng: 75.8577 }) => {
  const [lng, lat] = coords || [];

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  return fallback;
};

const getDriverPosition = (driver) => toLatLng(driver?.location?.coordinates, null);

const buildFallbackRoute = (origin, destination) => {
  if (!origin || !destination) {
    return [];
  }

  const latDelta = destination.lat - origin.lat;
  const lngDelta = destination.lng - origin.lng;
  const bendScale = Math.abs(latDelta) > Math.abs(lngDelta) ? 0.28 : -0.28;
  const latBend = latDelta * bendScale;
  const lngBend = lngDelta * bendScale;

  return [
    origin,
    { lat: origin.lat + latDelta * 0.18, lng: origin.lng + lngDelta * 0.08 },
    { lat: origin.lat + latDelta * 0.36 + latBend, lng: origin.lng + lngDelta * 0.34 - lngBend },
    { lat: origin.lat + latDelta * 0.62 - latBend, lng: origin.lng + lngDelta * 0.58 + lngBend },
    { lat: origin.lat + latDelta * 0.84, lng: origin.lng + lngDelta * 0.9 },
    destination,
  ];
};

const VehicleMapPreview = ({ center, dropPosition, drivers, selectedVehicle, isLoaded, loadError }) => {
  const [routePath, setRoutePath] = useState([]);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    if (!isLoaded || !dropPosition || !window.google?.maps?.DirectionsService) {
      setRoutePath([]);
      setRouteError('');
      return;
    }

    let active = true;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: center,
        destination: dropPosition,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (!active) {
          return;
        }

        if (status === 'OK' && result?.routes?.[0]?.overview_path?.length) {
          setRoutePath(
            result.routes[0].overview_path.map((point) => ({
              lat: point.lat(),
              lng: point.lng(),
            })),
          );
          setRouteError('');
          return;
        }

        setRoutePath(buildFallbackRoute(center, dropPosition));
        setRouteError(status || 'Directions unavailable');
      },
    );

    return () => {
      active = false;
    };
  }, [center, dropPosition, isLoaded]);

  if (!HAS_VALID_GOOGLE_MAPS_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
        <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
          <p className="text-[12px] font-bold text-slate-900">Google Maps key missing</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
        <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
          <p className="text-[12px] font-bold text-slate-900">Google Maps failed to load</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">Check the browser key restrictions and reload.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-200">
        <div className="flex items-center gap-2 rounded-[16px] bg-white/90 px-4 py-3 shadow-sm">
          <LoaderCircle size={18} className="animate-spin text-slate-500" />
          <span className="text-[12px] font-bold text-slate-700">Loading map</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={13}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          gestureHandling: 'greedy',
          styles: RAPIDO_MAP_STYLE,
        }}
      >
        <MarkerF
          position={center}
          title="Pickup"
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: '#f8e001',
            fillOpacity: 1,
            strokeColor: '#111827',
            strokeWeight: 2,
            scale: 8,
          }}
        />
        {dropPosition && (
          <MarkerF
            position={dropPosition}
            title="Drop"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#fb923c',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 7,
            }}
          />
        )}
        {routePath.length > 1 && (
          <PolylineF
            path={routePath}
            options={{
              strokeColor: '#111827',
              strokeOpacity: 0.85,
              strokeWeight: 4,
            }}
          />
        )}
        {drivers.slice(0, 8).map((driver, index) => {
          const position = getDriverPosition(driver);

          if (!position) {
            return null;
          }

          return (
            <MarkerF
              key={driver.id || driver._id || index}
              position={position}
              title={`${driver.name || 'Driver'} - ${driver.vehicleNumber || selectedVehicle?.name || 'Vehicle'}`}
              icon={{
                url: selectedVehicle?.icon || '/4_Taxi.png',
                scaledSize: new window.google.maps.Size(28, 28),
              }}
            />
          );
        })}
      </GoogleMap>

      <div className="pointer-events-none absolute bottom-24 left-4 rounded-[12px] border border-white/70 bg-white/90 px-3 py-2 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup</p>
        <p className="text-[11px] font-bold text-slate-800">{center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>
      </div>
      {routeError && (
        <div className="pointer-events-none absolute bottom-10 left-4 rounded-[12px] border border-amber-100 bg-white/90 px-3 py-2 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Route</p>
          <p className="text-[11px] font-bold text-slate-700">Using fallback path while directions load.</p>
        </div>
      )}
    </div>
  );
};

const unwrap = (response) => response?.data?.data || response?.data || response;
const DEFAULT_AVAILABILITY = {
  drivers: [],
  totalDrivers: 0,
  closestDriverDistanceMeters: null,
  closestDriverEtaMinutes: null,
};

const getVehicleTypes = (response) => {
  const data = unwrap(response);
  return data?.vehicle_types || data?.results || (Array.isArray(data) ? data : []);
};

const getTypeLabel = (type) => type?.name || type?.vehicle_type || type?.label || 'Vehicle';

const getIconValue = (type) => String(type?.icon_types || type?.vehicleIconType || type?.name || '').toLowerCase();

const getVehicleIcon = (type) => {
  const value = getIconValue(type);

  if (value.includes('bike')) {
    return BikeIcon;
  }

  if (value.includes('auto')) {
    return AutoIcon;
  }

  if (value.includes('ehc')) {
    return EhcvIcon;
  }

  if (value.includes('hcv')) {
    return HcvIcon;
  }

  if (value.includes('lcv')) {
    return LcvIcon;
  }

  if (value.includes('mcv')) {
    return McvIcon;
  }

  if (value.includes('truck')) {
    return TruckIcon;
  }

  if (value.includes('lux')) {
    return LuxuryIcon;
  }

  if (value.includes('premium')) {
    return PremiumIcon;
  }

  if (value.includes('suv')) {
    return SuvIcon;
  }

  return CarIcon;
};

const getCapacity = (type) => {
  const value = getIconValue(type);

  if (value.includes('bike')) {
    return 1;
  }

  if (value.includes('auto')) {
    return 3;
  }

  if (value.includes('suv')) {
    return 6;
  }

  return 4;
};

const getParcelCapacity = (type) => {
  const value = getIconValue(type);
  const label = getTypeLabel(type).toLowerCase();

  if (value.includes('bike') || label.includes('bike') || label.includes('two wheeler') || label.includes('scooter')) {
    return 20;
  }
  if (value.includes('auto') || label.includes('auto') || label.includes('three wheeler') || label.includes('rickshaw')) {
    return 50;
  }
  if (value.includes('lcv') || label.includes('lcv') || label.includes('ace') || label.includes('mini truck') || label.includes('chota hathi')) {
    return 750;
  }
  if (value.includes('mcv') || label.includes('mcv') || label.includes('truck')) {
    return 1500;
  }
  if (value.includes('hcv') || value.includes('ehc') || label.includes('heavy')) {
    return 3000;
  }
  if (value.includes('suv') || label.includes('suv')) {
    return 150;
  }
  return 50;
};

const getParcelSublabel = (type) => {
  const value = getIconValue(type);
  const label = getTypeLabel(type).toLowerCase();
  const desc = type?.short_description || type?.description;
  if (desc && desc.trim().length > 3 && !desc.toLowerCase().includes('ride') && !desc.toLowerCase().includes('passenger')) {
    return desc;
  }
  if (value.includes('bike') || label.includes('bike') || label.includes('scooter')) {
    return 'Small parcels, documents, keys & food';
  }
  if (value.includes('auto') || label.includes('auto') || label.includes('rickshaw')) {
    return 'Medium packages, boxes & fragile goods';
  }
  if (value.includes('lcv') || label.includes('lcv') || label.includes('ace') || label.includes('mini truck')) {
    return 'Heavy goods, furniture & appliances';
  }
  if (value.includes('truck') || value.includes('mcv') || value.includes('hcv')) {
    return 'Large commercial & industrial cargo';
  }
  return 'Fast & secure door-to-door courier delivery';
};

const AVERAGE_CITY_SPEED_KMPH = 24;

const calculateDistanceMeters = (fromCoords = [], toCoords = []) => {
  const [fromLng, fromLat] = fromCoords;
  const [toLng, toLat] = toCoords;

  if (![fromLng, fromLat, toLng, toLat].every((value) => Number.isFinite(Number(value)))) {
    return 0;
  }

  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
};

const estimateDurationMinutes = (distanceMeters = 0) => {
  if (!Number.isFinite(Number(distanceMeters)) || Number(distanceMeters) <= 0) {
    return 0;
  }

  const metersPerMinute = (AVERAGE_CITY_SPEED_KMPH * 1000) / 60;
  return Math.max(1, Math.round(Number(distanceMeters) / metersPerMinute));
};

const getFallbackVehicleEstimate = (type) => {
  const value = getIconValue(type);
  const label = getTypeLabel(type).toLowerCase();

  if (value.includes('bike') || label.includes('bike')) {
    return 22;
  }

  if (value.includes('auto') || label.includes('auto')) {
    return 40;
  }

  if (value.includes('premium') || value.includes('lux') || label.includes('premium') || label.includes('lux')) {
    return 130;
  }

  if (value.includes('suv') || label.includes('suv')) {
    return 150;
  }

  return 106;
};

const getSetPriceRows = (response) => {
  const data = unwrap(response);
  return data?.paginator?.data || data?.results || [];
};

const normalizeId = (value) => String(value?._id || value?.id || value || '').trim();

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const findBestPricingRule = ({ rules, vehicleTypeId, serviceLocationId, isParcel }) => {
  const normalizedVehicleTypeId = normalizeId(vehicleTypeId);
  const normalizedServiceLocationId = normalizeId(serviceLocationId);

  const candidates = rules.filter((rule) => {
    const matchesVehicle = normalizeId(rule?.vehicle_type?._id || rule?.vehicle_type || rule?.type_id) === normalizedVehicleTypeId;
    const isActive = Number(rule?.active ?? 1) === 1 && String(rule?.status || 'active').toLowerCase() !== 'inactive';
    const transportType = String(rule?.transport_type || 'taxi').toLowerCase();
    
    const isMatchedType = isParcel
      ? (transportType === 'delivery' || transportType === 'both' || transportType === 'all')
      : (transportType === 'taxi' || transportType === 'both' || transportType === 'all');

    return matchesVehicle && isActive && isMatchedType;
  });

  if (!candidates.length) {
    return null;
  }

  const exactServiceLocation = candidates.find(
    (rule) => normalizedServiceLocationId && normalizeId(rule?.service_location_id?._id || rule?.service_location_id) === normalizedServiceLocationId,
  );

  return exactServiceLocation || candidates[0];
};

const calculateEstimatedFare = ({ vehicle, pricingRule, distanceMeters, durationMinutes, isParcel, weightLabel }) => {
  const fallbackFare = getFallbackVehicleEstimate(vehicle?.raw || vehicle);

  if (!pricingRule) {
    return fallbackFare;
  }

  if (isParcel) {
    const weightRule = Array.isArray(pricingRule.parcel_weight_ranges) && pricingRule.parcel_weight_ranges.find(
      (r) => String(r.weight_range).trim().toLowerCase() === String(weightLabel || 'Under 5kg').trim().toLowerCase()
    );

    if (weightRule) {
      const distanceKm = Math.max(0, Number(distanceMeters || 0) / 1000);
      const basePrice = toFiniteNumber(weightRule.base_price, 0);
      const baseDistance = Math.max(0, toFiniteNumber(weightRule.base_distance, 0));
      const pricePerDistance = toFiniteNumber(weightRule.price_per_distance, 0);
      const serviceTax = toFiniteNumber(pricingRule.service_tax, 0);
      const extraDistanceKm = Math.max(0, distanceKm - baseDistance);
      const subtotal = basePrice + (extraDistanceKm * pricePerDistance);

      if (subtotal <= 0) {
        return fallbackFare;
      }

      const total = subtotal + (subtotal * serviceTax) / 100;
      return Math.max(0, Math.round(total));
    }
  }

  const distanceKm = Math.max(0, Number(distanceMeters || 0) / 1000);
  const basePrice = toFiniteNumber(pricingRule.base_price, 0);
  const baseDistance = Math.max(0, toFiniteNumber(pricingRule.base_distance, 0));
  const pricePerDistance = toFiniteNumber(pricingRule.price_per_distance, 0);
  const timePrice = toFiniteNumber(pricingRule.time_price, 0);
  const serviceTax = toFiniteNumber(pricingRule.service_tax, 0);
  const extraDistanceKm = Math.max(0, distanceKm - baseDistance);
  const subtotal = basePrice + (extraDistanceKm * pricePerDistance) + (Math.max(0, Number(durationMinutes || 0)) * timePrice);

  if (subtotal <= 0) {
    return fallbackFare;
  }

  const total = subtotal + (subtotal * serviceTax) / 100;
  return Math.max(0, Math.round(total));
};

const getDropTime = (minutesAway = 0) => {
  const safeMinutes = Math.max(6, Number(minutesAway) || 0);
  const date = new Date(Date.now() + safeMinutes * 60 * 1000);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDistanceLabel = (distanceMeters) => {
  if (!Number.isFinite(Number(distanceMeters))) {
    return 'No distance yet';
  }

  const meters = Number(distanceMeters);

  if (meters < 1000) {
    return `${Math.max(50, Math.round(meters / 10) * 10)} m`;
  }

  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
};

const formatCurrency = (amount) => `₹${Math.round(Number(amount) || 0)}`;

const formatAvailabilityLine = (availability) => {
  if (!availability?.totalDrivers) {
    return 'Not available right now';
  }

  const etaMinutes = availability.closestDriverEtaMinutes || 1;
  const dropTime = getDropTime(etaMinutes + 10);
  return `Closest driver ${formatDistanceLabel(availability.closestDriverDistanceMeters)} away - ${etaMinutes} mins away - Drop ${dropTime}`;
};

const getAvailabilityBadge = (availability) => {
  if (!availability?.totalDrivers) {
    return 'NOT AVAILABLE';
  }

  if ((availability.closestDriverEtaMinutes || Number.POSITIVE_INFINITY) <= 2) {
    return 'FASTEST';
  }

  if (availability.totalDrivers >= 5) {
    return 'POPULAR';
  }

  return null;
};

const getAvailabilitySortRank = (vehicle, availabilityByVehicleId) => {
  if (!Object.prototype.hasOwnProperty.call(availabilityByVehicleId, vehicle.id)) {
    return 1;
  }

  const availability = availabilityByVehicleId[vehicle.id] || DEFAULT_AVAILABILITY;
  return availability.totalDrivers > 0 ? 0 : 2;
};

const normalizeVehicleType = (type, index) => {
  const id = String(type?._id || type?.id || type?.name || index);

  return {
    id,
    vehicleTypeId: type?._id || type?.id || '',
    iconType: type?.icon_types || 'car',
    icon: getVehicleIcon(type),
    name: getTypeLabel(type),
    capacity: getCapacity(type),
    parcelCapacity: getParcelCapacity(type),
    parcelSublabel: getParcelSublabel(type),
    badge: null,
    badgeColor: 'bg-orange-50 text-orange-500 border-orange-100',
    sublabel: type?.short_description || type?.description || 'Available ride',
    price: getFallbackVehicleEstimate(type),
    raw: type,
  };
};

const ScrollIndicator = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="pointer-events-none absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center"
      >
        <div className="flex h-6 w-6 animate-bounce items-center justify-center rounded-full border border-slate-100 bg-white/95 text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <ChevronDown size={14} strokeWidth={3} />
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const SelectVehicle = () => {
  const [vehicles, setVehicles] = useState([]);
  const [availabilityByVehicleId, setAvailabilityByVehicleId] = useState({});
  const [selected, setSelected] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState('');
  const [driverLoadError, setDriverLoadError] = useState('');
  const [pricingRules, setPricingRules] = useState([]);
  const [tripMetrics, setTripMetrics] = useState({ distanceMeters: 0, durationMinutes: 0 });
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = React.useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state || {};
  const pickup = routeState.pickup || 'Pipaliyahana, Indore';
  const drop = routeState.drop || 'Vijay Nagar, Indore';
  const pickupCoords = useMemo(() => routeState.pickupCoords || [75.9048, 22.7039], [routeState.pickupCoords]);
  const dropCoords = useMemo(() => routeState.dropCoords || [75.8937, 22.7533], [routeState.dropCoords]);
  const stops = routeState.stops || [];
  const serviceLocationId = routeState.service_location_id || routeState.serviceLocationId || '';
  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';
  const pickupPosition = useMemo(() => toLatLng(pickupCoords), [pickupCoords]);
  const dropPosition = useMemo(() => toLatLng(dropCoords, null), [dropCoords]);
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useAppGoogleMapsLoader();

  const isParcel = Boolean(routeState.isParcel);
  const weightLabel = routeState.parcel?.weight || routeState.weight || 'Under 5kg';

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const hasMore = scrollTop + clientHeight < scrollHeight - 8;
    setShowScrollArrow(hasMore);
  };

  useEffect(() => {
    // Check scroll state when vehicles are loaded or trip metrics change
    const timer = setTimeout(handleScroll, 200);
    return () => clearTimeout(timer);
  }, [vehicles, tripMetrics]);

  useEffect(() => {
    let active = true;

    const loadVehicleTypes = async () => {
      setIsLoadingVehicles(true);
      setVehicleLoadError('');

      try {
        const response = await api.get('/users/vehicle-types');

        if (!active) {
          return;
        }

        const rawTypes = getVehicleTypes(response);

        const activeTypes = rawTypes.filter((type) => type.active !== false && Number(type.status ?? 1) !== 0);

        let filteredTypes = activeTypes.filter((type) => {
          const tType = String(type.transport_type || 'taxi').toLowerCase();
          if (isParcel) {
            const nameStr = `${type.name || ''} ${type.vehicle_type || ''} ${type.icon_types || ''} ${type.short_description || ''}`.toLowerCase();
            const isDeliveryType = tType === 'delivery' || tType === 'both' || tType === 'all' || tType === 'parcel' || tType === 'courier';
            const isCargoVehicle = nameStr.includes('bike') || nameStr.includes('auto') || nameStr.includes('scooter') || nameStr.includes('truck') || nameStr.includes('lcv') || nameStr.includes('ace') || nameStr.includes('delivery') || nameStr.includes('parcel') || nameStr.includes('courier') || nameStr.includes('van') || nameStr.includes('carrier') || nameStr.includes('goods') || nameStr.includes('tata');
            return isDeliveryType || isCargoVehicle;
          }
          return tType === 'taxi' || tType === 'both' || tType === 'all';
        });

        if (isParcel && filteredTypes.length === 0) {
          console.log('No explicit delivery vehicles found, falling back to all active vehicle types for parcel service.');
          filteredTypes = activeTypes;
        } else if (!isParcel && filteredTypes.length === 0) {
          filteredTypes = activeTypes;
        }

        const nextVehicles = filteredTypes.map(normalizeVehicleType);

        setVehicles(nextVehicles);
        setSelected((current) => current || nextVehicles[0]?.id || '');
      } catch (error) {
        if (active) {
          setVehicleLoadError(error.message || 'Could not load vehicle types.');
        }
      } finally {
        if (active) {
          setIsLoadingVehicles(false);
        }
      }
    };

    loadVehicleTypes();

    return () => {
      active = false;
    };
  }, [isParcel]);

  useEffect(() => {
    let active = true;

    const loadPricingRules = async () => {
      try {
        const response = await api.get('/users/set-prices');

        if (!active) {
          return;
        }

        setPricingRules(getSetPriceRows(response));
      } catch {
        if (active) {
          setPricingRules([]);
        }
      }
    };

    loadPricingRules();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fallbackDistanceMeters = calculateDistanceMeters(pickupCoords, dropCoords);
    const fallbackDurationMinutes = estimateDurationMinutes(fallbackDistanceMeters);

    if (!dropPosition) {
      setTripMetrics({
        distanceMeters: fallbackDistanceMeters,
        durationMinutes: fallbackDurationMinutes,
      });
      return;
    }

    if (!isMapLoaded || !window.google?.maps?.DirectionsService) {
      setTripMetrics({
        distanceMeters: fallbackDistanceMeters,
        durationMinutes: fallbackDurationMinutes,
      });
      return;
    }

    let active = true;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: pickupPosition,
        destination: dropPosition,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (!active) {
          return;
        }

        const leg = result?.routes?.[0]?.legs?.[0];
        const distanceMeters = toFiniteNumber(leg?.distance?.value, fallbackDistanceMeters);
        const durationMinutes = Math.max(
          1,
          Math.round(toFiniteNumber(leg?.duration?.value, fallbackDurationMinutes * 60) / 60),
        );

        if (status === 'OK' && leg) {
          setTripMetrics({ distanceMeters, durationMinutes });
          return;
        }

        setTripMetrics({
          distanceMeters: fallbackDistanceMeters,
          durationMinutes: fallbackDurationMinutes,
        });
      },
    );

    return () => {
      active = false;
    };
  }, [dropCoords, dropPosition, isMapLoaded, pickupCoords, pickupPosition]);

  // Debug state logging removed to prevent console spam

  const pricedVehicles = useMemo(
    () =>
      vehicles.map((vehicle) => {
        const pricingRule = findBestPricingRule({
          rules: pricingRules,
          vehicleTypeId: vehicle.vehicleTypeId,
          serviceLocationId,
          isParcel,
        });

        const estimatedPrice = calculateEstimatedFare({
          vehicle,
          pricingRule,
          distanceMeters: tripMetrics.distanceMeters,
          durationMinutes: tripMetrics.durationMinutes,
          isParcel,
          weightLabel,
        });

        return {
          ...vehicle,
          pricingRule,
          price: estimatedPrice,
        };
      }),
    [pricingRules, serviceLocationId, tripMetrics.distanceMeters, tripMetrics.durationMinutes, vehicles, isParcel, weightLabel],
  );

  const selectedVehicle = useMemo(() => pricedVehicles.find((v) => v.id === selected), [pricedVehicles, selected]);
  const selectedAvailability = selectedVehicle ? (availabilityByVehicleId[selectedVehicle.id] || DEFAULT_AVAILABILITY) : DEFAULT_AVAILABILITY;
  const onlineDrivers = selectedAvailability.drivers || [];
  const sortedPricedVehicles = useMemo(
    () =>
      pricedVehicles
        .map((vehicle, index) => ({ ...vehicle, originalIndex: index }))
        .sort((first, second) => {
          const rankDiff =
            getAvailabilitySortRank(first, availabilityByVehicleId) -
            getAvailabilitySortRank(second, availabilityByVehicleId);

          if (rankDiff !== 0) {
            return rankDiff;
          }

          const firstAvailability = availabilityByVehicleId[first.id] || DEFAULT_AVAILABILITY;
          const secondAvailability = availabilityByVehicleId[second.id] || DEFAULT_AVAILABILITY;
          const driverCountDiff = (secondAvailability.totalDrivers || 0) - (firstAvailability.totalDrivers || 0);

          if (driverCountDiff !== 0) {
            return driverCountDiff;
          }

          return first.originalIndex - second.originalIndex;
        }),
    [availabilityByVehicleId, pricedVehicles],
  );

  useEffect(() => {
    let active = true;

    const fetchAvailability = async (vehicle) => {
      const response = await api.get('/rides/available-drivers', {
        params: {
          vehicleTypeId: vehicle.vehicleTypeId,
          vehicleIconType: vehicle.iconType,
          lng: pickupCoords[0],
          lat: pickupCoords[1],
        },
      });

      return [vehicle.id, { ...DEFAULT_AVAILABILITY, ...unwrap(response) }];
    };

    const loadOnlineDrivers = async () => {
      const candidates = vehicles.filter((vehicle) => vehicle.vehicleTypeId);

      if (!candidates.length) {
        setAvailabilityByVehicleId({});
        setIsLoadingDrivers(false);
        return;
      }

      setIsLoadingDrivers(true);
      setDriverLoadError('');

      const preferredVehicle =
        candidates.find((vehicle) => vehicle.id === selected) ||
        candidates[0];

      try {
        const responses = await Promise.all(candidates.map(fetchAvailability));

        if (active) {
          setAvailabilityByVehicleId((current) => ({
            ...current,
            ...Object.fromEntries(responses),
          }));
          setIsLoadingDrivers(false);
        }
      } catch (error) {
        if (active) {
          setAvailabilityByVehicleId({});
          setDriverLoadError(error.message || 'Could not load online drivers.');
          setIsLoadingDrivers(false);
        }
      }
    };

    loadOnlineDrivers();

    return () => {
      active = false;
    };
  }, [pickupCoords[0], pickupCoords[1], vehicles]);

  useEffect(() => {
    const firstAvailableVehicle = sortedPricedVehicles.find((vehicle) => {
      const availability = availabilityByVehicleId[vehicle.id];
      return availability?.totalDrivers > 0;
    });

    if (!firstAvailableVehicle) {
      return;
    }

    const selectedHasDrivers = (availabilityByVehicleId[selected]?.totalDrivers || 0) > 0;

    if (!selectedHasDrivers) {
      setSelected(firstAvailableVehicle.id);
    }
  }, [availabilityByVehicleId, selected, sortedPricedVehicles]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleBook = async () => {
    if (!selectedVehicle) {
      return;
    }

    const isOnline = paymentMethod.toLowerCase() === 'online';
    const targetPath = isParcel
      ? `${routePrefix}/parcel/searching`
      : `${routePrefix}/ride/searching`;

    const nextState = {
      ...routeState,
      pickup,
      drop,
      pickupCoords,
      dropCoords,
      stops,
      vehicle: selectedVehicle,
      vehicleTypeId: selectedVehicle.vehicleTypeId,
      vehicleIconType: selectedVehicle.iconType,
      paymentMethod: paymentMethod.toLowerCase(),
      fare: selectedVehicle.price,
      estimatedDistanceMeters: tripMetrics.distanceMeters,
      estimatedDurationMinutes: tripMetrics.durationMinutes,
    };

    if (isOnline) {
      setIsProcessingPayment(true);
      setPaymentError('');
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Razorpay SDK failed to load');
        }

        let userToken = getLocalUserToken();
        if (!userToken) {
          const loginResponse = await userAuthService.loginDemoUser();
          const loginPayload = unwrapLoginPayload(loginResponse);
          if (loginPayload?.token) {
            userToken = loginPayload.token;
            localStorage.setItem('token', userToken);
            localStorage.setItem('userToken', userToken);
            localStorage.setItem('role', 'user');
            localStorage.setItem('userInfo', JSON.stringify(loginPayload.user || {}));
          }
        }

        const requestConfig = userToken ? { headers: { Authorization: `Bearer ${userToken}` } } : {};

        // 1. Create the ride or delivery record first on the backend in pending payment status
        let response;
        if (isParcel) {
          const parcelPayload = {
            ...(routeState.parcel || {}),
            category: routeState.parcel?.category || routeState.parcelType || 'Parcel',
            weight: routeState.parcel?.weight || routeState.weight || 'Under 5kg',
            description: routeState.parcel?.description || routeState.description || '',
            deliveryScope: routeState.parcel?.deliveryScope || routeState.deliveryScope || 'city',
            isOutstation: Boolean(routeState.parcel?.isOutstation || routeState.isOutstation || routeState.deliveryScope === 'outstation'),
            senderName: routeState.parcel?.senderName || routeState.senderName || '',
            senderMobile: routeState.parcel?.senderMobile || routeState.senderMobile || '',
            receiverName: routeState.parcel?.receiverName || routeState.receiverName || '',
            receiverMobile: routeState.parcel?.receiverMobile || routeState.receiverMobile || '',
            goodsTypeFor: routeState.parcel?.goodsTypeFor || 'both',
          };

          response = await api.post('/deliveries', {
            pickup: pickupCoords,
            drop: dropCoords,
            pickupAddress: pickup,
            dropAddress: drop,
            fare: selectedVehicle.price,
            vehicleTypeId: selectedVehicle.vehicleTypeId,
            vehicleTypeIds: [selectedVehicle.vehicleTypeId],
            vehicleIconType: selectedVehicle.iconType || 'bike',
            paymentMethod: 'online',
            type: 'parcel',
            parcel: parcelPayload,
            otp: String(Math.floor(1000 + Math.random() * 9000)),
          }, requestConfig);
        } else {
          response = await api.post('/rides', {
            pickup: pickupCoords,
            drop: dropCoords,
            pickupAddress: pickup,
            dropAddress: drop,
            fare: selectedVehicle.price,
            estimatedDistanceMeters: tripMetrics.distanceMeters,
            estimatedDurationMinutes: tripMetrics.durationMinutes,
            vehicleTypeId: selectedVehicle.vehicleTypeId,
            vehicleIconType: selectedVehicle.iconType || 'car',
            paymentMethod: 'online',
            otp: String(Math.floor(1000 + Math.random() * 9000)),
          }, requestConfig);
        }

        const payload = response?.data?.data || response?.data || response;
        const createdRideId = payload?.rideId || payload?.realtime?.rideId || payload?.ride?._id || payload?._id || payload?.id;

        if (!createdRideId) {
          throw new Error('Could not initialize booking record');
        }

        // 2. Create Razorpay order for this ride
        const orderResponse = await api.post(`/rides/${createdRideId}/razorpay/order`, {}, requestConfig);
        const order = orderResponse?.data?.data || orderResponse?.data || orderResponse;

        if (!order.keyId || !order.orderId) {
          throw new Error('Unable to start online payment transaction');
        }

        let userInfo = {};
        try {
          userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        } catch {
          userInfo = {};
        }

        // 3. Launch Razorpay Checkout Modal
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Ozayra',
          description: isParcel ? 'Parcel Booking Payment' : 'Taxi Booking Payment',
          order_id: order.orderId,
          prefill: {
            name: userInfo?.name || '',
            email: userInfo?.email || '',
            contact: userInfo?.phone ? `+91${userInfo.phone}` : '',
          },
          modal: {
            ondismiss: () => {
              setIsProcessingPayment(false);
            },
          },
          handler: async (paymentResponse) => {
            try {
              // 4. Verify payment on successful response
              await api.post(`/rides/${createdRideId}/razorpay/verify`, {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }, requestConfig);

              setIsProcessingPayment(false);
              // Navigate to searching page with verified rideId
              navigate(targetPath, {
                state: {
                  ...nextState,
                  rideId: createdRideId,
                },
              });
            } catch (verifyError) {
              setPaymentError(verifyError?.message || 'Payment verification failed');
              setIsProcessingPayment(false);
            }
          },
          theme: {
            color: '#FACC15',
          },
        });

        rzp.open();
      } catch (paymentErr) {
        setPaymentError(paymentErr?.message || 'Online payment initialization failed.');
        setIsProcessingPayment(false);
      }
    } else {
      navigate(targetPath, {
        state: nextState,
      });
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 max-w-lg mx-auto relative font-['Plus_Jakarta_Sans'] overflow-hidden">
      <div className="absolute inset-0 w-full bg-gray-200">
        <VehicleMapPreview
          center={pickupPosition}
          dropPosition={dropPosition}
          drivers={onlineDrivers}
          selectedVehicle={selectedVehicle}
          isLoaded={isMapLoaded}
          loadError={mapLoadError}
        />

        <div className="absolute top-10 left-4 right-4 z-20 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/95 rounded-[14px] shadow-[0_4px_14px_rgba(15,23,42,0.12)] flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
            </motion.button>
            
            {isParcel ? (
              <div className="flex-1 min-w-0 bg-white/95 backdrop-blur-md rounded-[16px] px-3.5 py-2.5 shadow-[0_6px_20px_rgba(15,23,42,0.12)] border border-yellow-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
                    <Package size={17} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-800 bg-yellow-100/80 px-1.5 py-0.5 rounded">
                        {routeState.parcel?.category || routeState.parcelType || 'Parcel Delivery'}
                      </span>
                      <span className="text-[10px] font-normal text-slate-400">•</span>
                      <span className="text-[11px] font-medium text-slate-700">{weightLabel}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-800 truncate mt-0.5">
                      To: {drop}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${routePrefix}/parcel/sender-receiver-details`, {
                      state: routeState,
                    })
                  }
                  className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  title="Edit Parcel Details"
                >
                  <X size={15} className="shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0 bg-white/95 rounded-[14px] px-4 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.10)] flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-800 truncate flex-1">{drop}</span>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${routePrefix}/ride/select-location`, {
                      state: {
                        pickup,
                        drop,
                        pickupCoords,
                        dropCoords,
                        stops,
                      },
                    })
                  }
                  className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Change destination"
                >
                  <X size={15} className="shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showPromo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`absolute bottom-20 left-4 right-4 bg-white/95 backdrop-blur-md border rounded-[18px] flex items-center overflow-hidden z-30 shadow-[0_8px_24px_rgba(15,23,42,0.10)] pr-3 ${
                isParcel ? 'border-yellow-200/80' : 'border-white/80'
              }`}
            >
              <div className="flex-1 px-4 py-3">
                {isParcel ? (
                  <>
                    <p className="text-[12px] font-semibold text-slate-900 leading-tight">Need fast door-to-door courier?</p>
                    <p className="text-[10px] font-semibold text-yellow-600 mt-0.5 uppercase tracking-wider">Use PARCEL20 for 20% OFF delivery</p>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] font-bold text-slate-900 leading-tight">Going a few kms away?</p>
                    <p className="text-[10px] font-semibold text-orange-500 mt-0.5 uppercase tracking-wider">Use GOFREE on 1st cab ride</p>
                  </>
                )}
              </div>
              {isParcel ? (
                <div className="h-12 w-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-[12px] shrink-0 flex items-center justify-center text-gray-900 shadow-sm mr-1">
                  <Package size={24} strokeWidth={2.2} />
                </div>
              ) : (
                <img src="/ride_now_banner.png" className="h-12 w-16 object-cover rounded-[10px] shrink-0" alt="Promo" />
              )}
              <button onClick={() => setShowPromo(false)} className="ml-2 pl-2 border-l border-slate-100">
                <X size={13} className="text-slate-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute left-4 right-4 bottom-4 z-20 flex items-center justify-between gap-3">
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-[0_8px_32px_rgba(15,23,42,0.12)] border ${isParcel ? 'border-yellow-200' : 'border-white/80'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {isParcel ? 'Delivery Fleet Nearby' : 'Drivers Nearby'}
            </p>
            <p className={`text-[16px] font-semibold leading-none mt-1 ${isParcel ? 'text-yellow-700' : 'text-slate-900'}`}>
              {isLoadingDrivers ? '...' : `${selectedAvailability.totalDrivers || 0} ${isParcel ? 'active partners' : 'online'}`}
            </p>
          </div>
          {driverLoadError && (
            <div className="bg-red-50/95 rounded-[14px] px-3 py-2 border border-red-100 max-w-[190px]">
              <p className="text-[10px] font-bold text-red-500 leading-tight">{driverLoadError}</p>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          height: isExpanded ? '92dvh' : '54dvh',
          transition: 'height 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className="absolute bottom-0 left-0 right-0 z-40 flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_44px_rgba(15,23,42,0.15)]"
      >
        {/* Drag pill — tap to expand, tap again to collapse */}
        <div
          className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0 cursor-pointer active:bg-slate-400 transition-colors"
          onClick={() => {
            setIsExpanded((prev) => !prev);
            if (isExpanded && scrollRef.current) {
              scrollRef.current.scrollTop = 0;
            }
          }}
        />

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ maxHeight: isExpanded ? 'calc(92dvh - 120px)' : 'calc(54dvh - 120px)' }}
            className="h-full overflow-y-auto no-scrollbar px-4 pt-2 pb-2 space-y-2"
          >
            {isLoadingVehicles && (
              <div className="min-h-[180px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <LoaderCircle size={26} className="animate-spin" />
                <p className="text-[11px] font-bold uppercase tracking-widest">
                  {isParcel ? 'Finding available delivery options' : 'Finding available rides'}
                </p>
              </div>
            )}

            {!isLoadingVehicles && vehicleLoadError && (
              <div className="bg-white border border-red-50 rounded-[18px] px-4 py-5 text-center">
                <p className="text-[12px] font-black text-red-500">{vehicleLoadError}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Please try again later.</p>
              </div>
            )}

            {!isLoadingVehicles && !vehicleLoadError && sortedPricedVehicles.length === 0 && (
              <div className="bg-white border border-slate-50 rounded-[18px] px-4 py-5 text-center">
                <p className="text-[13px] font-bold text-slate-900">
                  {isParcel ? 'No Delivery Vehicles Available' : 'No vehicles available'}
                </p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Try changing your location or method.</p>
              </div>
            )}

          {!isLoadingVehicles && !vehicleLoadError && sortedPricedVehicles.map((v, i) => {
            const isSelected = selected === v.id;
            const availability = availabilityByVehicleId[v.id] || DEFAULT_AVAILABILITY;
            const badge = getAvailabilityBadge(availability) || v.badge;
            const isUnavailable = !availability.totalDrivers;            return (
              <motion.button
                key={v.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (!isUnavailable) {
                    setSelected(v.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[24px] border-2 transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? isParcel
                      ? 'bg-yellow-50/70 border-yellow-400 shadow-[0_12px_24px_-8px_rgba(250,204,21,0.25)]'
                      : 'bg-orange-50/50 border-orange-500 shadow-[0_12px_24px_-8px_rgba(249,115,22,0.22)]'
                    : isUnavailable
                      ? 'bg-slate-100/60 border-transparent opacity-60'
                      : 'bg-white border-slate-50 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:border-slate-200'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="selection-glow"
                    className={`absolute inset-0 bg-gradient-to-r ${isParcel ? 'from-yellow-50/0 via-yellow-50/30 to-yellow-50/0' : 'from-orange-50/0 via-orange-50/20 to-orange-50/0'} pointer-events-none`}
                  />
                )}

                <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isSelected ? (isParcel ? 'bg-yellow-400 text-gray-900 shadow-md scale-110' : 'bg-white shadow-sm scale-110') : isUnavailable ? 'bg-slate-200' : 'bg-slate-50'
                }`}>
                  <img src={getVehicleIcon(v)} alt={v.name} className="w-9 h-9 object-contain drop-shadow-sm" />
                </div>

                <div className="flex-1 min-w-0 z-10">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[13px] font-semibold leading-tight ${isUnavailable ? 'text-slate-500' : 'text-slate-900'}`}>
                      {v.name}
                    </span>
                    {isParcel ? (
                      <div className="flex items-center gap-1 text-yellow-800 bg-yellow-100 px-1.5 py-0.5 rounded-md">
                        <Package size={11} strokeWidth={2.2} />
                        <span className="text-[9px] font-semibold">Max {v.parcelCapacity || 50} kg</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-1 py-0.5 rounded-md">
                        <Users size={10} strokeWidth={3} />
                        <span className="text-[9px] font-bold">{v.capacity}</span>
                      </div>
                    )}
                    {badge && (
                      <span className={`text-[7px] font-bold px-1 py-0.5 rounded-md border uppercase tracking-tighter ${
                        isUnavailable 
                          ? 'bg-white text-slate-300 border-slate-100' 
                          : badge === 'FASTEST' 
                            ? isParcel ? 'bg-yellow-400 text-gray-900 border-yellow-500' : 'bg-orange-500 text-white border-orange-400' 
                            : isParcel ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-normal text-slate-400 leading-tight truncate max-w-[160px]">
                    {isParcel ? (v.parcelSublabel || 'Fast & secure parcel courier') : v.sublabel}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 border-t border-slate-50 pt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isUnavailable ? 'bg-slate-300' : isParcel ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                    <p className={`text-[9px] font-medium truncate flex-1 ${isUnavailable ? 'text-slate-400' : isParcel ? 'text-yellow-700 font-semibold' : 'text-slate-600'}`}>
                      {isUnavailable ? 'Currently Offline' : isParcel ? `Partner arrives in ${availability.closestDriverEtaMinutes || 2} mins • Doorstep Pickup` : formatAvailabilityLine(availability)}
                    </p>
                    {!isUnavailable && tripMetrics.distanceMeters > 0 && (
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter shrink-0 bg-slate-100 px-1 py-0.5 rounded">
                        {tripMetrics.durationMinutes || 1}m
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 z-10">
                  <div className="text-right">
                    <span className={`text-[15px] font-semibold tracking-tight block ${isUnavailable ? 'text-slate-300' : 'text-slate-900'}`}>
                      {isUnavailable ? 'N/A' : formatCurrency(v.price)}
                    </span>
                    {!isUnavailable && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter opacity-70">est.</span>}
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="check-icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${isParcel ? 'bg-yellow-400' : 'bg-orange-500'}`}
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke={isParcel ? '#111827' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
          </div>
          <ScrollIndicator show={showScrollArrow} />
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white/90 backdrop-blur-xl px-5 pb-6 pt-3.5 space-y-3 shadow-[0_-12px_40px_rgba(15,23,42,0.08)]">
          {/* Payment Method Toggle */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-[16px] p-1 border border-slate-100">
            {['Cash', 'Online'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[12px] text-[12px] font-semibold transition-all ${
                  paymentMethod === method
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
                    : 'text-slate-400'
                }`}
              >
                {method === 'Cash'
                  ? <Banknote size={14} strokeWidth={2} />
                  : <CreditCard size={14} strokeWidth={2} />}
                {method}
              </button>
            ))}
          </div>

          {isParcel && selectedVehicle && (
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-yellow-50/80 border border-yellow-200 text-gray-900">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-yellow-600 shrink-0" strokeWidth={2.2} />
                <span className="text-[11px] font-semibold">Verified Delivery Partner & Safe Handling</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-yellow-400 px-2 py-0.5 rounded-md text-gray-900 shadow-2xs">Insured</span>
            </div>
          )}

          {paymentError && (
            <p className="text-center text-xs font-bold text-rose-500 py-1">{paymentError}</p>
          )}

          <motion.button
            whileHover={selectedVehicle && selectedAvailability.totalDrivers && !isProcessingPayment ? { scale: 1.01, translateY: -2 } : {}}
            whileTap={selectedVehicle && selectedAvailability.totalDrivers && !isProcessingPayment ? { scale: 0.98 } : undefined}
            disabled={!selectedVehicle || !selectedAvailability.totalDrivers || isProcessingPayment}
            onClick={handleBook}
            className={`w-full py-4 rounded-[20px] text-[15px] font-semibold shadow-xl transition-all duration-300 uppercase tracking-tight flex items-center justify-center gap-3 ${
              selectedVehicle && selectedAvailability.totalDrivers
                ? isProcessingPayment
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : isParcel
                    ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 shadow-[0_12px_28px_-4px_rgba(250,204,21,0.4)] active:scale-[0.99]'
                    : 'bg-[#f8e001] text-slate-900 shadow-[0_12px_28px_-4px_rgba(248,224,1,0.4)] active:shadow-none'
                : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
            }`}
          >
            {isProcessingPayment ? (
              <>
                <LoaderCircle size={18} className="animate-spin text-slate-500" />
                <span>Processing Payment...</span>
              </>
            ) : selectedVehicle ? (
              selectedAvailability.totalDrivers ? (
                <>
                  <span>{isParcel ? `Confirm ${selectedVehicle.name} Delivery` : `Book ${selectedVehicle.name}`}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${isParcel ? 'bg-gray-900/30' : 'bg-slate-900/20'}`} />
                  <span>{formatCurrency(selectedVehicle.price)}</span>
                </>
              ) : (
                `${selectedVehicle.name} Offline`
              )
            ) : isParcel ? (
              'Select Delivery Partner'
            ) : (
              'Select Vehicle'
            )}
          </motion.button>
        </div>
      </div>

    </div>
  );
};

export default SelectVehicle;
