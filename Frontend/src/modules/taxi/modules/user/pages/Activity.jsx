import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Headset, Loader2 } from 'lucide-react';
import BottomNavbar from '../components/BottomNavbar';
import api from '../../../shared/api/axiosInstance';
import { hasLocalUserToken } from '../services/authService';

const TABS = ['All', 'Rides', 'Parcels', 'Support'];

const unwrap = (response) => response?.data || response;

const formatRideDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatRideTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatStatus = (status) => {
  const normalized = String(status || 'searching').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getRideTimeSource = (ride) => ride.completedAt || ride.startedAt || ride.acceptedAt || ride.createdAt || ride.updatedAt;

const coordLabel = (location, fallback) => {
  if (location?.address) return location.address;
  if (location?.name) return location.name;
  
  const coords = location?.coordinates || [];
  const [lng, lat] = coords;

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  }

  return fallback;
};

const normalizeRide = (ride) => {
  const timeSource = getRideTimeSource(ride);
  const driverName = ride.driver?.name || 'Captain';
  const vehicle = ride.driver?.vehicleType || ride.vehicleIconType || 'Ride';
  const status = formatStatus(ride.status || ride.liveStatus);
  const pickup = coordLabel(ride.pickupLocation, 'Pickup');
  const drop = coordLabel(ride.dropLocation, 'Drop');

  return {
    id: ride.rideId || ride._id || ride.id,
    type: 'ride',
    title: status === 'Searching' ? 'Ride request' : `Ride with ${driverName}`,
    address: `${pickup} to ${drop}`,
    date: formatRideDate(timeSource),
    time: formatRideTime(timeSource),
    status,
    price: Number(ride.fare || 0).toFixed(0),
    ride,
    vehicle,
  };
};

const ActivityItem = ({ type, title, address, date, time, status, price, onClick }) => {
  const isCompleted = status === 'Completed';
  const isCancelled = status === 'Cancelled';
  
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 border border-slate-100 flex items-start gap-4 cursor-pointer transition-all active:bg-slate-50 shadow-sm"
    >
      <div className="w-12 h-12 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
        <img
          src={type === 'ride' ? '/1_Bike.png' : '/5_Parcel.png'}
          alt={type === 'ride' ? 'Ride' : 'Parcel'}
          className="h-7 w-7 object-contain mix-blend-multiply"
          draggable={false}
        />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{title}</h4>
            <p className="text-[13px] text-slate-500 mt-1 truncate max-w-[210px]">{address}</p>
          </div>
          <span className="text-[15px] font-semibold text-slate-900 shrink-0">₹{price}</span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <span>{date}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{time}</span>
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isCompleted
                ? 'text-emerald-600'
                : isCancelled
                  ? 'text-rose-500'
                  : 'text-amber-500'
            }`}
          >
            {status}
          </span>
        </div>
      </div>
    </motion.button>
  );
};

const Activity = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';

  useEffect(() => {
    let active = true;

    const loadRideHistory = async () => {
      if (!hasLocalUserToken()) {
        setActivities([]);
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.get('/rides?limit=100');
        const payload = unwrap(response);
        const rides = payload?.results || payload?.data?.results || [];

        if (!active) {
          return;
        }

        setActivities(rides.map(normalizeRide).filter((ride) => ride.id));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError?.message || 'Could not load your ride history.');
        setActivities([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRideHistory();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((activity) => {
      if (activeTab === 'All') return true;
      if (activeTab === 'Rides') return activity.type === 'ride';
      if (activeTab === 'Parcels') return activity.type === 'parcel';
      return false;
    });
  }, [activeTab, activities]);

  const handleItemClick = (item) => {
    if (item.type === 'parcel') {
      navigate(`${routePrefix}/parcel/detail/${item.id}`);
    } else {
      navigate(`${routePrefix}/ride/detail/${item.id}`, { state: { ride: item.ride } });
    }
  };

  const helperText = activeTab === 'Support' ? 'Tickets and help requests' : 'Your recent trips and deliveries';

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto flex flex-col font-sans pb-24 relative overflow-hidden">
      <header className="bg-white sticky top-0 z-20 border-b border-slate-100">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all text-slate-900 hover:bg-slate-50 rounded-full">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[16px] font-semibold text-slate-900">Recent activity</h1>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">{helperText}</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-5 py-2 rounded-full text-[13px] font-medium transition-all active:scale-[0.98] ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 pt-5">
        {activeTab === 'Support' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-4"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Headset size={28} className="text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[16px] font-semibold text-slate-900">No support tickets</h3>
              <p className="text-[13px] text-slate-500">You haven't raised any support tickets yet.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${routePrefix}/support`)}
              className="mt-4 bg-slate-900 text-white px-6 py-2.5 rounded-full text-[13px] font-medium active:scale-95 transition-all shadow-sm"
            >
              Contact Us
            </button>
          </motion.div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 animate-pulse">
            <Loader2 size={24} className="animate-spin text-slate-400" strokeWidth={2.5} />
            <p className="text-[14px] text-slate-500">Loading your trips...</p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-3"
          >
            <AlertCircle size={32} className="text-red-400" strokeWidth={2} />
            <p className="text-[14px] text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 bg-slate-100 text-slate-900 px-6 py-2.5 rounded-full text-[13px] font-medium active:scale-95 transition-all"
            >
              Retry
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-[24px] font-light">
              —
            </div>
            <p className="text-[14px] text-slate-500">No {activeTab.toLowerCase()} found</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((activity) => (
              <ActivityItem key={activity.id} {...activity} onClick={() => handleItemClick(activity)} />
            ))}
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Activity;
