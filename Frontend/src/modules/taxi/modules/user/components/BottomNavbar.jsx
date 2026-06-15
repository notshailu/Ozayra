import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Clock, Map, User, ArrowUpRight, ShoppingBag } from 'lucide-react';

const navItems = [
  { icon: Home,  label: 'Ride',    path: '/taxi/user'         },
  { icon: Clock, label: 'History', path: '/taxi/user/activity' },
  { icon: Map,   label: 'Travel',  path: '/taxi/user/support'  },
  { icon: User,  label: 'Profile', path: '/taxi/user/profile'  },
];

const BottomNavbar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 px-4 pb-6 pt-2 pointer-events-none">
      {/* Groceries Button - Floating Glassmorphic Pill */}
      <div className="flex justify-end w-full mb-3 pr-2 pointer-events-auto">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 15 }}
          animate={{ 
            opacity: 1, 
            y: [0, -3, 0],
          }}
          transition={{
            y: {
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut"
            },
            opacity: { duration: 0.3 }
          }}
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/quick')}
          className="flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-white/90 backdrop-blur-xl px-4 py-2 shadow-[0_8px_30px_rgba(16,185,129,0.14),inset_0_1px_1px_rgba(255,255,255,0.8)]"
        >
          {/* Subtle green pulse status dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          
          <ShoppingBag size={13} className="text-emerald-600 animate-pulse" />
          
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 font-sans">
            Groceries
          </span>
          
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <ArrowUpRight size={11} strokeWidth={3} />
          </div>
        </motion.button>
      </div>

      {/* Main Navigation Bar Container */}
      <div className="relative flex items-center justify-around bg-white/85 backdrop-blur-xl border border-white/60 rounded-[24px] shadow-[0_12px_40px_rgba(15,23,42,0.12)] px-2 py-1.5 pointer-events-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = pathname === path;
          return (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center gap-1.5 py-1.5 relative"
            >
              {/* Sliding background bubble */}
              {isActive && (
                <motion.div
                  layoutId="taxiNavBubble"
                  className="absolute inset-x-2 inset-y-1 bg-slate-900/5 rounded-[16px] -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon Container */}
              <motion.div 
                animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                className={`w-10 h-10 rounded-[16px] flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-[0_6px_20px_rgba(15,23,42,0.22)]'
                    : 'text-slate-400 hover:text-slate-600 bg-transparent'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>

              {/* Label */}
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="taxiNavIndicator"
                  className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-slate-900"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavbar;

