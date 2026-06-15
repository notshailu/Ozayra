import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';

import carIcon from '../../../assets/icons/car.png';
import bikeIcon from '../../../assets/icons/bike.png';
import autoIcon from '../../../assets/icons/auto.png';
import deliveryIcon from '../../../assets/icons/Delivery.png';

const FALLBACK_SERVICES = [
  { icon: carIcon, label: 'Car', description: 'Book a premium ride', path: '/taxi/user/ride/select-location', accentClass: 'bg-orange-50/80' },
  { icon: autoIcon, label: 'Auto', description: 'Budget friendly auto', path: '/taxi/user/ride/select-location', accentClass: 'bg-blue-50/80' },
  { icon: bikeIcon, label: 'Moto', description: 'Quick bike transit', path: '/taxi/user/ride/select-location', accentClass: 'bg-yellow-50/80' },
  { icon: deliveryIcon, label: 'Parcel', description: 'Send package instantly', path: '/taxi/user/parcel/type', accentClass: 'bg-purple-50/80' },
];

const ServiceTile = ({ icon, label, description, path, accentClass }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => path && navigate(path)}
      className="group relative flex w-full flex-col items-center gap-2.5 overflow-hidden rounded-[20px] border border-white/95 bg-white/60 p-2 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all duration-300 hover:bg-white hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.12)]"
    >
      <div
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] shadow-[inset_0_1px_4px_rgba(255,255,255,0.6)] ${accentClass || 'bg-gray-50'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50" />
        <img
          src={icon}
          alt={label}
          className="h-full w-full object-contain mix-blend-multiply transition-all duration-500 group-hover:scale-110"
        />
      </div>

      <div className="flex flex-col items-center px-1 pb-1">
        <span className="text-[10.5px] font-black uppercase leading-tight tracking-[0.04em] text-slate-800">
          {label}
        </span>
      </div>
    </motion.button>
  );
};

const ServiceGrid = () => {
  const [services, setServices] = useState([]);

  const getPath = (module) => {
    if (module.transport_type === 'delivery') return '/taxi/user/parcel/type';
    if (module.service_type === 'rental') return '/taxi/user/rental';
    if (module.service_type === 'outstation') return '/taxi/user/intercity';
    
    if (module.name.toLowerCase().includes('cab') || module.name.toLowerCase().includes('taxi')) {
        return '/taxi/user/cab';
    }
    return '/taxi/user/ride/select-location';
  };

  const getAccent = (index) => {
    const accnets = [
      'bg-orange-50/80',
      'bg-yellow-50/80',
      'bg-blue-50/80',
      'bg-purple-50/80',
      'bg-emerald-50/80',
      'bg-rose-50/80',
    ];
    return accnets[index % accnets.length];
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await userService.getAppModules();
        const results = res?.results || res?.data?.results || [];
        const activeModules = results.filter(m => m.active);
        
        const mapped = activeModules.map((m, idx) => {
          let displayName = m.name;
          if (displayName.toLowerCase() === 'ride' || displayName.toLowerCase() === 'cab') {
             displayName = 'Car';
          }
          return {
            icon: m.mobile_menu_icon || carIcon,
            label: displayName,
            description: m.short_description,
            path: getPath(m),
            accentClass: getAccent(idx)
          };
        });
        
        setServices(mapped);
      } catch (err) {
        console.error('Failed to load services:', err);
        // We do not toast an error on home screen since we have a premium fallback experience.
      }
    };

    fetchServices();
  }, []);

  const displayServices = services.length > 0 ? services : FALLBACK_SERVICES;
  const optionCount = displayServices.length;
  const optionLabel = optionCount === 1 ? 'option' : 'options';

  return (
    <div className="px-5">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="py-1"
      >
        <div className="flex items-end justify-between px-0.5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Services</p>
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900">Choose your ride</h2>
          </div>

          <div className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-900/5">
            {optionCount} {optionLabel}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3.5">
          {displayServices.map((service) => (
            <ServiceTile key={service.label} {...service} />
          ))}
        </div>
      </motion.section>
    </div>
  );
};

export default ServiceGrid;
