import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Search, Wallet, ChevronRight } from 'lucide-react';
import { useSettings } from '../../../shared/context/SettingsContext';
import { userAuthService } from '../services/authService';
import {
  TAXI_LOCATION_UPDATED_EVENT,
  getSavedTaxiLocationLabel,
} from '../services/savedLocation';

const HeaderGreeting = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appLogo = settings.general?.logo || settings.customization?.logo;
  const appName = settings.general?.app_name || 'App';
  
  const [locationLabel, setLocationLabel] = useState(getSavedTaxiLocationLabel);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const syncLocationLabel = () => {
      setLocationLabel(getSavedTaxiLocationLabel());
    };

    syncLocationLabel();
    window.addEventListener('storage', syncLocationLabel);
    window.addEventListener(TAXI_LOCATION_UPDATED_EVENT, syncLocationLabel);

    return () => {
      window.removeEventListener('storage', syncLocationLabel);
      window.removeEventListener(TAXI_LOCATION_UPDATED_EVENT, syncLocationLabel);
    };
  }, []);

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

  return (
    <div className="px-5 pt-6">
      {/* Top Header Row: Brand & Wallet */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {appLogo ? (
            <div className="flex items-center justify-center bg-white border border-slate-100/90 rounded-[14px] shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-1 h-11 w-11 overflow-hidden">
              <img src={appLogo} alt={appName} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="h-11 w-11 rounded-[14px] bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-white font-black text-lg shadow-sm">
              {appName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[16px] font-black text-slate-900 tracking-tight leading-none">
              {appName}
            </span>
            <span className="text-[9px] font-black tracking-widest text-emerald-600 uppercase mt-0.5">
              Premium Ride
            </span>
          </div>
        </div>

        {/* Dynamic Wallet Balance Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/taxi/user/wallet')}
          className="flex items-center gap-2.5 rounded-full border border-white/80 bg-white/92 px-3.5 py-2 shadow-[0_10px_25px_rgba(15,23,42,0.06)] backdrop-blur-md hover:bg-white active:scale-95 transition-all shrink-0"
        >
          <Wallet size={15} className="text-slate-700" strokeWidth={2.5} />
          <span className="text-[12px] font-black text-slate-800 tracking-tight leading-none">
            ₹{balance !== null ? balance.toFixed(0) : '0'}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-pulse" />
        </motion.button>
      </div>

      {/* Unified pickup/destination search widget */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="mt-4 rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-md space-y-3"
      >
        {/* Current Pickup Row */}
        <div 
          onClick={() => navigate('/taxi/user/ride/select-location')}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div className="mt-1 flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] ring-4 ring-emerald-100/50" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Pickup Location</p>
            <p className="text-[12px] font-bold text-slate-700 truncate mt-0.5 group-hover:text-slate-900 transition-colors">
              {locationLabel}
            </p>
          </div>
          <ChevronRight size={14} className="text-slate-300 self-center group-hover:text-slate-500 transition-colors shrink-0" strokeWidth={2.5} />
        </div>

        <div className="border-t border-slate-100/80 my-1" />

        {/* Search Destination Row */}
        <div 
          onClick={() => navigate('/taxi/user/ride/select-location')}
          className="flex items-center gap-3 cursor-pointer group bg-slate-50/70 rounded-[18px] px-3.5 py-3 hover:bg-slate-100/50 transition-all border border-slate-100/50"
        >
          <Search size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" strokeWidth={2.5} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-400 group-hover:text-slate-600 transition-colors">
            Where to? Search destination
          </span>
          <div className="bg-slate-900 text-white rounded-full px-3.5 py-1.5 shadow-sm shrink-0 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-[0.14em]">Go</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HeaderGreeting;
