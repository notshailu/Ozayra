import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import { getSavedTaxiLocation, TAXI_LOCATION_UPDATED_EVENT } from '../services/savedLocation';

const FALLBACK_DESTINATIONS = [
  { title: 'LBS International Airport', image: '/varanasi_airport.png', label: '25 min', code: 'VNS', address: 'Lal Bahadur Shastri International Airport, Babatpur, Varanasi, Uttar Pradesh 221006', latitude: 25.4497, longitude: 82.8596, description: 'Lal Bahadur Shastri International Airport is a public airport located at Babatpur, 26 km northwest of Varanasi.' },
  { title: 'Varanasi Junction', image: '/varanasi_junction.png', label: '15 min', code: 'BSB', address: 'Varanasi Junction railway station, maa durga mandir, Cantt, Varanasi, Uttar Pradesh 221002', latitude: 25.3262, longitude: 82.9868, description: 'Varanasi Junction, also known as Varanasi Cantt Railway Station, is the main railway station serving the city of Varanasi. It is one of the busiest railway stations in Uttar Pradesh.' },
  { title: 'Dashashwamedh Ghat', image: '/dashashwamedh_ghat.png', label: '10 min', code: 'GHT', address: 'Dashashwamedh Ghat, Godowlia, Varanasi, Uttar Pradesh 221001', latitude: 25.3061, longitude: 83.0104, description: 'Dashashwamedh Ghat is the main ghat in Varanasi on the Ganga River. It is located close to Vishwanath Temple and is probably the most spectacular ghat.' },
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
  const factor = distanceInKm > 15 ? 1.5 : 2.2;
  const minutes = Math.round(distanceInKm * factor);
  return Math.max(2, minutes);
};

const ExplorerSection = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [showAll, setShowAll] = useState(false);

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

    // Sync using saved location only; do not prompt browser permissions on load

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
    navigate('/taxi/user/explorer-details', { state: { dest } });
  };

  return (
    <div className="px-5 mt-8">
      <div className="flex items-center justify-between mb-5">
        <div className="ml-1">
          <h2 className="text-[20px] font-bold text-slate-700 tracking-tight">Explore Varanasi</h2>
          <p className="mt-0.5 text-[12px] font-medium text-gray-500">
            Popular destinations near your zone
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-5 pr-5 -mr-5">
        {displayDestinations.map((city, idx) => (
          <div 
            key={idx} 
            onClick={() => handleDestinationClick(city)}
            className="flex-shrink-0 w-[240px] group transition-all active:scale-[0.98] cursor-pointer"
          >
            {/* Classy Card Container */}
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              {/* Image Section */}
              <div className="relative h-[130px] overflow-hidden bg-gray-100">
                <img
                  src={city.image || '/varanasi_airport.png'}
                  alt={city.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                {city.code && (
                  <div className="absolute top-3 right-3 bg-yellow-400 px-2 py-0.5 rounded shadow-sm z-10">
                    <p className="text-[10px] font-bold text-gray-900 tracking-wide uppercase">{city.code}</p>
                  </div>
                )}
                
                {/* Distance overlay */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white z-10">
                   <div className="bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 border border-white/20">
                     <MapPin size={10} className="text-yellow-400" />
                     <span className="text-[9px] font-bold tracking-wider uppercase">{getDynamicLabel(city)}</span>
                   </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[14px] font-bold text-slate-700 leading-tight truncate flex-1">
                    {city.title}
                  </h4>
                  <div className="w-6 h-6 rounded-full bg-gray-50 flex flex-shrink-0 items-center justify-center text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div 
          onClick={() => setShowAll(true)}
          className="flex-shrink-0 w-[120px] flex flex-col justify-center items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl active:scale-95 transition-all text-gray-600 font-bold h-full self-stretch cursor-pointer hover:bg-gray-100"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center">
            <ArrowRight size={18} strokeWidth={2.5} className="text-gray-400" />
          </div>
          <span className="text-[12px] uppercase tracking-widest text-gray-500">View All</span>
        </div>
      </div>

      {showAll && (
        <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto no-scrollbar pb-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-gray-200 flex items-center gap-4 shadow-sm">
            <button 
              onClick={() => setShowAll(false)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-all text-gray-600 hover:bg-gray-200"
            >
              <ArrowRight size={20} strokeWidth={2.5} className="rotate-180" />
            </button>
            <div>
              <h2 className="text-[18px] font-bold text-slate-700 tracking-tight leading-tight">All Destinations</h2>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Explore places
              </p>
            </div>
          </div>
          
          <div className="px-5 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayDestinations.map((city, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  setShowAll(false);
                  handleDestinationClick(city);
                }}
                className="group transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  {/* Image Section */}
                  <div className="relative h-[160px] overflow-hidden bg-gray-100">
                    <img
                      src={city.image || '/varanasi_airport.png'}
                      alt={city.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    {city.code && (
                      <div className="absolute top-4 right-4 bg-yellow-400 px-2.5 py-1 rounded shadow-sm z-10">
                        <p className="text-[11px] font-bold text-gray-900 tracking-wide uppercase">{city.code}</p>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h4 className="text-[18px] font-bold text-white leading-tight drop-shadow-md">
                        {city.title}
                      </h4>
                      <div className="mt-2 flex items-center gap-1.5 text-white/90">
                        <MapPin size={12} className="text-yellow-400" />
                        <p className="text-[12px] font-medium tracking-wide drop-shadow-md">
                          {getDynamicLabel(city)} away
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorerSection;
