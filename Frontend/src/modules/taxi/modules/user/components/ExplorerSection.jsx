import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import { getSavedTaxiLocation, TAXI_LOCATION_UPDATED_EVENT } from '../services/savedLocation';

const FALLBACK_DESTINATIONS = [
  { title: 'LBS International Airport', image: '/varanasi_airport.png', label: '25 min', code: 'VNS', address: 'Lal Bahadur Shastri International Airport, Babatpur, Varanasi, Uttar Pradesh 221006', latitude: 25.4497, longitude: 82.8596 },
  { title: 'Varanasi Junction', image: '/varanasi_junction.png', label: '15 min', code: 'BSB', address: 'Varanasi Junction railway station, maa durga mandir, Cantt, Varanasi, Uttar Pradesh 221002', latitude: 25.3262, longitude: 82.9868 },
  { title: 'Dashashwamedh Ghat', image: '/dashashwamedh_ghat.png', label: '10 min', code: 'GHT', address: 'Dashashwamedh Ghat, Godowlia, Varanasi, Uttar Pradesh 221001', latitude: 25.3061, longitude: 83.0104 },
];

const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const getEstimatedTravelTime = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined || isNaN(distanceInKm)) return null;
  // If distance is long (e.g. > 15km), travel speed is typically faster (highway/peripheral routes).
  // 1.5 min per km corresponds to ~40 km/h average.
  // 2.2 min per km corresponds to ~27 km/h average (city traffic).
  const factor = distanceInKm > 15 ? 1.5 : 2.2;
  const minutes = Math.round(distanceInKm * factor);
  return Math.max(2, minutes);
};

const ExplorerSection = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchDestinations = async () => {
      try {
        const res = await api.get('/explorer-destinations');
        const list = res?.data || res?.results || (Array.isArray(res) ? res : []);
        if (active) {
          const activeList = Array.isArray(list) 
            ? list.filter(item => item.status === 'active' || item.active !== false)
            : [];
          setDestinations(activeList);
        }
      } catch (err) {
        console.error('Failed to fetch explorer destinations:', err);
      }
    };
    fetchDestinations();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncLocationCoords = () => {
      const saved = getSavedTaxiLocation();
      if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
        setUserCoords({ lat: saved.lat, lng: saved.lng });
      }
    };

    syncLocationCoords();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Explorer Geolocation lookup failed:', err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    window.addEventListener('storage', syncLocationCoords);
    window.addEventListener(TAXI_LOCATION_UPDATED_EVENT, syncLocationCoords);

    return () => {
      window.removeEventListener('storage', syncLocationCoords);
      window.removeEventListener(TAXI_LOCATION_UPDATED_EVENT, syncLocationCoords);
    };
  }, []);

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

  const displayDestinations = destinations.length > 0 ? destinations : FALLBACK_DESTINATIONS;

  const handleDestinationClick = (dest) => {
    navigate('/taxi/user/ride/select-location', {
      state: {
        drop: dest.address || dest.title,
        dropCoords: [dest.longitude, dest.latitude],
      },
    });
  };

  return (
    <div className="px-5">
      <div className="mb-3 ml-1">
        <h2 className="text-[19px] font-black text-gray-900 tracking-tight">Explore Varanasi</h2>
        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
          Popular destinations near your current zone
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-5 px-1">
        {displayDestinations.map((city, idx) => (
          <div 
            key={idx} 
            onClick={() => handleDestinationClick(city)}
            className="flex-shrink-0 w-[214px] group transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="rounded-[20px] bg-white/92 border border-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.07)] overflow-hidden h-[136px] transition-all relative">
              <img
                src={city.image || '/varanasi_airport.png'}
                alt={city.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
              {city.code && (
                <div className="absolute top-4 right-4 bg-white/92 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-white/60 z-10">
                  <p className="text-[9px] font-black text-primary tracking-widest uppercase">{city.code}</p>
                </div>
              )}
            </div>
            <div className="mt-3 px-2">
              <h4 className="text-[15px] font-black text-gray-900 leading-tight tracking-tight flex items-center justify-between">
                {city.title}
                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <ArrowRight size={14} strokeWidth={2.5} />
                </div>
              </h4>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-tight">
                Just {getDynamicLabel(city)} from your location
              </p>
            </div>
          </div>
        ))}

        <div 
          onClick={() => navigate('/taxi/user/ride/select-location')}
          className="flex-shrink-0 w-[128px] flex flex-col justify-center items-center gap-2 bg-white/75 border border-white/80 rounded-[18px] active:scale-95 transition-all text-slate-500 font-black h-[136px] self-start shadow-[0_14px_32px_rgba(15,23,42,0.05)] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-white/80 shadow-sm flex items-center justify-center">
            <ArrowRight size={18} strokeWidth={2.5} className="text-slate-300" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em]">View All</span>
        </div>
      </div>
    </div>
  );
};

export default ExplorerSection;
