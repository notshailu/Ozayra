import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, AlertTriangle, Shield, Star, ChevronLeft, Share2 } from 'lucide-react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader, RAPIDO_MAP_STYLE } from '../../../admin/utils/googleMaps';
import { socketService } from '../../../../shared/api/socket';
import api from '../../../../shared/api/axiosInstance';
import { clearCurrentRide, getCurrentRide, saveCurrentRide } from '../../services/currentRideService';
import carIcon from '../../../../assets/icons/car.png';
import bikeIcon from '../../../../assets/icons/bike.png';
import autoIcon from '../../../../assets/icons/auto.png';
import deliveryIcon from '../../../../assets/icons/Delivery.png';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'delivered']);
const ACTIVE_RIDE_VALIDATE_MS = 5000;
const COMPLETED_TRACKING_STATUSES = new Set(['completed', 'delivered']);

const toLatLng = (coords, fallback = DEFAULT_CENTER) => {
  const [lng, lat] = coords || [];

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  return fallback;
};

const arePositionsNearlyEqual = (first, second, threshold = 0.0002) => (
  Math.abs(Number(first?.lat ?? 0) - Number(second?.lat ?? 0)) < threshold &&
  Math.abs(Number(first?.lng ?? 0) - Number(second?.lng ?? 0)) < threshold
);

const createTrackingMarkerIcon = (iconUrl) => ({
  url: iconUrl,
  scaledSize: new window.google.maps.Size(44, 44),
  anchor: new window.google.maps.Point(22, 22),
});

const getTrackingVehicleIcon = (ride, driver) => {
  const serviceType = String(ride?.serviceType || ride?.type || '').toLowerCase();
  const iconType = String(ride?.vehicleIconType || driver?.vehicleIconType || driver?.vehicleType || '').toLowerCase();

  if (serviceType === 'parcel') return '/5_Parcel.png';
  if (iconType.includes('bike')) return '/1_Bike.png';
  if (iconType.includes('auto')) return '/2_AutoRickshaw.png';
  return '/4_Taxi.png';
};

const getInitials = (name = '') =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'DR';

const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;
const isLikelyVehiclePhoto = (value = '') => /^(https?:|data:image\/|blob:|\/uploads\/|\/images\/)/i.test(String(value || '').trim());

const RideTracking = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [shareToast, setShareToast] = useState(false);
  const [rideRealtime, setRideRealtime] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeError, setRouteError] = useState('');
  const [map, setMap] = useState(null);
  const lastFittedRouteSignatureRef = useRef('');
  const initialMapCenterRef = useRef(null);
  const [vehicleImageBroken, setVehicleImageBroken] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const storedRide = useMemo(() => getCurrentRide(), []);
  const state = useMemo(() => location.state || storedRide || {}, [location.state, storedRide]);
  const { isLoaded, loadError } = useAppGoogleMapsLoader();
  const routeHome = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '/';
  const routeComplete = location.pathname.startsWith('/taxi/user') ? '/taxi/user/ride/complete' : '/ride/complete';
  const latestDriverRef = useRef(null);

  const rideId = state.rideId || '';
  const otp = state.otp || '1234';
  const fare = state.fare || 22;
  const paymentMethod = state.paymentMethod || 'Cash';
  const fallbackDriver = useMemo(
    () => state.driver || { name: 'Captain', rating: '4.9', vehicle: 'Taxi', plate: 'Assigned', phone: '', profileImage: '', vehicleImage: '' },
    [state.driver],
  );
  const pickupLabel = rideRealtime?.pickup?.address || state.pickup || 'Pipaliyahana, Indore';
  const dropLabel = rideRealtime?.drop?.address || state.drop || 'Vijay Nagar, Indore';
  const pickupPosition = useMemo(
    () => toLatLng(rideRealtime?.pickup?.coordinates || state.pickupCoords || [75.9048, 22.7039]),
    [rideRealtime?.pickup?.coordinates, state.pickupCoords],
  );
  const dropPosition = useMemo(
    () => toLatLng(rideRealtime?.drop?.coordinates || state.dropCoords || [75.8937, 22.7533], pickupPosition),
    [pickupPosition, rideRealtime?.drop?.coordinates, state.dropCoords],
  );
  const driverPosition = useMemo(
    () => toLatLng(rideRealtime?.driverLocation?.coordinates, pickupPosition),
    [pickupPosition, rideRealtime?.driverLocation?.coordinates],
  );
  if (!initialMapCenterRef.current) {
    initialMapCenterRef.current = driverPosition;
  }
  const tripStatus = String(rideRealtime?.status || state.liveStatus || state.status || 'accepted').toLowerCase();
  const serviceType = String(state.serviceType || state.type || 'ride').toLowerCase();
  const activeDestination = useMemo(
    () => (tripStatus === 'started' ? dropPosition : pickupPosition),
    [dropPosition, pickupPosition, tripStatus],
  );
  const driver = rideRealtime?.driver || fallbackDriver;
  const vehicleIcon = getTrackingVehicleIcon(state, driver);
  const vehicleLabel = driver.vehicle || driver.vehicleType || (serviceType === 'parcel' ? 'Parcel' : 'Taxi');
  const driverImage = driver.profileImage || driver.profile_picture || driver.photo || driver.user?.profileImage || driver.user?.profile_picture || driver.user?.photo || driver.profilePic || 'https://randomuser.me/api/portraits/men/32.jpg';
  const vehicleImage = driver.vehicleImage || driver.vehicle_image || '';
  const hasVehiclePhoto = isLikelyVehiclePhoto(vehicleImage) && !vehicleImageBroken;
  const driverSubtitle = tripStatus === 'started'
    ? (serviceType === 'parcel' ? 'Parcel picked up' : 'Trip started')
    : serviceType === 'parcel'
      ? 'Delivery agent is on the way'
      : 'Captain is on the way';
  const vehicleDetails = [driver.vehicleColor, driver.vehicleMake, driver.vehicleModel].filter(Boolean).join(' ');
  const activeRideEndpoint = serviceType === 'parcel' ? '/deliveries/active/me' : '/rides/active/me';

  useEffect(() => {
    latestDriverRef.current = driver;
  }, [driver]);

  const handleCancelRide = async () => {
    try {
      if (rideId) {
        const payload = {};
        if (cancelReason || otherReason) {
           payload.reason = cancelReason || otherReason;
        }
        await api.patch(`/rides/${rideId}/cancel`, payload);
      }
    } catch (_error) {
      // If the ride has already advanced or ended, we still clear the local state below.
    } finally {
      clearCurrentRide();
      navigate('/taxi/user');
    }
  };

  useEffect(() => {
    setVehicleImageBroken(false);
  }, [vehicleImage]);

  const exitTracking = useCallback(
    () => {
      clearCurrentRide();
      navigate(routeHome, { replace: true });
    },
    [navigate, routeHome],
  );

  const completeTracking = useCallback(
    (statusValue = 'completed') => {
      clearCurrentRide();
      navigate(routeComplete, {
        replace: true,
        state: {
          ...state,
          rideId,
          fare,
          paymentMethod,
          pickup: pickupLabel,
          drop: dropLabel,
          driver,
          status: statusValue,
          liveStatus: statusValue,
          feedback: rideRealtime?.feedback || state.feedback || null,
          completedAt: rideRealtime?.completedAt || Date.now(),
        },
      });
    },
    [driver, dropLabel, fare, navigate, paymentMethod, pickupLabel, rideId, rideRealtime?.completedAt, rideRealtime?.feedback, routeComplete, state],
  );
  const completeTrackingRef = useRef(completeTracking);

  useEffect(() => {
    completeTrackingRef.current = completeTracking;
  }, [completeTracking]);

  useEffect(() => {
    let active = true;

    if (!rideId) {
      exitTracking();
      return () => {
        active = false;
      };
    }

    const validateActiveRide = async () => {
      const activePayload = unwrapApiPayload(await api.get(activeRideEndpoint));
      const activeRideId = String(activePayload?.rideId || '');
      const activeStatus = String(activePayload?.liveStatus || activePayload?.status || '').toLowerCase();

      if (COMPLETED_TRACKING_STATUSES.has(activeStatus)) {
        if (active) {
          completeTracking(activeStatus);
        }
        return false;
      }

      if (!activeRideId || activeRideId !== String(rideId) || TERMINAL_STATUSES.has(activeStatus)) {
        if (active) {
          exitTracking();
        }
        return false;
      }

      return true;
    };

    const hydrateRideState = async () => {
      try {
        const response = await api.get(`/rides/${rideId}`);
        const payload = unwrapApiPayload(response);
        const nextStatus = String(payload?.liveStatus || payload?.status || '').toLowerCase();

        if (!active) {
          return;
        }

        if (TERMINAL_STATUSES.has(nextStatus)) {
          if (COMPLETED_TRACKING_STATUSES.has(nextStatus)) {
            setRideRealtime({
              pickup: {
                coordinates: payload?.pickupLocation?.coordinates,
                address: payload?.pickupAddress || state.pickup || 'Pickup',
              },
              drop: {
                coordinates: payload?.dropLocation?.coordinates,
                address: payload?.dropAddress || state.drop || 'Drop',
              },
              driverLocation: payload?.lastDriverLocation
                ? { coordinates: payload.lastDriverLocation.coordinates }
                : null,
              status: nextStatus,
              completedAt: payload?.completedAt || null,
              feedback: payload?.feedback || null,
              driver: payload?.driver || fallbackDriver,
            });
            completeTracking(nextStatus);
            return;
          }
          exitTracking();
          return;
        }

        setRideRealtime({
          pickup: {
            coordinates: payload?.pickupLocation?.coordinates,
            address: payload?.pickupAddress || state.pickup || 'Pickup',
          },
          drop: {
            coordinates: payload?.dropLocation?.coordinates,
            address: payload?.dropAddress || state.drop || 'Drop',
          },
          driverLocation: payload?.lastDriverLocation
            ? {
                coordinates: payload.lastDriverLocation.coordinates,
                heading: payload.lastDriverLocation.heading,
              }
            : null,
          status: payload?.liveStatus || payload?.status || 'accepted',
          completedAt: payload?.completedAt || null,
          feedback: payload?.feedback || null,
          driver: payload?.driver || fallbackDriver,
        });

        saveCurrentRide({
          ...state,
          rideId,
          driver: payload?.driver || fallbackDriver,
          status: payload?.status || state.status || 'accepted',
          liveStatus: payload?.liveStatus || payload?.status || state.liveStatus || state.status || 'accepted',
        });
      } catch {
        await validateActiveRide().catch(() => {});
      }
    };

    hydrateRideState();
    const validationInterval = window.setInterval(() => {
      validateActiveRide().catch(() => {});
    }, ACTIVE_RIDE_VALIDATE_MS);

    return () => {
      active = false;
      window.clearInterval(validationInterval);
    };
  }, [activeRideEndpoint, rideId]); // Removed unstable dependencies (completeTracking, exitTracking, etc.) to stop infinite loop

  useEffect(() => {
    if (!TERMINAL_STATUSES.has(tripStatus)) {
      return;
    }

    if (COMPLETED_TRACKING_STATUSES.has(tripStatus)) {
      return;
    }

    clearCurrentRide();
    const timeoutId = window.setTimeout(() => {
      navigate(routeHome, { replace: true });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, routeHome, tripStatus]);

  useEffect(() => {
    if (!rideId) {
      return () => {};
    }

    const socket = socketService.connect({ role: 'user' });

    if (!socket) {
      return () => {};
    }

    const onRideState = (payload) => {
      if (!payload || String(payload.rideId || '') !== String(rideId)) {
        return;
      }

      setRideRealtime({
        pickup: {
          coordinates: payload.pickupLocation?.coordinates,
          address: payload.pickupAddress || state.pickup || 'Pickup',
        },
        drop: {
          coordinates: payload.dropLocation?.coordinates,
          address: payload.dropAddress || state.drop || 'Drop',
        },
        driverLocation: payload.lastDriverLocation
          ? {
              coordinates: payload.lastDriverLocation.coordinates,
              heading: payload.lastDriverLocation.heading,
            }
          : null,
        status: payload.liveStatus || payload.status || 'accepted',
        completedAt: payload.completedAt || null,
        feedback: payload.feedback || null,
        driver: payload.driver || fallbackDriver,
      });
    };

    const onLocationUpdated = (payload) => {
      if (!payload || String(payload.rideId || '') !== String(rideId)) {
        return;
      }

      setRideRealtime((prev) => ({
        ...(prev || {}),
        driverLocation: {
          coordinates: payload.coordinates,
        },
      }));
    };

    const onStatusUpdated = (payload) => {
      if (!payload || String(payload.rideId || '') !== String(rideId)) {
        return;
      }

      const nextStatus = payload.liveStatus || payload.status || 'accepted';
      const normalizedStatus = String(nextStatus).toLowerCase();

      if (COMPLETED_TRACKING_STATUSES.has(normalizedStatus)) {
        setRideRealtime((prev) => ({
          ...(prev || {}),
          status: normalizedStatus,
          completedAt: payload.completedAt || prev?.completedAt || null,
        }));
        completeTrackingRef.current(normalizedStatus);
        return;
      }

      if (normalizedStatus === 'cancelled') {
        clearCurrentRide();
      } else {
        saveCurrentRide({
          ...state,
          rideId,
          driver: latestDriverRef.current || fallbackDriver,
          status: nextStatus,
        });
      }

      setRideRealtime((prev) => ({
        ...(prev || {}),
        status: nextStatus,
        completedAt: payload.completedAt || prev?.completedAt || null,
      }));
    };

    socketService.on('ride:state', onRideState);
    socketService.on('ride:driver-location:updated', onLocationUpdated);
    socketService.on('ride:status:updated', onStatusUpdated);
    socketService.emit('ride:join', { rideId });

    return () => {
      socketService.off('ride:state', onRideState);
      socketService.off('ride:driver-location:updated', onLocationUpdated);
      socketService.off('ride:status:updated', onStatusUpdated);
    };
  }, [fallbackDriver, rideId, state, state.drop, state.pickup]);

  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.DirectionsService) {
      setRoutePath([driverPosition, activeDestination]);
      setRouteError('');
      return;
    }

    if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
      setRoutePath([driverPosition]);
      setRouteError('');
      return;
    }

    let active = true;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: driverPosition,
        destination: activeDestination,
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

        setRoutePath([driverPosition, activeDestination]);
        setRouteError(status || 'Directions unavailable');
      },
    );

    return () => {
      active = false;
    };
  }, [activeDestination, driverPosition, isLoaded]);

  useEffect(() => {
    if (!map || !window.google?.maps) {
      return;
    }

    if (routePath.length > 1) {
      const routeSignature = [
        routePath[routePath.length - 1]?.lat,
        routePath[routePath.length - 1]?.lng,
        activeDestination?.lat,
        activeDestination?.lng,
        tripStatus,
      ].join(':');

      if (lastFittedRouteSignatureRef.current === routeSignature) {
        return;
      }

      lastFittedRouteSignatureRef.current = routeSignature;
      const bounds = new window.google.maps.LatLngBounds();
      routePath.forEach((point) => bounds.extend(point));
      bounds.extend(driverPosition);
      bounds.extend(activeDestination);
      map.fitBounds(bounds, { top: 120, right: 48, bottom: 300, left: 48 });
      return;
    }

    map.panTo(driverPosition);
    map.setZoom(15);
  }, [activeDestination, driverPosition, map, routePath, tripStatus]);

  const handleShare = () => {
    const text = `I'm riding with Rydon24!\nDriver: ${driver.name} (${driver.plate || driver.vehicleNumber || 'Assigned'})\nFrom: ${pickupLabel}\nTo: ${dropLabel}`;
    if (navigator.share) {
      navigator.share({ title: 'Track My Ride', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      });
    }
  };

  const ActionBtn = ({ icon: Icon, label, onClick, colorClass }) => (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[14px] border border-slate-100 bg-slate-50/80 transition-all ${colorClass || ''}`}
    >
      <Icon size={17} className="text-slate-700" strokeWidth={2} />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-gray-100 max-w-lg mx-auto relative font-sans overflow-hidden">
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-5 py-3 rounded-[14px] text-[12px] font-black shadow-xl whitespace-nowrap"
          >
            Ride details copied!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 bg-slate-200">
        {!HAS_VALID_GOOGLE_MAPS_KEY ? (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
            <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
              <p className="text-[12px] font-bold text-slate-900">Google Maps key missing</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
            <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
              <p className="text-[12px] font-bold text-slate-900">Google Maps failed to load</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">Check the browser key restrictions and reload.</p>
            </div>
          </div>
        ) : isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={initialMapCenterRef.current}
            zoom={14}
            onLoad={setMap}
            onUnmount={() => setMap(null)}
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
            {routePath.length > 1 && (
              <PolylineF
                path={routePath}
                options={{
                  strokeColor: '#111827',
                  strokeOpacity: 0.9,
                  strokeWeight: 5,
                }}
              />
            )}
            <MarkerF
              position={driverPosition}
              title="Driver"
              icon={createTrackingMarkerIcon(vehicleIcon)}
            />
            <MarkerF
              position={activeDestination}
              title={tripStatus === 'started' ? 'Drop' : 'Pickup'}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: tripStatus === 'started' ? '#ef4444' : '#10b981',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 7,
              }}
            />
          </GoogleMap>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200">
            <div className="rounded-[16px] bg-white/90 px-4 py-3 shadow-sm text-[12px] font-bold text-slate-700">
              Loading map
            </div>
          </div>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/taxi/user')}
        className="absolute top-8 left-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-md rounded-[12px] shadow-[0_4px_14px_rgba(15,23,42,0.10)] border border-white/80 flex items-center justify-center"
      >
        <ChevronLeft size={18} className="text-slate-900" strokeWidth={2.5} />
      </motion.button>

      <div className="absolute top-8 left-16 right-4 z-10 bg-white/90 backdrop-blur-md rounded-[14px] px-3.5 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.08)] border border-white/80">
        <p className="text-[11px] font-black text-slate-500 truncate">{pickupLabel} → {dropLabel}</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/taxi/user/support')}
        className="absolute top-24 right-4 z-10 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/80 shadow-[0_4px_14px_rgba(15,23,42,0.08)] flex items-center gap-1.5"
      >
        <Shield size={13} className="text-blue-500" strokeWidth={2.5} />
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Safety</span>
      </motion.button>

      {routeError && (
        <div className="absolute top-24 left-4 z-10 rounded-[12px] border border-amber-100 bg-white/90 px-3 py-2 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route</p>
          <p className="text-[11px] font-bold text-slate-700">Using fallback path while directions load.</p>
        </div>
      )}

      <motion.div
        animate={{ y: drawerOpen ? 0 : 340 }}
        className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-[28px] shadow-[0_-8px_32px_rgba(15,23,42,0.10)] z-20 border-t border-white/80"
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-4 cursor-pointer" onClick={() => setDrawerOpen(!drawerOpen)} />
        <div className="px-5 pb-8">
          {/* Driver & OTP Row */}
          <div className="flex items-start justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                  {driverImage ? (
                    <img src={driverImage} className="w-full h-full object-cover" alt="Driver" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#FACC15] text-[18px] font-bold text-slate-900">
                      {getInitials(driver.name)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900 px-1.5 py-0.5 rounded-[6px] border border-white flex items-center gap-0.5 shadow-sm">
                  <Star size={9} className="text-[#FACC15] fill-[#FACC15]" />
                  <span className="text-[9px] font-bold text-white">{driver.rating || '4.9'}</span>
                </div>
              </div>
              <div className="min-w-0 pt-1">
                <h3 className="text-[17px] font-bold text-slate-900 leading-tight truncate">{driver.name || 'Captain'}</h3>
                <div className="inline-block mt-1 bg-[#FACC15] px-2 py-0.5 rounded-[4px] shadow-sm">
                   <p className="text-[11px] font-bold text-slate-900 tracking-wide">{driver.plate || driver.vehicleNumber || 'ASSIGNED'}</p>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-center pl-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">OTP</p>
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-[8px]">
                 <p className="text-[20px] font-bold text-slate-900 tracking-[0.1em]">{otp}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-[12px] bg-slate-50 flex items-center justify-center border border-slate-100">
                  {hasVehiclePhoto ? (
                    <img src={vehicleImage} className="w-full h-full object-contain rounded-[12px]" onError={() => setVehicleImageBroken(true)} />
                  ) : (
                    <img src={vehicleIcon} className="w-10 h-10 object-contain drop-shadow-sm" />
                  )}
               </div>
               <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{vehicleLabel}</p>
                  <p className="text-[13px] font-semibold text-slate-900">{driverSubtitle}</p>
               </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="py-4 flex justify-between gap-2">
            <ActionBtn icon={Phone} label="Call" onClick={() => window.open(`tel:${driver.phone || ''}`)} />
            <ActionBtn icon={MessageCircle} label="Chat" onClick={() => navigate('/taxi/user/ride/chat')} />
            <ActionBtn icon={Share2} label="Share" onClick={handleShare} />
            <ActionBtn icon={Shield} label="Safety" onClick={() => navigate('/taxi/user/support')} colorClass="text-blue-600" />
          </div>

          {/* Fare & Cancel */}
          <div className="mt-2 flex items-center justify-between px-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-extrabold text-slate-900 tracking-tight">₹{fare}</span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[4px] uppercase tracking-wider">{paymentMethod}</span>
            </div>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showCancelConfirm && (
          <div className="z-[100] relative">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCancelConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] max-w-lg mx-auto" />
            
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[24px] z-[101] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh]">
              
              {/* Floating Close Button */}
              <div className="absolute -top-14 right-4">
                 <button onClick={() => setShowCancelConfirm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                    <span className="text-[18px] font-bold text-slate-900 leading-none">✕</span>
                 </button>
              </div>

              <div className="overflow-y-auto px-5 pt-6 pb-24 scrollbar-hide">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                     <span className="text-[24px]">🎧</span>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-extrabold text-slate-900 leading-tight">We are listening</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-1 leading-snug pr-4">Your feedback matters! Share your ride experience to help us improve</p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-slate-50 rounded-[8px] px-4 py-2.5 mb-6">
                  <p className="text-[12px] font-semibold text-slate-600">Don't worry! 🤐 This feedback is sent to Ozayra team</p>
                </div>

                {/* Reasons List */}
                <div className="space-y-4 mb-6">
                  {[
                    "Captain vehicle is different",
                    "Captain himself is a different person",
                    "Captain is over-speeding",
                    "Captain is doing rash driving",
                    "Captain use phone while driving",
                    "Captain behavior is not good"
                  ].map((reason) => (
                    <label key={reason} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[14px] font-bold text-slate-700">{reason}</span>
                      <div className={`w-5 h-5 rounded-[4px] border-[2px] flex items-center justify-center transition-colors ${cancelReason === reason ? 'bg-[#FACC15] border-[#FACC15]' : 'border-slate-200 bg-slate-50'}`}>
                        {cancelReason === reason && <span className="text-white text-[12px] font-bold">✓</span>}
                      </div>
                      <input type="checkbox" className="hidden" checked={cancelReason === reason} onChange={() => setCancelReason(reason)} />
                    </label>
                  ))}
                </div>

                {/* Other Input */}
                <div className="bg-slate-50 rounded-t-[12px] border-b-2 border-slate-900 px-4 py-3">
                  <input 
                    type="text" 
                    placeholder="Some other issue? Tell us more..."
                    className="w-full bg-transparent text-[13px] font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                    value={otherReason}
                    onChange={(e) => {
                      setOtherReason(e.target.value);
                      if (e.target.value) setCancelReason('');
                    }}
                  />
                </div>
              </div>

              {/* Sticky Bottom Action */}
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4">
                <motion.button 
                  whileTap={{ scale: 0.98 }} 
                  onClick={handleCancelRide}
                  className="w-full bg-[#FACC15] text-slate-900 py-4 rounded-full text-[15px] font-bold shadow-sm"
                >
                  Send feedback to Ozayra
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RideTracking;
