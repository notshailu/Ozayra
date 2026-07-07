import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, 
    Navigation, 
    Wallet, 
    Clock, 
    Bike, 
    Power, 
    Target, 
    Layers, 
    Zap,
    IndianRupee, 
    TrendingUp, 
    Star, 
    ChevronRight,
    MapPin,
    User
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { GoogleMap, Marker } from '@react-google-maps/api';

import DriverBottomNav from '../../shared/components/DriverBottomNav';
import api from '../../../shared/api/axiosInstance';
import { useSettings } from '../../../shared/context/SettingsContext';

// Vehicle Icons for Map
import BikeIcon from '../../../assets/icons/bike.png';
import CarIcon from '../../../assets/icons/car.png';
import AutoIcon from '../../../assets/icons/auto.png';
import TruckIcon from '../../../assets/icons/truck.png';
import EhcvIcon from '../../../assets/icons/ehcv.png';
import HcvIcon from '../../../assets/icons/hcv.png';
import LcvIcon from '../../../assets/icons/LCV.png';
import McvIcon from '../../../assets/icons/mcv.png';
import LuxuryIcon from '../../../assets/icons/Luxury.png';
import PremiumIcon from '../../../assets/icons/Premium.png';
import SuvIcon from '../../../assets/icons/SUV.png';

import { socketService } from '../../../shared/api/socket';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader, RAPIDO_MAP_STYLE } from '../../admin/utils/googleMaps';
import { getCurrentDriver, getLocalDriverToken } from '../services/registrationService';

const Motion = motion;

const containerStyle = {
    width: '100%',
    height: '100%'
};

const DEFAULT_MAP_CENTER = {
    lat: 22.7196,
    lng: 75.8577 
};

const DEFAULT_MAP_COORDS = [75.8577, 22.7196];

const getCurrentCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Location is not available on this device.'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        () => reject(new Error('Please allow location permission to go online.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
});

const toLatLng = (coordinates) => {
    const [lng, lat] = coordinates || [];

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return DEFAULT_MAP_CENTER;
    }

    return { lat: Number(lat), lng: Number(lng) };
};

const getMapIconForVehicle = (iconType = '') => {
    const value = String(iconType).toLowerCase();

    if (value.includes('bike')) return '/1_Bike.png';
    if (value.includes('auto')) return '/2_AutoRickshaw.png';
    if (value.includes('ehc')) return '/ehcv.png';
    if (value.includes('hcv')) return '/hcv.png';
    if (value.includes('lcv')) return '/LCV.png';
    if (value.includes('mcv')) return '/mcv.png';
    if (value.includes('truck')) return '/truck.png';
    if (value.includes('lux')) return '/Luxury.png';
    if (value.includes('premium')) return '/Premium.png';
    if (value.includes('suv')) return '/SUV.png';

    return '/4_Taxi.png';
};

const formatPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
};

const normalizeJobType = (job = {}) => {
    const value = String(job.type || job.serviceType || 'ride').toLowerCase();
    if (value === 'parcel') return 'parcel';
    if (value === 'intercity') return 'intercity';
    return 'ride';
};

const getJobTitle = (type) => {
    if (type === 'parcel') return 'Delivery';
    if (type === 'intercity') return 'Intercity Ride';
    return 'Taxi Ride';
};

const formatTripDistance = (job = {}) => {
    const estimatedMeters = Number(job.estimatedDistanceMeters || job.raw?.estimatedDistanceMeters || 0);

    if (Number.isFinite(estimatedMeters) && estimatedMeters > 0) {
        return estimatedMeters < 1000
            ? `${Math.max(50, Math.round(estimatedMeters / 10) * 10)} m`
            : `${(estimatedMeters / 1000).toFixed(estimatedMeters >= 10000 ? 0 : 1)} km`;
    }

    if (job.intercity?.distance) {
        return `${job.intercity.distance} km`;
    }

    if (job.raw?.intercity?.distance) {
        return `${job.raw.intercity.distance} km`;
    }

    if (job.radius) {
        return `within ${(Number(job.radius) / 1000).toFixed(1)} km`;
    }

    if (job.raw?.radius) {
        return `within ${(Number(job.raw.radius) / 1000).toFixed(1)} km`;
    }

    return 'nearby';
};

const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;
const withDriverAuthorization = (token) => (
    token
        ? {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
        : {}
);


const DriverHome = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings.general?.app_name || 'App';
    const appLogo = settings.general?.logo || settings.customization?.logo;
    
    // Consume shared driver layout context
    const {
        isOnline,
        goOnline,
        goOffline,
        driverCoords,
        statusMessage,
        setStatusMessage,
        walletSummary,
        vehicleIconType
    } = useOutletContext();

    const [completedRides, setCompletedRides] = useState(0);
    const [dutySeconds, setDutySeconds] = useState(0);
    const [map, setMap] = useState(null);
    const [isHydratingDriver, setIsHydratingDriver] = useState(false);
    
    const driverPosition = useMemo(() => toLatLng(driverCoords || DEFAULT_MAP_COORDS), [driverCoords]);
    const mapVehicleIcon = useMemo(
        () => getMapIconForVehicle(vehicleIconType),
        [vehicleIconType],
    );

    const { isLoaded } = useAppGoogleMapsLoader();

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback() {
        setMap(null);
    }, []);

    const mapOptions = useMemo(() => ({
        styles: RAPIDO_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false
    }), []);

    const updateDriverLocation = useCallback(async ({ quiet = false } = {}) => {
        try {
            const coordinates = await getCurrentCoords();
            map?.panTo(toLatLng(coordinates));
            return coordinates;
        } catch (error) {
            if (!quiet) {
                setStatusMessage(error.message || 'Could not fetch current location.');
            }
            throw error;
        }
    }, [map, setStatusMessage]);

    useEffect(() => {
        if (map && driverCoords) {
            map.panTo(toLatLng(driverCoords));
        }
    }, [map, driverCoords]);


    useEffect(() => {
        let interval;
        if (isOnline) {
            interval = setInterval(() => setDutySeconds(s => s + 1), 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isOnline]);

    const dutyHours = Math.floor(dutySeconds / 3600);
    const dutyMins = Math.floor((dutySeconds % 3600) / 60);

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans select-none overflow-hidden relative pb-20 text-slate-900 outline-none focus:outline-none [&_*]:outline-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <header className="fixed top-0 left-0 right-0 px-6 pt-6 pb-2.5 flex items-center justify-between z-50 bg-white/20 backdrop-blur-md border-b border-white/10 shadow-sm">
                <div className="flex items-center gap-3 pt-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all shadow-sm ${
                        isHydratingDriver ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 
                        isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 
                        'bg-slate-500/10 border-slate-500/20 text-slate-500'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${isHydratingDriver ? 'bg-amber-500 animate-pulse' : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="text-[11px] font-black tracking-widest uppercase leading-none mt-0.5">
                            {isHydratingDriver ? 'Syncing' : isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/taxi/driver/notifications')} className="w-9 h-9 bg-white rounded-xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-600 relative active:scale-95 transition-all">
                        <Bell size={16} strokeWidth={2.5} />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    </button>
                    <div onClick={() => navigate('/taxi/driver/profile')} className="w-9 h-9 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center shadow-inner cursor-pointer active:scale-95 transition-all overflow-hidden">
                         <User size={20} className="text-slate-300" />
                    </div>
                </div>
            </header>

            <div className="absolute inset-0 z-0 h-full bg-[#E5E7EB] overflow-hidden">
                {HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
                    <GoogleMap mapContainerStyle={containerStyle} center={driverPosition} zoom={15} onLoad={onLoad} onUnmount={onUnmount} options={mapOptions}>
                        <Marker position={driverPosition} icon={{ url: mapVehicleIcon, scaledSize: new window.google.maps.Size(40, 40), anchor: new window.google.maps.Point(20, 20)}} />
                    </GoogleMap>
                ) : <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-medium text-xs">Map unavailable until Google Maps key is configured</div>}
                <div className="absolute right-5 top-28 flex flex-col gap-2 z-20">
                    <button onClick={() => updateDriverLocation()} className="w-9 h-9 bg-white shadow-lg rounded-xl flex items-center justify-center text-slate-800 border border-slate-50 active:scale-90 transition-all"><Target size={16} /></button>
                    <button className="w-9 h-9 bg-white shadow-lg rounded-xl flex items-center justify-center text-slate-800 border border-slate-50 active:scale-90 transition-all"><Layers size={16} /></button>
                </div>
            </div>

            <div className="absolute bottom-[5.5rem] left-0 right-0 px-4 z-30">
                <Motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/40 backdrop-blur-md rounded-[2rem] p-4 shadow-xl border border-white/20">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/40 p-3 rounded-2xl border border-white/30 flex flex-col gap-0.5 backdrop-blur-sm">
                             <div className="flex items-center gap-1 opacity-60"><IndianRupee size={10} className="text-emerald-500" /><span className="text-[10px] font-medium text-slate-500">Wallet</span></div>
                             <p className={`text-xl font-bold tracking-tight leading-none ${walletSummary.isBlocked ? 'text-rose-600' : 'text-slate-900'}`}>
                                Rs {Number(walletSummary.balance || 0).toFixed(2)}
                             </p>
                        </div>
                        <div className="bg-white/40 p-3 rounded-2xl border border-white/30 flex flex-col gap-0.5 backdrop-blur-sm">
                             <div className="flex items-center gap-1 opacity-60"><Clock size={10} className="text-blue-500" /><span className="text-[10px] font-medium text-slate-500">Duty Time</span></div>
                             <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">{dutyHours}h {dutyMins}m</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-2 mb-4">
                          <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Bike size={14} /></div>
                              <div className="leading-tight"><h5 className="text-[13px] font-bold text-slate-800 leading-none">{completedRides} Trips</h5><p className="text-[10px] font-medium text-slate-400 mt-0.5">Completed Today</p></div>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500"><Star size={14} /></div>
                              <div className="leading-tight text-right"><h5 className="text-[13px] font-bold text-slate-800 leading-none">4.95</h5><p className="text-[10px] font-medium text-slate-400 mt-0.5">Avg. Rating</p></div>
                          </div>
                    </div>
                    {statusMessage && (
                        <p className="px-2 pb-3 text-[11px] font-medium text-slate-400 text-center">{statusMessage}</p>
                    )}
                    <Motion.button disabled={isHydratingDriver} whileTap={isHydratingDriver ? undefined : { scale: 0.98 }} onClick={isOnline ? goOffline : goOnline} className={`w-full h-13 rounded-xl flex items-center justify-center gap-3 text-[15px] font-bold transition-all shadow-lg relative ${isOnline ? 'bg-rose-600 text-white shadow-rose-600/10' : 'bg-slate-900 text-white shadow-slate-900/10'} ${isHydratingDriver ? 'opacity-70' : ''}`}>
                         <Power size={18} strokeWidth={2.5} className={isOnline || isHydratingDriver ? 'animate-pulse' : ''} />{isHydratingDriver ? 'Syncing Status...' : isOnline ? 'End Your Duty' : 'Go Online Now'}
                    </Motion.button>
                </Motion.div>
            </div>

            <DriverBottomNav />
        </div>
    );
};

export default DriverHome;
