import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Star, MapPin, Navigation } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';
import { useAppGoogleMapsLoader } from '../../../admin/utils/googleMaps';

const unwrap = (response) => response?.data || response;

const formatLongDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Trip details';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatTimeOnly = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const coordLabel = (location, fallback) => {
  if (location?.address) return location.address;
  if (location?.name) return location.name;
  const [lng, lat] = location?.coordinates || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  }
  return fallback;
};

const RideDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [shareToast, setShareToast] = useState(false);
  const [ride, setRide] = useState(location.state?.ride || null);
  const [loading, setLoading] = useState(!location.state?.ride);
  const [error, setError] = useState('');
  
  // Google Maps Loader
  const { isLoaded } = useAppGoogleMapsLoader();

  // State for dynamically geocoded addresses
  const [geocodedPickup, setGeocodedPickup] = useState('');
  const [geocodedDrop, setGeocodedDrop] = useState('');

  const routePrefix = location.pathname.startsWith('/taxi/driver') ? '/taxi/driver' : location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';

  useEffect(() => {
    if (ride || !id) return undefined;

    let active = true;
    const loadRide = async () => {
      try {
        const response = await api.get(`/rides/${id}`);
        const payload = unwrap(response);
        if (active) setRide(payload);
      } catch (loadError) {
        if (active) setError(loadError?.message || 'Could not load trip details.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRide();

    return () => {
      active = false;
    };
  }, [id, ride]);

  // Reverse Geocoding Effect
  useEffect(() => {
    if (!ride) return;

    const geocodeLocation = async (loc, setter) => {
      if (loc?.address && loc.address.trim() !== '') return;
      if (loc?.name && loc.name.trim() !== '') return;
      
      const [lng, lat] = loc?.coordinates || [];
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

      const fallbackNominatim = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data?.display_name) {
            setter(data.display_name.split(',').slice(0, 2).join(', '));
          }
        } catch (err) {
          console.error('Nominatim geocode error:', err);
        }
      };

      if (isLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
          if (status === 'OK' && results?.[0]?.formatted_address) {
            const shortAddr = results[0].formatted_address.split(',').slice(0, 2).join(', ');
            setter(shortAddr);
          } else {
            fallbackNominatim();
          }
        });
      } else {
        fallbackNominatim();
      }
    };

    geocodeLocation(ride.pickupLocation, setGeocodedPickup);
    geocodeLocation(ride.dropLocation, setGeocodedDrop);
  }, [ride, isLoaded]);

  const details = useMemo(() => {
    const isDriverApp = location.pathname.startsWith('/taxi/driver');
    const driver = ride?.driver || ride?.driverId || {};
    const user = ride?.user || ride?.userId || {};
    const timeSource = ride?.completedAt || ride?.startedAt || ride?.acceptedAt || ride?.createdAt || ride?.updatedAt;
    const fare = Number(ride?.fare || 0);
    const taxes = Math.max(Math.round(fare * 0.18), 0);
    const status = String(ride?.status || ride?.liveStatus || 'trip').toLowerCase();

    return {
      pickup: geocodedPickup || coordLabel(ride?.pickupLocation, 'Pickup location'),
      drop: geocodedDrop || coordLabel(ride?.dropLocation, 'Drop location'),
      fare,
      taxes,
      baseFare: Math.max(fare - taxes, 0),
      timeSource,
      startTime: ride?.startedAt || ride?.acceptedAt || timeSource,
      endTime: ride?.completedAt || timeSource,
      statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
      driverName: isDriverApp ? (user.name || 'Customer') : (driver.name || 'Captain'),
      rating: isDriverApp ? (user.rating || '5.0') : (driver.rating || '4.9'),
      plate: isDriverApp ? (user.phone || 'Verified') : (driver.vehicleNumber || 'Assigned'),
      vehicle: driver.vehicleType || ride?.vehicleIconType || 'Taxi',
      shortId: id ? id.substring(0, 8).toUpperCase() : 'TRIP',
    };
  }, [ride, id, geocodedPickup, geocodedDrop, location.pathname]);

  const handleShare = () => {
    const text = `Trip #${details.shortId} - ${details.pickup} to ${details.drop} | Rs ${details.fare}.00`;
    if (navigator.share) {
      navigator.share({ title: 'Trip Details', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      });
    }
  };

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto flex flex-col font-sans relative">
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-full text-sm font-semibold shadow-xl whitespace-nowrap"
          >
            Details copied
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all text-slate-900 hover:bg-slate-50 rounded-full">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[16px] font-semibold text-slate-900">Trip Details</h1>
        <button onClick={handleShare} className="p-2 -mr-2 active:scale-90 transition-all text-slate-900 hover:bg-slate-50 rounded-full">
          <Share2 size={20} />
        </button>
      </header>

      <div className="flex-1 px-6 pb-24 overflow-y-auto no-scrollbar">
        {loading && (
          <div className="py-10 text-center text-[14px] text-slate-500 animate-pulse">
            Loading details...
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-[14px] text-red-500 bg-red-50 rounded-2xl mt-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8 pt-4">
            {/* Header / Receipt Area */}
            <div className="text-center space-y-1">
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">{formatLongDate(details.timeSource)}</p>
              <h2 className="text-[42px] font-bold text-slate-900 tracking-tight leading-none pt-2">
                Rs {details.fare}
              </h2>
              <p className="text-[13px] font-medium text-slate-500">{details.statusLabel} • {details.vehicle}</p>
            </div>

            <div className="h-[1px] w-full bg-slate-100" />

            {/* Locations */}
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="w-[1.5px] h-8 bg-slate-200" />
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Pickup</h4>
                  <p className="text-[15px] font-medium text-slate-900 leading-snug">{details.pickup}</p>
                  <span className="text-[12px] text-slate-500">{formatTimeOnly(details.startTime)}</span>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Dropoff</h4>
                  <p className="text-[15px] font-medium text-slate-900 leading-snug">{details.drop}</p>
                  <span className="text-[12px] text-slate-500">{formatTimeOnly(details.endTime)}</span>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-slate-100" />

            {/* Driver Profile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={`https://ui-avatars.com/api/?name=${String(details.driverName).replace(' ', '+')}&background=F1F5F9&color=0F172A`}
                  className="w-12 h-12 rounded-full border border-slate-100"
                  alt={details.driverName}
                />
                <div>
                  <h4 className="text-[15px] font-semibold text-slate-900">{details.driverName}</h4>
                  <div className="flex items-center gap-1.5 text-[13px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-0.5 text-slate-700 font-medium">
                      <Star size={12} className="fill-slate-700" />
                      {details.rating}
                    </span>
                    <span>•</span>
                    <span>{details.plate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fare Breakdown */}
            <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <h4 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Breakdown</h4>
              <div className="flex justify-between items-center text-[14px] text-slate-600">
                <span>Base Fare</span>
                <span>Rs {details.baseFare}</span>
              </div>
              <div className="flex justify-between items-center text-[14px] text-slate-600">
                <span>Taxes & Fees</span>
                <span>Rs {details.taxes}</span>
              </div>
              <div className="flex justify-between items-center text-[15px] font-semibold text-slate-900 pt-3 border-t border-slate-200">
                <span>Total Amount</span>
                <span>Rs {details.fare}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg p-4 bg-white border-t border-slate-100 flex gap-3 z-20">
        <button
          type="button"
          onClick={() => navigate(`${routePrefix}/support`)}
          className="flex-1 bg-slate-50 text-slate-900 py-4 rounded-xl text-[14px] font-semibold flex items-center justify-center active:scale-95 transition-all border border-slate-100"
        >
          Support
        </button>
        {!location.pathname.startsWith('/taxi/driver') && (
          <button
            type="button"
            onClick={() => navigate(`${routePrefix}/ride/select-location`)}
            className="flex-[2] bg-[#F9C922] text-slate-900 py-4 rounded-xl text-[14px] font-semibold flex items-center justify-center active:scale-95 transition-all shadow-sm"
          >
            Rebook
          </button>
        )}
      </div>
    </div>
  );
};

export default RideDetail;
