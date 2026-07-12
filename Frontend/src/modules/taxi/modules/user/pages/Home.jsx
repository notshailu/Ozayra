import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, MapPin, Search, Navigation, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMap } from '@react-google-maps/api';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../admin/utils/googleMaps';
import ActionsSection from '../components/ActionsSection';
import PromoBanners from '../components/PromoBanners';
import ExplorerSection from '../components/ExplorerSection';
import BottomNavbar from '../components/BottomNavbar';
import carIcon from '../../../assets/icons/car.webp';
import bikeIcon from '../../../assets/icons/bike.webp';
import autoIcon from '../../../assets/icons/auto.webp';
import deliveryIcon from '../../../assets/icons/Delivery.webp';
import api from '../../../shared/api/axiosInstance';
import { useSettings } from '../../../shared/context/SettingsContext';
import { hasLocalUserToken, userAuthService } from '../services/authService';
import {
  CURRENT_RIDE_UPDATED_EVENT,
  clearCurrentRide,
  getCurrentRide,
  isActiveCurrentRide,
  saveCurrentRide,
} from '../services/currentRideService';
import {
  TAXI_LOCATION_UPDATED_EVENT,
  getSavedTaxiLocationLabel,
  getSavedTaxiLocation,
  saveTaxiLocation,
} from '../services/savedLocation';

const UBER_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e9e9e9' }] },
  { featureType: 'road.highway.controlled_control', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d7e3' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];


const Motion = motion;

class HomeSectionBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[taxi-home] section render failed', {
      section: this.props.label || 'unknown',
      error,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-5">
          <div className="rounded-[20px] border border-amber-100 bg-amber-50/90 px-4 py-3 text-left shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {this.props.label || 'Section'} unavailable
            </p>
            <p className="mt-1 text-[12px] font-bold text-amber-900">
              This block could not load right now, but the rest of the home page is still available.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const normalizeActiveRide = (ride) => {
  if (!ride?.rideId) {
    return null;
  }

  const formatPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
  };

  return {
    rideId: ride.rideId,
    status: ride.status || ride.liveStatus || 'accepted',
    liveStatus: ride.liveStatus || ride.status || 'accepted',
    type: ride.type || ride.serviceType || 'ride',
    serviceType: ride.serviceType || ride.type || 'ride',
    driver: ride.driver || null,
    fare: ride.fare || 22,
    vehicleIconType: ride.vehicleIconType || ride.driver?.vehicleIconType || '',
    pickupCoords: ride.pickupLocation?.coordinates,
    dropCoords: ride.dropLocation?.coordinates,
    pickup: formatPoint(ride.pickupLocation, 'Pickup location'),
    drop: formatPoint(ride.dropLocation, 'Drop location'),
    paymentMethod: ride.paymentMethod || 'Cash',
  };
};

const getCurrentRideIcon = (ride) => {
  const serviceType = String(ride?.serviceType || ride?.type || '').toLowerCase();
  const iconType = String(ride?.vehicleIconType || ride?.driver?.vehicleIconType || ride?.driver?.vehicleType || '').toLowerCase();

  if (serviceType === 'parcel') {
    return deliveryIcon;
  }

  if (iconType.includes('bike')) {
    return bikeIcon;
  }

  if (iconType.includes('auto')) {
    return autoIcon;
  }

  return carIcon;
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  const appLogo = settings.general?.logo || settings.customization?.logo;

  const [balance, setBalance] = useState(null);
  const [locationLabel, setLocationLabel] = useState(getSavedTaxiLocationLabel);
  const [coords, setCoords] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 22.7196, lng: 75.8577 });
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState('idle');
  const [centerAddress, setCenterAddress] = useState('Pickup Point');
  const [isDragging, setIsDragging] = useState(false);
  const { isLoaded, loadError } = useAppGoogleMapsLoader();

  const [inZone, setInZone] = useState(true);
  const [checkingZone, setCheckingZone] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    const prompted = localStorage.getItem('ozayra:location-prompted');
    if (!prompted) {
      setShowPermissionModal(true);
    }
  }, []);

  const checkLocationZone = async (lat, lng) => {
    if (!lat || !lng) return;
    setCheckingZone(true);
    try {
      const response = await api.get(`/rides/check-zone?lat=${lat}&lng=${lng}`);
      const dataPayload = response?.data || response;
      const isSuccess = response?.success || response?.data?.success;
      if (isSuccess) {
        setInZone(!!(dataPayload?.inZone ?? dataPayload?.data?.inZone));
      }
    } catch (err) {
      console.warn('Failed to check zone for location:', err);
    } finally {
      setCheckingZone(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchBalance = async () => {
      try {
        const response = await userAuthService.getWallet();
        const data = response?.data || {};
        if (active) {
          setBalance(Number(data.balance || 0));
        }
      } catch (err) {
        console.warn('Failed to load wallet balance for header:', err);
      }
    };
    fetchBalance();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncLocation = () => {
      setLocationLabel(getSavedTaxiLocationLabel());
      const saved = getSavedTaxiLocation();
      if (Number.isFinite(saved?.lat) && Number.isFinite(saved?.lng)) {
        const next = { lat: saved.lat, lng: saved.lng };
        setCoords(next);
        setMapCenter(next);
        checkLocationZone(saved.lat, saved.lng);
        
        if (saved?.address) {
          const shortAddr = saved.address.split(',').slice(0, 2).join(', ');
          setCenterAddress(shortAddr);
        } else if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: next }, (results, geocodeStatus) => {
            if (geocodeStatus === 'OK' && results?.[0]?.formatted_address) {
              const shortAddr = results[0].formatted_address.split(',').slice(0, 2).join(', ');
              setCenterAddress(shortAddr);
            }
          });
        }
      }
    };

    syncLocation();
    window.addEventListener('storage', syncLocation);
    window.addEventListener(TAXI_LOCATION_UPDATED_EVENT, syncLocation);

    return () => {
      window.removeEventListener('storage', syncLocation);
      window.removeEventListener(TAXI_LOCATION_UPDATED_EVENT, syncLocation);
    };
  }, []);

  useEffect(() => {
    if (coords && map) {
      map.panTo({ lat: mapCenter.lat, lng: mapCenter.lng });
    }
  }, [mapCenter, map]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCoords(next);
        setMapCenter(next);
        setStatus('ready');
        saveTaxiLocation(next);
        setCenterAddress('Fetching...');
        checkLocationZone(next.lat, next.lng);

        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: next.lat, lng: next.lng } }, (results, geocodeStatus) => {
            if (geocodeStatus === 'OK' && results?.[0]?.formatted_address) {
              saveTaxiLocation({ address: results[0].formatted_address });
              const shortAddr = results[0].formatted_address.split(',').slice(0, 2).join(', ');
              setCenterAddress(shortAddr);
            } else {
              setCenterAddress('Pickup Point');
            }
          });
        }
      },
      (error) => {
        setStatus('error');
        toast.error("Unable to fetch location. Please ensure location/GPS permissions are enabled.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const handleMapDragStart = () => {
    setIsDragging(true);
    setCenterAddress('Moving...');
  };

  const handleMapDragEnd = () => {
    setIsDragging(false);
    if (!map) return;
    
    const newCenter = map.getCenter();
    const lat = newCenter.lat();
    const lng = newCenter.lng();
    
    setMapCenter({ lat, lng });
    setCoords({ lat, lng });
    setCenterAddress('Fetching...');
    checkLocationZone(lat, lng);

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, geocodeStatus) => {
        if (geocodeStatus === 'OK' && results?.[0]?.formatted_address) {
          saveTaxiLocation({ lat, lng, address: results[0].formatted_address });
          const shortAddr = results[0].formatted_address.split(',').slice(0, 2).join(', ');
          setCenterAddress(shortAddr);
        } else {
          setCenterAddress('Pickup Point');
        }
      });
    }
  };


  const [currentRide, setCurrentRide] = useState(() => {
    const ride = getCurrentRide();
    return isActiveCurrentRide(ride) ? ride : null;
  });

  useEffect(() => {
    const refreshCurrentRide = () => {
      const ride = getCurrentRide();
      setCurrentRide(isActiveCurrentRide(ride) ? ride : null);
    };

    refreshCurrentRide();
    window.addEventListener('storage', refreshCurrentRide);
    window.addEventListener(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);

    return () => {
      window.removeEventListener('storage', refreshCurrentRide);
      window.removeEventListener(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadActiveRide = async () => {
      if (!hasLocalUserToken()) {
        clearCurrentRide();
        setCurrentRide(null);
        return;
      }

      try {
        const [rideResponse, parcelResponse] = await Promise.allSettled([
          api.get('/rides/active/me'),
          api.get('/deliveries/active/me'),
        ]);
        const activeResponse = parcelResponse.status === 'fulfilled' && parcelResponse.value?.data
          ? parcelResponse.value
          : rideResponse.status === 'fulfilled'
            ? rideResponse.value
            : null;
        const ride = normalizeActiveRide(activeResponse?.data || activeResponse);

        if (!active || !isActiveCurrentRide(ride)) {
          clearCurrentRide();
          setCurrentRide(null);
          return;
        }

        saveCurrentRide(ride);
        setCurrentRide(ride);
      } catch {
        // Local storage remains the fallback; missing auth should not break the home page.
      }
    };

    loadActiveRide();

    return () => {
      active = false;
    };
  }, []);

  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';
  const driverName = currentRide?.driver?.name || 'Captain';
  const serviceType = String(currentRide?.serviceType || currentRide?.type || 'ride').toLowerCase();
  const vehicleLabel = currentRide?.driver?.vehicle || currentRide?.driver?.vehicleType || (serviceType === 'parcel' ? 'Parcel' : 'Taxi');
  const currentRideIcon = getCurrentRideIcon(currentRide);
  const trackingPath = serviceType === 'parcel' ? `${routePrefix}/parcel/tracking` : `${routePrefix}/ride/tracking`;
  const rideStage = String(currentRide?.liveStatus || currentRide?.status || 'accepted').toLowerCase();
  const rideStageLabel =
    rideStage === 'started'
      ? serviceType === 'parcel' ? 'Parcel in transit' : 'Ride in progress'
      : rideStage === 'arriving'
        ? serviceType === 'parcel' ? 'Driver reached sender' : 'Driver arrived'
        : serviceType === 'parcel'
          ? 'Parcel booked'
          : 'Ride booked';

  const footerIllustrationBg = {
    backgroundImage: 'url(/varanasi_footer.png)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center calc(100% + 65px)',
    backgroundSize: 'cover',
  };

  const footerIllustrationFadeMask = {
    WebkitMaskImage:
      'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
    maskImage:
      'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };

  const footerIllustrationEdgeBlurMask = {
    WebkitMaskImage:
      'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 100%)',
    maskImage:
      'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 100%)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };

  return (
    <div className="h-screen bg-white max-w-lg mx-auto relative overflow-hidden font-sans">
      {!inZone ? (
        <div className="absolute inset-x-0 top-0 bottom-[68px] bg-white flex flex-col items-center justify-center px-8 text-center z-30">
          <div className="mb-6 flex items-center justify-center">
            <MapPin size={40} className="text-yellow-500" strokeWidth={1.5} />
          </div>

          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Outside service area</h3>
          <p className="mt-1.5 text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
            We are currently unavailable in your location.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-[240px]">
            <button
              onClick={() => navigate('/taxi/user/select-current-location')}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full text-[13px] font-bold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Search size={14} className="text-gray-900" /> Choose Location
            </button>
            <button
              onClick={() => {
                toast.success("Thanks! We will notify you when we expand to this area.");
              }}
              className="text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition active:scale-95 underline underline-offset-4"
            >
              Notify me when available
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Fixed Map Section */}
          <div className="absolute top-0 left-0 right-0 w-full h-[360px] overflow-hidden bg-slate-100 z-0">
              {/* Google Map component */}
              {HAS_VALID_GOOGLE_MAPS_KEY && !loadError && isLoaded ? (
                <>
                  <style>{`
                    .gm-style-cc { display: none !important; }
                    .gmnoprint { display: none !important; }
                    a[href^="https://maps.google.com/maps"] { display: none !important; }
                  `}</style>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: mapCenter.lat, lng: mapCenter.lng }}
                    zoom={16}
                    onLoad={(nextMap) => {
                      setMap(nextMap);
                      if (window.google?.maps?.Geocoder) {
                        setCenterAddress('Fetching...');
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ location: mapCenter }, (results, geocodeStatus) => {
                          if (geocodeStatus === 'OK' && results?.[0]?.formatted_address) {
                            const shortAddr = results[0].formatted_address.split(',').slice(0, 2).join(', ');
                            setCenterAddress(shortAddr);
                            saveTaxiLocation({ ...mapCenter, address: results[0].formatted_address });
                          } else {
                            setCenterAddress('Pickup Point');
                          }
                        });
                      }
                    }}
                    onUnmount={() => setMap(null)}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: false,
                      keyboardShortcuts: false,
                      clickableIcons: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                      mapTypeControl: false,
                      gestureHandling: 'none',
                      scrollwheel: false,
                      disableDoubleClickZoom: true,
                    }}
                    onDragStart={handleMapDragStart}
                    onDragEnd={handleMapDragEnd}
                  />
                </>
              ) : (
                <div className="w-full h-full bg-[linear-gradient(135deg,#eef2f7_0%,#e2e8f0_100%)] flex items-center justify-center">
                  <span className="text-[12px] font-bold text-slate-400">Loading Map...</span>
                </div>
              )}


              {/* Floating Overlay B: Center Marker */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center transition-transform duration-300 ${isDragging ? '-translate-y-[60%]' : ''}`}>
                <div className="bg-[#10B981] text-white text-[11px] font-black px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center tracking-wide leading-tight max-w-[200px] text-center truncate whitespace-nowrap">
                  {centerAddress}
                </div>
                <div className="w-[2px] h-3 bg-[#10B981] shadow-sm" />
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                </div>
              </div>

              {/* Floating Overlay C: Locate FAB */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={requestLocation}
                className="absolute bottom-10 right-4 z-10 w-12 h-12 bg-white rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:scale-95 transition-all"
              >
                <Navigation 
                  size={20} 
                  strokeWidth={2.8} 
                  className={`transition-colors rotate-45 ${status === 'loading' ? 'animate-pulse text-emerald-600' : 'text-slate-700'}`} 
                />
              </motion.button>
            </div>

          <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden scroll-smooth pb-24 no-scrollbar pointer-events-none" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Transparent spacer to expose the map */}
            <div className="h-[344px] w-full shrink-0" />
            
            {/* 2. Bottom Sheet Overlay */}
            <div className="relative z-20 bg-white rounded-t-[30px] shadow-[0_-8px_30px_rgba(0,0,0,0.03)] pb-4 min-h-[calc(100vh-344px)] pointer-events-auto">
              {/* Grab Handle */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              {/* Sticky Header Wrapper */}
              <div className="sticky top-0 z-30 bg-white pt-2 pb-3">
                {/* Where to Search Bar */}
                <div 
                  onClick={() => navigate('/taxi/user/ride/select-location')}
                  className="mx-5 flex items-center gap-3.5 cursor-pointer bg-slate-50 hover:bg-slate-100/50 border border-slate-100 rounded-full px-5 py-4 shadow-[inset_0_2px_4_rgba(0,0,0,0.01)] transition-all"
                >
                  <Search size={20} className="text-slate-700" strokeWidth={2.8} />
                  <span className="text-[16px] font-bold text-slate-700 leading-tight">
                    Where do you want to go?
                  </span>
                </div>
              </div>

              {/* Lower sections */}
              <div className="space-y-4 pt-2">
                <HomeSectionBoundary label="Quick actions">
                  <ActionsSection />
                </HomeSectionBoundary>
                <HomeSectionBoundary label="Promotions">
                  <PromoBanners />
                </HomeSectionBoundary>
                <HomeSectionBoundary label="Explore">
                  <ExplorerSection />
                </HomeSectionBoundary>
              </div>

              <div
                className="relative w-full mt-6"
                style={{
                  height: 360,
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none mix-blend-multiply"
                  style={{
                    filter: 'grayscale(1) contrast(1.08)',
                    ...footerIllustrationFadeMask,
                  }}
                >
                  <div className="absolute inset-0" style={footerIllustrationBg} />
                  <div
                    className="absolute inset-0 opacity-55"
                    style={{
                      ...footerIllustrationBg,
                      filter: 'blur(3px)',
                      ...footerIllustrationEdgeBlurMask,
                    }}
                  />
                </div>

                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-white/80 via-white/35 to-transparent" />
                  <div className="relative z-10 flex h-full items-center justify-center px-6 pt-16 text-left">
                    <div className="flex max-w-[340px] flex-col items-start px-2 py-2 -translate-x-6 translate-y-12">
                      <div className="text-[30px] font-serif font-extrabold tracking-[0.28em] text-slate-600 drop-shadow-[0_2px_10px_rgba(255,255,255,0.85)]">
                        #{appName.toUpperCase()}
                      </div>
                      <div className="mt-1 text-[12px] font-sans italic font-semibold tracking-wide text-slate-600 drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)]">
                        Your Trusted Journey Partner
                      </div>
                      <div className="mt-2 text-[10px] font-sans font-semibold tracking-[0.22em] text-slate-500 drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)]">
                        Made for Everyone, Crafted for You.
                        <img
                          src="/flag-in.svg"
                          alt="India"
                          className="ml-0.5 inline-block h-[2.2em] w-[1.2em] align-[-0.88em]"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-24 left-0 right-0 h-24 opacity-70 pointer-events-none">
            <img
              src="/city_skyline_footer.png"
              alt="City"
              className="w-full h-full object-cover object-bottom mix-blend-multiply contrast-125"
            />
          </div>
        </>
      )}

      <AnimatePresence>
        {currentRide && (
          <Motion.button
            type="button"
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.96 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(trackingPath, { state: currentRide })}
            className="fixed bottom-24 left-4 right-4 z-[60] mx-auto flex max-w-[calc(32rem-2rem)] items-center gap-3 rounded-[20px] border border-white/80 bg-white/95 px-4 py-3 text-left shadow-[0_12px_34px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-900">
              <img src={currentRideIcon} alt={vehicleLabel} className="h-8 w-8 object-contain" draggable={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-600">
                  {serviceType === 'parcel' ? 'Current Parcel' : 'Current Ride'}
                </p>
              </div>
              <p className="mt-0.5 truncate text-[14px] font-black leading-tight text-slate-900">
                {rideStageLabel}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <MapPin size={12} className="shrink-0 text-emerald-500" strokeWidth={2.5} />
                <span className="truncate">{currentRide.pickup || 'Pickup location'}</span>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <MapPin size={12} className="shrink-0 text-orange-500" strokeWidth={2.5} />
                <span className="truncate">{currentRide.drop || 'Drop location'}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-black text-slate-900">Rs {Number(currentRide.fare || 0).toFixed(0)}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{driverName}</p>
              <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-[12px] bg-orange-500 text-white">
                <ChevronRight size={18} strokeWidth={3} />
              </div>
            </div>
          </Motion.button>
        )}
      </AnimatePresence>

      <BottomNavbar />

      {/* Location Permission Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs z-[100] flex items-center justify-center p-5">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="bg-white rounded-[24px] max-w-[290px] w-full p-6 text-center shadow-xl flex flex-col items-center justify-center pointer-events-auto"
            >
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-50 text-yellow-600 shadow-inner">
                <MapPin size={38} className="text-yellow-600 animate-bounce" strokeWidth={1.5} />
              </div>

              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Enable location services</h3>
              <p className="mt-2 text-xs text-slate-400 font-medium max-w-[280px] leading-relaxed">
                This allows us to find nearby rides, estimate accurate pickup times, and deliver parcels seamlessly.
              </p>

              <button
                onClick={() => {
                  localStorage.setItem('ozayra:location-prompted', 'true');
                  setShowPermissionModal(false);
                  requestLocation();
                }}
                className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-2xl text-[13px] font-bold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm mt-6"
              >
                Allow Location Access
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('ozayra:location-prompted', 'true');
                  setShowPermissionModal(false);
                }}
                className="text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition active:scale-95 underline underline-offset-4 mt-4"
              >
                Not Now
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;

