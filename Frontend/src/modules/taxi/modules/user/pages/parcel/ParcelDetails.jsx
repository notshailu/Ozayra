import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Box, ShieldCheck, ChevronRight, Scale, AlertTriangle, Building2, Route, LoaderCircle, Package } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';

const getWeightIcon = (label = '') => {
  const normalized = label.toLowerCase();
  if (normalized.includes('under') || normalized.includes('light') || normalized.includes('scale') || normalized.includes('5kg') || normalized.includes('2kg')) {
    return Scale;
  }
  return Box;
};

const ParcelDetails = () => {
  const location = useLocation();
  const parcelState = location.state || {};
  const [weightRanges, setWeightRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState(() => parcelState.weight || '');
  const [deliveryScope, setDeliveryScope] = useState(() => parcelState.deliveryScope || 'city');
  const [description, setDescription] = useState(() => parcelState.description || '');
  const [descError, setDescError] = useState('');
  const navigate = useNavigate();
  const parcelType = parcelState.parcelType || 'Documents';

  useEffect(() => {
    let active = true;
    const fetchWeightRanges = async () => {
      try {
        const response = await api.get('/users/set-prices');
        const results = response?.data?.results || response?.data?.data || (Array.isArray(response) ? response : []);
        
        const activeRules = results.filter(
          (rule) =>
            Number(rule.active ?? 1) === 1 &&
            String(rule.status || 'active').toLowerCase() !== 'inactive' &&
            (String(rule.transport_type).toLowerCase() === 'delivery' ||
              String(rule.transport_type).toLowerCase() === 'both')
        );

        const ranges = [];
        const seen = new Set();
        activeRules.forEach((rule) => {
          if (Array.isArray(rule.parcel_weight_ranges)) {
            rule.parcel_weight_ranges.forEach((r) => {
              const name = String(r.weight_range || '').trim();
              if (name && !seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                ranges.push(r);
              }
            });
          }
        });

        if (!active) return;

        if (ranges.length > 0) {
          setWeightRanges(ranges);
          const defaultWeight = parcelState.weight || ranges[0].weight_range;
          const matched = ranges.some(
            (r) => String(r.weight_range).trim().toLowerCase() === String(defaultWeight).trim().toLowerCase()
          );
          setWeight(matched ? defaultWeight : ranges[0].weight_range);
        } else {
          const fallbackRanges = [
            { weight_range: 'Under 5kg', base_price: 45, base_distance: 2, price_per_distance: 15 },
            { weight_range: 'Above 5kg', base_price: 90, base_distance: 2, price_per_distance: 25 },
          ];
          setWeightRanges(fallbackRanges);
          setWeight(parcelState.weight || fallbackRanges[0].weight_range);
        }
      } catch (err) {
        console.error('Error fetching parcel pricing rules:', err);
        if (active) {
          const fallbackRanges = [
            { weight_range: 'Under 5kg', base_price: 45, base_distance: 2, price_per_distance: 15 },
            { weight_range: 'Above 5kg', base_price: 90, base_distance: 2, price_per_distance: 25 },
          ];
          setWeightRanges(fallbackRanges);
          setWeight(parcelState.weight || fallbackRanges[0].weight_range);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchWeightRanges();
    return () => {
      active = false;
    };
  }, [parcelState.weight]);

  const selectedRange = weightRanges.find(
    (r) => String(r.weight_range).trim().toLowerCase() === String(weight).trim().toLowerCase()
  );
  const isOutstation = deliveryScope === 'outstation';

  const handleNext = () => {
    if (description.trim().length < 3) {
      setDescError('Please add at least a short description.');
      return;
    }
    setDescError('');
    navigate('/taxi/user/parcel/contacts', {
      state: {
        ...parcelState,
        parcelType,
        weight,
        deliveryScope,
        isOutstation,
        description,
        weightRule: selectedRange,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-lg mx-auto flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <LoaderCircle size={32} className="animate-spin text-yellow-500" />
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto flex flex-col font-sans relative">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white px-5 py-4 flex items-center gap-3.5 border-b border-gray-200/80 sticky top-0 z-20"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all shrink-0"
        >
          <ArrowLeft size={20} className="text-gray-800" strokeWidth={2} />
        </motion.button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">{parcelType}</p>
          <h1 className="text-lg font-semibold tracking-tight text-gray-800 leading-tight">Item Details</h1>
        </div>
        <div className="rounded-full border border-gray-200/80 bg-gray-100/80 px-3 py-1 text-[11px] font-medium text-gray-600 shrink-0 flex items-center gap-1.5">
          <Package size={13} className="text-gray-400" />
          <span>Step 2 of 3</span>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-44 space-y-5 overflow-y-auto no-scrollbar">
        
        {/* Step Progress Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
          className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Step 2 of 3</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-yellow-600">Configure Parcel</span>
          </div>
          
          {/* Progress Bar Segments */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="h-1 flex-1 rounded-full bg-yellow-400" />
            <div className="h-1 flex-1 rounded-full bg-yellow-400" />
            <div className="h-1 flex-1 rounded-full bg-gray-200" />
          </div>
          
          <h2 className="mt-3.5 text-[15px] font-semibold tracking-tight text-gray-800">{parcelType} Delivery</h2>
          <p className="mt-0.5 text-xs font-normal text-gray-500">Select weight range and reach for your package.</p>
        </motion.div>

        {/* Weight Selection */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Approximate Weight
          </label>
          
          <div className={`grid ${weightRanges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5`}>
            {weightRanges.map((range) => {
              const key = range.weight_range;
              const label = range.weight_range;
              const Icon = getWeightIcon(label);
              const isSelected = weight === key;
              
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setWeight(key)}
                  className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer min-h-[100px] ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-50/70 ring-1 ring-yellow-400 shadow-2xs'
                      : 'border-gray-200/80 bg-white hover:border-gray-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon size={16} strokeWidth={1.8} />
                    </div>
                    {isSelected && (
                      <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center shadow-2xs">
                        <div className="w-1 h-1 rounded-full bg-gray-900" />
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <span className={`block text-sm font-semibold leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-gray-500">
                      ₹{range.base_price} base fare
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {selectedRange && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs font-normal">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" strokeWidth={2} />
              <span>
                <strong className="font-medium">Rate estimate:</strong> ₹{selectedRange.base_price} for first {selectedRange.base_distance} km, then ₹{selectedRange.price_per_distance}/km.
              </span>
            </div>
          )}
        </motion.div>

        {/* Delivery Reach */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Delivery Reach
          </label>
          
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: 'city', icon: Building2, label: 'In City', hint: 'Local delivery' },
              { key: 'outstation', icon: Route, label: 'Outstation', hint: 'Outside city' },
            ].map(({ key, icon: Icon, label, hint }) => {
              const isSelected = deliveryScope === key;
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeliveryScope(key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-50/70 ring-1 ring-yellow-400 shadow-2xs'
                      : 'border-gray-200/80 bg-white hover:border-gray-300 shadow-2xs'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 leading-tight">{label}</span>
                    <span className="block text-xs font-normal text-gray-400 mt-0.5">{hint}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
          {isOutstation && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-800 text-xs font-normal">
              <span>This request will be processed as an intercity outstation delivery.</span>
            </div>
          )}
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
          className="space-y-1.5"
        >
          <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-400">
            What are you sending?
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Laptop charger, documents, clothes..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.trim().length >= 3) setDescError('');
            }}
            className={`w-full bg-white rounded-xl px-3.5 py-2.5 text-sm font-normal text-gray-800 placeholder:text-gray-400 border transition-all focus:outline-none resize-none shadow-2xs ${
              descError
                ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-gray-200/80 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400'
            }`}
          />
          <AnimatePresence>
            {descError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-normal text-red-600 flex items-center gap-1.5"
              >
                <AlertTriangle size={13} strokeWidth={2} /> {descError}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Restricted Items Warning */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25, ease: 'easeOut' }}
          className="flex items-start gap-2.5 rounded-xl border border-amber-200/50 bg-amber-50/40 p-3 mb-6"
        >
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" strokeWidth={1.8} />
          <p className="text-xs font-normal text-amber-800 leading-relaxed">
            <strong className="font-medium text-amber-900">Restricted items:</strong> Drugs, alcohol, weapons, explosives, or items valued over ₹5,000 are strictly prohibited.
          </p>
        </motion.div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pointer-events-none z-30">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="pointer-events-auto w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-3.5 rounded-xl text-[15px] font-semibold shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>Next: Sender & Receiver</span>
          <ChevronRight size={18} className="opacity-70" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
};

export default ParcelDetails;
