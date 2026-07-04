import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Phone, MessageCircle, Shield, CheckCircle2, Navigation, AlertTriangle, Star, MapPin } from 'lucide-react';
import { GoogleMap, Marker, OverlayView, Polyline } from '@react-google-maps/api';
import { socketService } from '../../../../shared/api/socket';
import api from '../../../../shared/api/axiosInstance';
import { getLocalUserToken, userAuthService } from '../../services/authService';
import { saveCurrentRide } from '../../services/currentRideService';
import { useAppGoogleMapsLoader, HAS_VALID_GOOGLE_MAPS_KEY, RAPIDO_MAP_STYLE } from '../../../admin/utils/googleMaps';

const MAP_OPTIONS = {
  disableDefaultUI: true,
  styles: RAPIDO_MAP_STYLE
};

const generateOTP = () => String(Math.floor(1000 + Math.random() * 9000));
const unwrap = (response) => response?.data?.data || response?.data || response;
const unwrapLoginPayload = (response) => {
  const payload = unwrap(response);
  return payload?.token ? payload : payload?.user ? payload : payload?.data || payload;
};
import LuxuryIcon from '../../../../assets/icons/Luxury.png';
import PremiumIcon from '../../../../assets/icons/Premium.png';
import SuvIcon from '../../../../assets/icons/SUV.png';
import BikeIcon from '../../../../assets/icons/bike.png';
import CarIcon from '../../../../assets/icons/car.png';
import AutoIcon from '../../../../assets/icons/auto.png';

const getVehicleIcon = (type = 'car') => {
  const val = String(type).toLowerCase();
  if (val.includes('bike')) return BikeIcon;
  if (val.includes('auto')) return AutoIcon;
  if (val.includes('lux')) return LuxuryIcon;
  if (val.includes('premium')) return PremiumIcon;
  if (val.includes('suv')) return SuvIcon;
  return CarIcon;
};
const DRIVER_PLACEHOLDER = { name: 'Captain', rating: '4.9', vehicle: 'Taxi', plate: 'Assigned', phone: '', eta: 2 };
const STAGES = { SEARCHING: 'searching', ASSIGNED: 'assigned', ACCEPTED: 'accepted', COMPLETING: 'completing' };

const normalizeDriver = (driver = {}) => ({
  name: driver.name || 'Captain',
  rating: driver.rating || '4.9',
  vehicle: driver.vehicleType || 'Taxi',
  plate: driver.vehicleNumber || 'Assigned',
  phone: driver.phone || '',
  eta: driver.eta || 2,
});

const getOnlineDriverPosition = (driver) => {
  const [lng, lat] = driver?.location?.coordinates || [];

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  return null;
};

const ActionBtn = ({ icon: Icon, label, onClick }) => (
  <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-[12px] border border-slate-100 bg-slate-50/80 transition-all">
    <Icon size={15} className="text-slate-700" strokeWidth={2} />
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
  </motion.button>
);

const DriverCard = ({ driver, banner, bannerGradient, children }) => (
  <div className="rounded-[20px] border border-white/80 bg-white/95 shadow-[0_16px_48px_rgba(15,23,42,0.14)] overflow-hidden">
    <div className={`px-4 py-2.5 flex items-center gap-2.5 ${bannerGradient}`}>
      {banner}
    </div>
    <div className="px-4 pt-3 pb-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-[13px] bg-slate-100 overflow-hidden border border-slate-100">
            <img src={`https://ui-avatars.com/api/?name=${driver.name.replace(' ','+')}&background=f1f5f9&color=0f172a`}
              className="w-full h-full object-cover" alt="Driver" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-yellow-400 px-1 py-0.5 rounded-[6px] border-2 border-white flex items-center gap-0.5 shadow-sm">
            <Star size={8} className="text-slate-900 fill-slate-900" />
            <span className="text-[8px] font-bold text-slate-900">{driver.rating}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">{driver.name}</h3>
          <p className="text-[11px] font-semibold text-orange-500 mt-0.5">Arriving in {driver.eta} mins</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{driver.plate} · {driver.vehicle}</p>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const SearchingDriver = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = useMemo(() => location.state || {}, [location.state]);
  const [stage, setStage] = useState(STAGES.SEARCHING);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [otp] = useState(generateOTP);
  const [driver, setDriver] = useState(DRIVER_PLACEHOLDER);
  const [searchStatus, setSearchStatus] = useState('Connecting with drivers nearby');
  const timerRef = useRef(null);
  const activeRidePollRef = useRef(null);
  const requestStartedRef = useRef(false);
  const trackingStartedRef = useRef(false);
  const driverRef = useRef(driver);
  const routePrefix = useMemo(
    () => (location.pathname.startsWith('/taxi/user') ? '/taxi/user' : ''),
    [location.pathname],
  );
  const selectedVehicleTypeId = useMemo(
    () => routeState.vehicleTypeId || routeState.vehicle?.vehicleTypeId,
    [routeState],
  );
  const selectedVehicleIconType = useMemo(
    () => routeState.vehicleIconType || routeState.vehicle?.iconType || routeState.vehicle?.name || 'car',
    [routeState],
  );
  const selectedVehicleIcon = routeState.vehicle?.icon || getVehicleIcon(selectedVehicleIconType);
  const selectedVehicleName = routeState.vehicle?.name || 'Ride';
  const activeRideIdRef = useRef('');
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  const { isLoaded } = useAppGoogleMapsLoader();

  const pickupPos = useMemo(
    () => (
      routeState.pickupCoords
        ? { lng: routeState.pickupCoords[0], lat: routeState.pickupCoords[1] }
        : { lat: 22.7196, lng: 75.8577 }
    ),
    [routeState.pickupCoords],
  );

  useEffect(() => {
    if (stage !== STAGES.SEARCHING || !selectedVehicleTypeId || !pickupPos) {
      setNearbyDrivers([]);
      return undefined;
    }

    let active = true;

    const loadOnlineDrivers = async () => {
      try {
        const response = await api.get('/rides/available-drivers', {
          params: {
            vehicleTypeId: selectedVehicleTypeId,
            vehicleIconType: selectedVehicleIconType,
            lng: pickupPos.lng,
            lat: pickupPos.lat,
          },
        });
        const payload = unwrap(response);
        const onlineDrivers = Array.isArray(payload?.drivers) ? payload.drivers : [];

        if (active) {
          setNearbyDrivers(onlineDrivers.filter(getOnlineDriverPosition));
        }
      } catch (_error) {
        if (active) {
          setNearbyDrivers([]);
        }
      }
    };

    loadOnlineDrivers();
    const interval = setInterval(loadOnlineDrivers, 6000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pickupPos, selectedVehicleIconType, selectedVehicleTypeId, stage]);

  const dropPos = useMemo(
    () => (
      routeState.dropCoords
        ? { lng: routeState.dropCoords[0], lat: routeState.dropCoords[1] }
        : null
    ),
    [routeState.dropCoords],
  );

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  useEffect(() => {
    if (requestStartedRef.current) {
      return undefined;
    }

    if (!selectedVehicleTypeId) {
      setSearchStatus('Vehicle type missing. Please select a vehicle again.');
      return undefined;
    }

    requestStartedRef.current = true;

    const onRideSearchUpdate = ({ matchedDrivers, radius }) => {
      const radiusKm = radius ? (Number(radius) / 1000).toFixed(1) : '';
      setSearchStatus(
        matchedDrivers > 0
          ? `${matchedDrivers} captain${matchedDrivers > 1 ? 's' : ''} nearby. Waiting for one to accept...`
          : `Searching within ${radiusKm} km`,
      );
    };

    const moveToTracking = ({ acceptedDriver, rideId, rideSnapshot }) => {
      if (trackingStartedRef.current) {
        return;
      }

      const nextDriver = normalizeDriver(acceptedDriver);
      driverRef.current = nextDriver;
      setDriver(nextDriver);
      setStage(STAGES.ACCEPTED);
      setSearchStatus('Captain accepted your ride.');
      activeRideIdRef.current = String(rideId || activeRideIdRef.current || '');
      trackingStartedRef.current = true;
      saveCurrentRide({
        ...routeState,
        pickup: rideSnapshot?.pickupAddress || routeState.pickup,
        drop: rideSnapshot?.dropAddress || routeState.drop,
        pickupCoords: rideSnapshot?.pickupLocation?.coordinates || routeState.pickupCoords,
        dropCoords: rideSnapshot?.dropLocation?.coordinates || routeState.dropCoords,
        rideId: activeRideIdRef.current,
        otp,
        driver: nextDriver,
        fare: rideSnapshot?.fare || routeState.fare || routeState.vehicle?.price || 22,
        paymentMethod: routeState.paymentMethod || 'Cash',
        status: 'accepted',
      });

      clearTimeout(timerRef.current);
      clearInterval(activeRidePollRef.current);
      navigate(`${routePrefix}/ride/tracking`, {
        replace: true,
        state: {
          ...routeState,
          pickup: rideSnapshot?.pickupAddress || routeState.pickup,
          drop: rideSnapshot?.dropAddress || routeState.drop,
          pickupCoords: rideSnapshot?.pickupLocation?.coordinates || routeState.pickupCoords,
          dropCoords: rideSnapshot?.dropLocation?.coordinates || routeState.dropCoords,
          rideId: activeRideIdRef.current,
          otp,
          driver: nextDriver,
          fare: rideSnapshot?.fare || routeState.fare || routeState.vehicle?.price || 22,
          paymentMethod: routeState.paymentMethod || 'Cash',
        },
      });
    };

    const onRideAccepted = ({ driver: acceptedDriver, rideId }) => {
      moveToTracking({ acceptedDriver, rideId });
    };

    const onRideState = (payload) => {
      if (!payload || String(payload.rideId || '') !== String(activeRideIdRef.current || '')) {
        return;
      }

      if (payload.status === 'accepted' || payload.liveStatus === 'accepted') {
        moveToTracking({ acceptedDriver: payload.driver, rideId: payload.rideId, rideSnapshot: payload });
      }
    };

    const hydrateAcceptedRide = async () => {
      const activeResponse = await api.get('/rides/active/me');
      const activeRide = activeResponse?.data || activeResponse;

      if (!activeRide?.rideId) {
        return null;
      }

      return activeRide;
    };

    const onRideStatusUpdated = async (payload) => {
      if (!payload || String(payload.rideId || '') !== String(activeRideIdRef.current || '')) {
        return;
      }

      if (payload.status === 'accepted' || payload.liveStatus === 'accepted') {
        const activeRide = await hydrateAcceptedRide().catch(() => null);
        moveToTracking({
          acceptedDriver: activeRide?.driver || driverRef.current,
          rideId: payload.rideId,
          rideSnapshot: activeRide || payload,
        });
      }
    };

    const onRideCancelled = ({ reason }) => {
      setSearchStatus(reason || 'No drivers accepted the ride request.');
      setStage(STAGES.SEARCHING);
    };

    const onError = ({ message }) => {
      setSearchStatus(message || 'Could not request ride.');
    };

    socketService.on('rideSearchUpdate', onRideSearchUpdate);
    socketService.on('rideAccepted', onRideAccepted);
    socketService.on('ride:state', onRideState);
    socketService.on('ride:status:updated', onRideStatusUpdated);
    socketService.on('rideCancelled', onRideCancelled);
    socketService.on('errorMessage', onError);

    (async () => {
      try {
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

        const rideRequestConfig = userToken
          ? {
              headers: {
                Authorization: `Bearer ${userToken}`,
              },
            }
          : {};

        const response = await api.post('/rides', {
          pickup: routeState.pickupCoords || [75.9048, 22.7039],
          drop: routeState.dropCoords || [75.8937, 22.7533],
          pickupAddress: routeState.pickup || '',
          dropAddress: routeState.drop || '',
          fare: routeState.fare || routeState.vehicle?.price || 22,
          estimatedDistanceMeters: routeState.estimatedDistanceMeters || 0,
          estimatedDurationMinutes: routeState.estimatedDurationMinutes || 0,
          vehicleTypeId: selectedVehicleTypeId,
          vehicleIconType: routeState.vehicleIconType || routeState.vehicle?.iconType,
          paymentMethod: routeState.paymentMethod || 'Cash',
          otp,
        }, rideRequestConfig);

        const payload = unwrap(response);
        const ride = payload?.ride || payload;
        const rideId = ride?._id || ride?.id || payload?.realtime?.rideId;
        const normalizedRideId = String(rideId || '');
        activeRideIdRef.current = normalizedRideId;
        const socket = socketService.connect({ role: 'user', token: userToken });

        if (socket && rideId) {
          socketService.emit('joinRide', { rideId });
          socketService.emit('ride:join', { rideId });
        }

        const pollActiveRide = async () => {
          try {
            const activeRide = await hydrateAcceptedRide();

            if (!activeRide?.rideId) {
              return;
            }

            const isThisRide = String(activeRide.rideId || '') === normalizedRideId;
            const isAcceptedRide = ['accepted', 'arriving', 'started', 'ongoing'].includes(String(activeRide.status || activeRide.liveStatus || '').toLowerCase());

            if (isThisRide && isAcceptedRide) {
              moveToTracking({
                acceptedDriver: activeRide.driver || driverRef.current,
                rideId: activeRide.rideId,
                rideSnapshot: activeRide,
              });
            }
          } catch (_error) {
            // Socket remains the primary path; polling is only a race-condition fallback.
          }
        };

        clearInterval(activeRidePollRef.current);
        activeRidePollRef.current = setInterval(pollActiveRide, 5000);
        pollActiveRide();

        setSearchStatus('Booking created. Searching nearby drivers...');
      } catch (error) {
        setSearchStatus(error?.message || 'Could not create ride request.');
      }
    })();

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(activeRidePollRef.current);
      socketService.off('rideSearchUpdate', onRideSearchUpdate);
      socketService.off('rideAccepted', onRideAccepted);
      socketService.off('ride:state', onRideState);
      socketService.off('ride:status:updated', onRideStatusUpdated);
      socketService.off('rideCancelled', onRideCancelled);
      socketService.off('errorMessage', onError);
    };
  }, [navigate, otp, routePrefix, routeState, selectedVehicleTypeId]);

  const handleCancel = async () => {
    clearTimeout(timerRef.current);

    const rideId = activeRideIdRef.current;

    try {
      if (rideId) {
        await api.patch(`/rides/${rideId}/cancel`);
      }
    } catch (_error) {
      // Navigation still proceeds even if the cancel request races with another state update.
    }

    navigate(routePrefix || '/taxi/user');
  };
  const isSearching = [STAGES.SEARCHING, STAGES.ASSIGNED, STAGES.ACCEPTED].includes(stage);
  const isAssigned = stage === STAGES.ASSIGNED || stage === STAGES.ACCEPTED;

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto relative font-['Plus_Jakarta_Sans'] overflow-hidden">
      {/* Real Google Map Background */}
      <div className="absolute inset-0 z-0">
        {HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={pickupPos}
            zoom={15}
            options={MAP_OPTIONS}
          >
            {/* Enhanced Minimalist Pickup Marker (Uber Style) */}
            <Marker 
              position={pickupPos}
              zIndex={100}
              icon={{
                path: 'M12,2C8.13,2,5,5.13,5,9c0,5.25,7,13,7,13s7-7.75,7-13C19,5.13,15.87,2,12,2z M12,13c-2.21,0-4-1.79-4-4s1.79-4,4-4s4,1.79,4,4S14.21,13,12,13z',
                fillColor: '#000000',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff',
                scale: 1.6,
                anchor: new window.google.maps.Point(12, 22)
              }}
            />

            {/* Drop Marker */}
            {dropPos && (
              <Marker 
                position={dropPos}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                  fillColor: '#FACC15',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#000000',
                  scale: 1.6,
                  anchor: new window.google.maps.Point(12, 22)
                }}
              />
            )}

            {/* Radar Animation centered strictly on Pickup */}
            {isSearching && (
              <OverlayView
                position={pickupPos}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                {/* Wrap in a container to ensure perfect centering over the marker pin head */}
                <div className="flex items-center justify-center -translate-y-[22px]">
                   <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="relative flex items-center justify-center pointer-events-none"
                  >
                    {/* Concentric Ripples */}
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          scale: [0.5, 4.5], 
                          opacity: [0.5, 0] 
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 3,
                          delay: i * 0.75,
                          ease: "easeOut"
                        }}
                        className="absolute w-20 h-20 rounded-full border-[3px] border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                      />
                    ))}

                    {/* Scanning Line overlaying on ripples */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="absolute w-[320px] h-[320px] rounded-full overflow-hidden"
                      style={{ 
                        background: 'conic-gradient(from 0deg, rgba(250, 204, 21, 0.6) 0deg, transparent 60deg, transparent 360deg)' 
                      }}
                    />
                  </motion.div>
                </div>
              </OverlayView>
            )}

            {/* Real online selected-vehicle drivers around pickup */}
            {isSearching && nearbyDrivers.map((nearbyDriver, index) => (
              <OverlayView
                key={nearbyDriver.id || nearbyDriver._id || index}
                position={getOnlineDriverPosition(nearbyDriver)}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <motion.div
                  animate={{
                    opacity: [0.35, 1, 0.45],
                    scale: [0.82, 1.12, 0.88],
                    y: [0, -3, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.45,
                    delay: index * 0.18,
                    ease: 'easeInOut',
                  }}
                  className="relative -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <div className="absolute inset-0 rounded-full bg-yellow-400/40 blur-md" />
                  <div className="relative w-11 h-11 rounded-full border-2 border-slate-900 bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.22)]">
                    <img
                      src={getVehicleIcon(nearbyDriver.vehicleIconType || nearbyDriver.vehicleType || selectedVehicleIconType)}
                      alt={nearbyDriver.vehicleType || selectedVehicleName}
                      className="h-full w-full object-contain drop-shadow-sm"
                    />
                  </div>
                </motion.div>
              </OverlayView>
            ))}

            {/* Simplified Route Line */}
            {dropPos && (
              <Polyline 
                path={[pickupPos, dropPos]}
                options={{
                  strokeColor: '#0f172a',
                  strokeOpacity: 0.2,
                  strokeWeight: 4,
                  icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                    offset: '0',
                    repeat: '10px'
                  }]
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="text-amber-500" size={32} />
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">Map Loading Issue</h3>
            <p className="text-slate-500 text-sm max-w-xs">{!HAS_VALID_GOOGLE_MAPS_KEY ? 'Google Maps API key is missing. Please check your configuration.' : 'Connecting to mapping services...'}</p>
          </div>
        )}
      </div>


      {/* Route pill */}
      <div className="absolute top-8 left-4 right-16 z-20 bg-white/90 backdrop-blur-md rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-white/80">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">Current Route</p>
        <p className="text-[13px] font-extrabold text-slate-900 leading-tight truncate">{routeState.pickup || 'Pickup'} → {routeState.drop || 'Drop'}</p>
      </div>

      {isSearching && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCancelConfirm(true)}
          className="absolute top-8 right-4 z-20 w-10 h-10 bg-white/90 backdrop-blur-md rounded-[12px] shadow-[0_4px_14px_rgba(15,23,42,0.10)] border border-white/80 flex items-center justify-center">
          <X size={16} className="text-slate-900" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Bottom card */}
      <div className="absolute bottom-8 left-4 right-4 z-20">
        <AnimatePresence mode="wait">

          {/* Searching */}
          {isSearching && (
            <motion.div key="searching" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="rounded-[32px] border border-white/80 bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] px-6 pt-3 pb-6 space-y-5">
              
              {/* Intentional Bottom Sheet Handle */}
              <div className="w-10 h-1.5 bg-slate-100 rounded-full mx-auto mb-2" />

              <div className="flex items-start justify-between mb-5">
                <div className="space-y-1">
                  <h1 className="text-[20px] font-extrabold text-slate-900 tracking-tight">Requesting Captain...</h1>
                  <p className="text-[13px] font-medium text-slate-500 max-w-[240px] leading-snug">
                    {searchStatus === 'Booking created. Searching nearby drivers...' ? 'Connecting to captains nearby...' : searchStatus}
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                  <img src={selectedVehicleIcon} alt={selectedVehicleName} className="h-7 w-7 object-contain drop-shadow-sm" />
                </div>
              </div>

              {/* Rapido Sweeping Progress Bar */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6 relative">
                 <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-1/2 bg-[#FACC15] rounded-full"
                 />
              </div>

              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-4 rounded-[16px] bg-slate-100 text-[14px] font-bold text-slate-900 uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancel Request
              </motion.button>
            </motion.div>
          )}

          {/* Removed assigned and accepted flashing UIs */}
        </AnimatePresence>
      </div>

      {/* Cancel modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="z-[100] relative">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCancelConfirm(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] max-w-lg mx-auto" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[24px] p-6 z-[101] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
              
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

              <h3 className="text-[20px] font-extrabold text-slate-900 mb-2 tracking-tight">Cancel Request?</h3>
              <p className="text-[14px] font-medium text-slate-500 mb-8 leading-relaxed">
                {isAssigned ? 'A captain has been assigned. Are you sure you want to cancel?' : "We're still searching. Do you want to stop looking?"}
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-4 text-[14px] font-bold text-slate-900 bg-slate-100 rounded-[16px] uppercase tracking-widest active:scale-95 transition-all">
                  {isSearching ? 'Keep Searching' : 'Don\'t Cancel'}
                </button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleCancel}
                  className="flex-1 bg-[#FACC15] text-slate-900 py-4 rounded-[16px] text-[14px] font-extrabold uppercase tracking-widest shadow-sm">
                  Yes, Cancel
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchingDriver;
