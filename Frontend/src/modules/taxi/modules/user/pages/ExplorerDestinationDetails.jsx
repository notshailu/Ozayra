import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, ArrowRight, Sparkles, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSavedTaxiLocation } from '../services/savedLocation';

const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getEstimatedTravelTime = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined || isNaN(distanceInKm)) return null;
  const factor = distanceInKm > 15 ? 1.5 : 2.2;
  const minutes = Math.round(distanceInKm * factor);
  return Math.max(2, minutes);
};

const ExplorerDestinationDetails = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [userCoords, setUserCoords] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const dest = state?.dest;
  const images = Array.isArray(dest?.images) && dest.images.length > 0 
    ? dest.images 
    : [dest?.image || '/varanasi_airport.png'];

  useEffect(() => {
    if (!dest) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [dest, images.length]);

  useEffect(() => {
    if (!dest) {
      navigate('/taxi/user');
      return;
    }

    const saved = getSavedTaxiLocation();
    if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
      setUserCoords({ lat: saved.lat, lng: saved.lng });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [dest, navigate]);

  if (!dest) return null;

  const getDynamicLabel = (city) => {
    if (userCoords && Number.isFinite(city.latitude) && Number.isFinite(city.longitude)) {
      const distance = getHaversineDistance(userCoords.lat, userCoords.lng, city.latitude, city.longitude);
      const minutes = getEstimatedTravelTime(distance);
      if (minutes) {
        return `${minutes} min`;
      }
    }
    return city.label || 'few mins';
  };

  const handleStartTrip = () => {
    navigate('/taxi/user/ride/select-location', {
      state: {
        drop: dest.address || dest.title,
        dropCoords: [dest.longitude, dest.latitude],
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative pb-28 overflow-x-hidden font-sans">
      {/* Dynamic Header Image Carousel */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-[45vh] min-h-[350px] w-full overflow-hidden"
      >
        <AnimatePresence mode="popLayout">
          <motion.img 
            key={currentImageIndex}
            src={images[currentImageIndex]} 
            alt={`${dest.title} - ${currentImageIndex + 1}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        
        {/* Simple gradient fade to background color */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-slate-50" />
        
        {/* Carousel Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-2 z-20">
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} 
              />
            ))}
          </div>
        )}
        
        {/* Top Navbar */}
        <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-sm border border-white/20 active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
        </div>
      </motion.div>

      {/* Main Content Area overlapping the image */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100 }}
        className="flex-1 px-5 -mt-28 z-20 relative space-y-4"
      >
        {/* Title Solid Card */}
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100/60 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 relative z-10">
            {dest.code && (
              <span className="bg-[#FACC15] text-slate-900 px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase">
                {dest.code}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-yellow-800 text-[12px] font-bold bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200/50">
              <Clock size={14} className="text-yellow-600" />
              {getDynamicLabel(dest)} away
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 leading-[1.1] tracking-tight relative z-10">
            {dest.title}
          </h1>
        </div>

        {/* Info Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
            <MapPin size={22} strokeWidth={2.5} />
          </div>
          <div className="pt-0.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Destination Address</h4>
            <p className="text-[14px] text-slate-800 leading-relaxed font-semibold">
              {dest.address || dest.title}
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-[#FFFDF0] rounded-3xl p-5 border border-yellow-100 shadow-sm relative overflow-hidden"
        >
          <Sparkles size={140} className="absolute -right-10 -bottom-10 text-yellow-500/10 rotate-12 pointer-events-none" />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700">
              <Navigation size={16} strokeWidth={2.5} />
            </div>
            <h4 className="text-[14px] font-bold text-slate-900 tracking-wide">About the Trip</h4>
          </div>
          <p className="text-[14px] text-slate-800 leading-relaxed font-medium">
            Ready to explore? Book a comfortable ride directly to <span className="font-bold text-slate-900">{dest.title}</span>. We'll fetch the best drivers near you to ensure a smooth, hassle-free journey.
          </p>
        </motion.div>

        {dest.description && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-2"
          >
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">More Information</h4>
            <p className="text-[14px] text-slate-800 leading-relaxed font-medium whitespace-pre-line">
              {dest.description}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Fixed Bottom Button */}
      <motion.div 
        initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.4, type: "spring", stiffness: 120 }}
        className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white/95 to-white/0 pt-10 pb-safe z-50 pointer-events-none"
      >
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button 
            onClick={handleStartTrip}
            className="w-full h-[60px] bg-[#FACC15] text-slate-900 font-bold text-[16px] rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <span>Book Ride to Here</span>
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
              <ArrowRight size={18} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ExplorerDestinationDetails;
