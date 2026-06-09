import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, MessageSquare, Receipt, Share2, Star } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';
import { clearCurrentRide, getCurrentRide } from '../../services/currentRideService';
import carIcon from '../../../../assets/icons/car.png';
import bikeIcon from '../../../../assets/icons/bike.png';
import autoIcon from '../../../../assets/icons/auto.png';
import deliveryIcon from '../../../../assets/icons/Delivery.png';

const TIP_OPTIONS = [0, 20, 50, 100];

const getInitials = (name = '') =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'DR';

const isLikelyVehiclePhoto = (value = '') => /^(https?:|data:image\/|blob:|\/uploads\/|\/images\/)/i.test(String(value || '').trim());

const getVehicleIcon = (serviceType = 'ride', driver = {}) => {
  const normalizedService = String(serviceType || '').toLowerCase();
  const iconType = String(driver.vehicleIconType || driver.vehicleType || '').toLowerCase();

  if (normalizedService === 'parcel') return deliveryIcon;
  if (iconType.includes('bike')) return bikeIcon;
  if (iconType.includes('auto')) return autoIcon;
  return carIcon;
};

const RideComplete = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storedRide = useMemo(() => getCurrentRide(), []);
  const state = useMemo(() => location.state || storedRide || {}, [location.state, storedRide]);

  const [rating, setRating] = useState(() => Number(state.feedback?.rating || 0));
  const [comment, setComment] = useState(() => state.feedback?.comment || '');
  const [selectedTip, setSelectedTip] = useState(() => Number(state.feedback?.tipAmount || 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(Boolean(state.feedback?.submittedAt));
  const [shareToast, setShareToast] = useState(false);
  const [error, setError] = useState('');
  const [vehicleImageBroken, setVehicleImageBroken] = useState(false);
  const [tipSettings, setTipSettings] = useState({
    enable_tips: '1',
    min_tip_amount: '10',
  });

  const routeHome = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '/';
  const rideId = state.rideId || '';
  const fare = Number(state.fare || 22);
  const paymentMethod = state.paymentMethod || 'Cash';
  const pickup = state.pickup || 'Pickup';
  const drop = state.drop || 'Drop';
  const serviceType = String(state.serviceType || state.type || 'ride').toLowerCase();
  const driver = state.driver || {
    name: 'Captain',
    rating: '4.9',
    vehicle: serviceType === 'parcel' ? 'Delivery' : 'Taxi',
    plate: 'Assigned',
    profileImage: '',
    vehicleImage: '',
  };

  const driverImage = driver.profileImage || '';
  const vehicleLabel = driver.vehicle || driver.vehicleType || (serviceType === 'parcel' ? 'Delivery' : 'Taxi');
  const hasVehiclePhoto = isLikelyVehiclePhoto(driver.vehicleImage) && !vehicleImageBroken;
  const vehicleVisual = hasVehiclePhoto ? driver.vehicleImage : getVehicleIcon(serviceType, driver);
  const totalBill = fare + Number(selectedTip || 0);
  const tipsEnabled = String(tipSettings.enable_tips || '1') === '1';
  const minimumTipAmount = Number(tipSettings.min_tip_amount || 0);
  const availableTipOptions = useMemo(() => {
    if (!tipsEnabled) {
      return [0];
    }

    const nextOptions = [...new Set([0, minimumTipAmount, ...TIP_OPTIONS].filter((amount) => Number.isFinite(amount) && amount >= 0))]
      .sort((left, right) => left - right);

    return nextOptions;
  }, [minimumTipAmount, tipsEnabled]);
  const rideDate = new Date(state.completedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const rideTime = new Date(state.completedAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  useEffect(() => {
    clearCurrentRide();
  }, []);

  useEffect(() => {
    const fetchTipSettings = async () => {
      try {
        const response = await api.get('/rides/app-settings/tip');
        const nextSettings = response?.data?.settings || response?.settings || {};
        setTipSettings((current) => ({
          ...current,
          ...nextSettings,
        }));
      } catch (tipError) {
        console.error('Failed to load tip settings:', tipError);
      }
    };

    fetchTipSettings();
  }, []);

  useEffect(() => {
    setVehicleImageBroken(false);
  }, [driver.vehicleImage]);

  useEffect(() => {
    if (!tipsEnabled && selectedTip !== 0) {
      setSelectedTip(0);
      return;
    }

    if (
      tipsEnabled &&
      Number.isFinite(minimumTipAmount) &&
      minimumTipAmount > 0 &&
      selectedTip > 0 &&
      selectedTip < minimumTipAmount
    ) {
      setSelectedTip(minimumTipAmount);
    }
  }, [minimumTipAmount, selectedTip, tipsEnabled]);

  useEffect(() => {
    if (!rideId && !isSubmitted) {
      navigate(routeHome, { replace: true });
    }
  }, [isSubmitted, navigate, rideId, routeHome]);

  const handleShare = () => {
    const text = `Rydon24 Receipt\n${rideDate} ${rideTime}\nDriver: ${driver.name}\nFrom: ${pickup}\nTo: ${drop}\nTotal: Rs ${totalBill}`;

    if (navigator.share) {
      navigator.share({ title: 'Rydon24 Receipt', text }).catch(() => {});
      return;
    }

    navigator.clipboard?.writeText(text).then(() => {
      setShareToast(true);
      window.setTimeout(() => setShareToast(false), 2200);
    });
  };

  const submitFeedback = async () => {
    if (!rideId) {
      navigate(routeHome, { replace: true });
      return;
    }

    if (rating < 1) {
      setError('Please rate your driver before finishing.');
      return;
    }

    if (!tipsEnabled && Number(selectedTip || 0) > 0) {
      setError('Tips are currently disabled.');
      return;
    }

    if (tipsEnabled && Number(selectedTip || 0) > 0 && minimumTipAmount > 0 && Number(selectedTip || 0) < minimumTipAmount) {
      setError(`Minimum tip amount is Rs ${minimumTipAmount}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const response = await api.patch(`/rides/${rideId}/feedback`, {
        rating,
        comment,
        tipAmount: selectedTip || 0,
      });

      const payload = response?.data?.data || response?.data || response;
      if (payload?.feedback) {
        setComment(payload.feedback.comment || comment);
      }
      setIsSubmitted(true);
      window.setTimeout(() => {
        navigate(routeHome, { replace: true });
      }, 1200);
    } catch (submitError) {
      setError(submitError?.message || 'Could not submit feedback right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative overflow-x-hidden font-sans">
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-6 py-3 text-[13px] font-medium text-white shadow-xl"
          >
            Receipt copied
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm max-w-md mx-auto"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <p className="text-xl font-bold text-slate-900">Thanks for your feedback</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {serviceType === 'parcel' ? 'Package Delivered' : 'You have arrived'}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {rideDate} at {rideTime}
          </p>
        </div>

        <hr className="border-slate-100" />

        {/* Driver & Vehicle */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
            {driverImage ? (
              <img src={driverImage} alt={driver.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-200 text-lg font-bold text-slate-600">
                {getInitials(driver.name)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-900 truncate">{driver.name}</p>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mt-0.5">
              <span>{driver.rating || '4.9'} <Star size={12} className="inline-block text-amber-400 fill-amber-400 -mt-0.5" /></span>
              <span>•</span>
              <span>{driver.vehicleNumber || driver.plate || 'Assigned'}</span>
            </div>
          </div>
          <div className="h-10 shrink-0">
            <img src={vehicleVisual} alt="Vehicle" className="h-full w-auto object-contain" onError={() => setVehicleImageBroken(true)} />
          </div>
        </div>

        {/* Locations */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center mt-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
            <div className="w-0.5 h-10 bg-slate-200 my-1" />
            <div className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 line-clamp-2">{pickup}</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Pickup</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 line-clamp-2">{drop}</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Dropoff</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Fare Details */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium text-slate-500">
            <span>Base Fare</span>
            <span className="text-slate-900">Rs {fare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
            <span className="text-base font-bold text-slate-900">Total ({paymentMethod})</span>
            <span className="text-xl font-bold text-slate-900">Rs {totalBill.toFixed(2)}</span>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Rating section */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Rate your trip</h3>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setRating(value);
                    setError('');
                  }}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star 
                    size={36} 
                    strokeWidth={1.5}
                    className={rating >= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-50'} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Leave a note for your driver (optional)"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && <p className="text-center text-sm font-bold text-rose-500">{error}</p>}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={submitFeedback}
            disabled={isSubmitting || isSubmitted}
            className="w-full rounded-xl bg-slate-900 py-3.5 text-base font-bold text-white transition-opacity active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
          
          <div className="flex gap-3">
             <button
               type="button"
               onClick={handleShare}
               className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 active:bg-slate-200"
             >
               <Share2 size={16} /> Share Receipt
             </button>
             <button
               type="button"
               onClick={() => navigate(routeHome, { replace: true })}
               className="flex-1 rounded-xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 active:bg-slate-200"
             >
               Skip
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideComplete;
