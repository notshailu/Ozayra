import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react';

const Motion = motion;

const normalizePayment = (value = '') => String(value || 'cash').toUpperCase();

const IncomingRideRequest = ({ visible, onAccept, onDecline, requestData, isAccepting = false }) => {
  const [timer, setTimer] = useState(15);
  const slideX = useMotionValue(0);
  const slideFillWidth = useTransform(slideX, [0, 180], ['58px', '100%']);
  const data = requestData;

  const onDeclineRef = useRef(onDecline);

  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);

  useEffect(() => {
    let interval;
    if (visible) {
      setTimer(15);
      interval = setInterval(() => {
        setTimer((current) => {
          if (current <= 1) {
            onDeclineRef.current?.();
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [visible]);

  useEffect(() => {
    slideX.set(0);
  }, [slideX, visible, data?.rideId]);

  if (!visible || !data) return null;

  const isParcel = data.type === 'parcel';
  const isIntercity = data.type === 'intercity';
  const title = isParcel ? 'Delivery Request' : isIntercity ? 'Intercity Request' : 'Ride Request';
  const intercityRoute = [data.raw?.intercity?.fromCity, data.raw?.intercity?.toCity].filter(Boolean).join(' to ');
  const category = data.raw?.parcel?.category || data.raw?.parcel?.weight || (isParcel ? 'Parcel delivery' : isIntercity ? intercityRoute || 'Intercity trip' : 'Passenger ride');
  const payment = normalizePayment(data.payment);
  const timerProgress = Math.max(0, Math.min(100, (timer / 15) * 100));

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference;

  const getVehicleIconPath = (type) => {
    const val = String(type).toLowerCase();
    if (val.includes('bike') || val.includes('motorcycle')) return '/1_Bike.png';
    if (val.includes('auto') || val.includes('rickshaw')) return '/2_AutoRickshaw.png';
    if (val.includes('parcel') || val.includes('delivery')) return '/5_Parcel.png';
    return '/4_Taxi.png';
  };
  const iconPath = getVehicleIconPath(data.type || data.raw?.vehicleType);

  const handleSlideEnd = (_event, info) => {
    if (isAccepting) return;

    if (info.offset.x >= 120) {
      slideX.set(180);
      onAccept(data);
      return;
    }

    slideX.set(0);
  };

  return (
    <AnimatePresence mode="wait">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 px-3 pb-6 sm:pb-8 backdrop-blur-sm"
      >
        <Motion.div
          initial={{ y: '100%', scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: '100%', scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-[420px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)] border border-slate-100"
        >
          {/* Rapido Yellow Header */}
          <div className="bg-[#FCB702] px-6 py-4 flex items-center justify-between border-b border-yellow-500/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-yellow-400">
                <img src={iconPath} alt={title} className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-950/65 uppercase tracking-[0.16em] leading-none">
                  {title}
                </span>
                <h2 className="text-[18px] font-black text-slate-950 tracking-tight leading-tight mt-0.5">
                  Incoming Order
                </h2>
              </div>
            </div>

            {/* Circular Progress Timer (Rapido Style) */}
            <div className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white shadow-md border border-slate-50">
              <svg className="absolute inset-0 -rotate-90" width="50" height="50">
                <circle
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="25"
                  cy="25"
                />
                <Motion.circle
                  className="text-[#FCB702]"
                  strokeWidth="3.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="25"
                  cy="25"
                  transition={{ duration: 0.4 }}
                />
              </svg>
              <span className="text-[18px] font-black text-slate-900 z-10">{timer}</span>
            </div>
          </div>

          <div className="px-6 pb-6 pt-5">
            {/* Quick Stats Grid */}
            <div className="mb-6 flex items-center justify-between rounded-[22px] bg-slate-50/70 border border-slate-100/50 p-4 text-center">
               <div className="flex-1 text-left pl-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Distance</p>
                  <p className="text-[16px] font-black text-slate-900 tracking-tight leading-none">{data.distance}</p>
               </div>
               <div className="w-px h-8 bg-slate-200 shrink-0 self-center mx-1" />
               <div className="flex-1 text-center px-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Earnings</p>
                  <p className="text-[22px] font-black text-[#FCB702] leading-none drop-shadow-sm filter saturate-150">
                    {data.fare.replace('Rs', '₹')}
                  </p>
               </div>
               <div className="w-px h-8 bg-slate-200 shrink-0 self-center mx-1" />
               <div className="flex-1 text-right pr-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Payment</p>
                  <p className={`text-[13px] font-black uppercase tracking-wider leading-none ${payment.includes('CASH') ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {payment}
                  </p>
               </div>
            </div>

            {isIntercity && (
              <div className="mb-6 grid grid-cols-3 gap-2 rounded-[18px] border border-yellow-100 bg-yellow-50/70 px-3 py-3">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-yellow-700/60">Trip</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">{data.raw?.intercity?.tripType || 'Intercity'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-yellow-700/60">Date</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">{data.raw?.intercity?.travelDate || 'Today'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-yellow-700/60">Pax</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">{data.raw?.intercity?.passengers || 1}</p>
                </div>
              </div>
            )}

            {/* Journey Timeline */}
            <div className="mb-6 relative bg-slate-50/40 rounded-2xl p-4 border border-slate-100">
              <div className="absolute left-[23px] top-[26px] bottom-[26px] w-[1.5px] border-l-2 border-dashed border-slate-200" />
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-emerald-500 bg-white flex items-center justify-center shadow-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pickup Point</p>
                    <p className="mt-0.5 text-[14px] font-bold leading-tight text-slate-900 truncate">
                      {data.raw?.pickupAddress || data.pickup}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-orange-500 bg-white flex items-center justify-center shadow-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Drop Point</p>
                    <p className="mt-0.5 text-[14px] font-bold leading-tight text-slate-900 truncate">
                      {data.raw?.dropAddress || data.drop}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Rapido Style) */}
            <div className="flex gap-3.5">
              <button
                type="button"
                onClick={onDecline}
                disabled={isAccepting}
                className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-400 shadow-sm active:scale-95 transition-all hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100"
              >
                <X size={24} strokeWidth={2.8} />
              </button>

              <div className="relative h-[60px] flex-1 overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-slate-200">
                <Motion.div style={{ width: slideFillWidth }} className="absolute inset-y-0 left-0 rounded-2xl bg-[#FCB702]" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10">
                  <span className="text-[12px] font-black uppercase tracking-[0.16em] text-white">
                    {isAccepting ? 'Accepting...' : 'Slide to accept'}
                  </span>
                  {!isAccepting && <ArrowRight size={16} className="ml-2 text-white/50 animate-pulse" />}
                </div>
                <Motion.div
                  drag={isAccepting ? false : 'x'}
                  dragConstraints={{ left: 0, right: 180 }}
                  dragElastic={0.05}
                  dragMomentum={false}
                  style={{ x: slideX }}
                  onDragEnd={handleSlideEnd}
                  className="absolute left-1 top-1 z-10 flex h-[52px] w-[52px] cursor-grab items-center justify-center rounded-[12px] bg-[#FCB702] text-slate-950 shadow-md active:cursor-grabbing hover:brightness-105"
                >
                  <ChevronRight size={26} strokeWidth={3} />
                </Motion.div>
              </div>
            </div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
};

export default IncomingRideRequest;
