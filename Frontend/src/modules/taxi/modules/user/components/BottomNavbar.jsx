import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Clock, Map, User, ArrowUpRight } from 'lucide-react';

const navItems = [
  { icon: Home,  label: 'Ride',    path: '/taxi/user'         },
  { icon: Clock, label: 'History', path: '/taxi/user/activity' },
  { icon: Map,   label: 'Travel',  path: '/taxi/user/support'  },
  { icon: User,  label: 'Profile', path: '/taxi/user/profile'  },
];

const BottomNavbar = () => {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const redirectTo = `${pathname || '/taxi/user'}${search || ''}${hash || ''}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 px-4 pb-5 pt-2">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/quick')}
        className="relative z-10 -mb-3 ml-auto mr-3 flex items-center gap-2 rounded-t-[18px] rounded-b-[10px] border border-b-0 border-[#cbf2d3] bg-[linear-gradient(180deg,#f6fdf8_0%,#e4f9ea_58%,#d2f5db_100%)] px-3 pb-3 pt-2 shadow-[0_-2px_0_rgba(255,255,255,0.75),0_-10px_24px_rgba(16,185,129,0.12)]"
      >
        <div className="pointer-events-none absolute -bottom-3 left-0 right-0 h-4 bg-[linear-gradient(180deg,rgba(210,245,219,0.95)_0%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute -left-3 bottom-0 h-6 w-6 rounded-br-[18px] border-b border-r border-[#cbf2d3] bg-white/90" />
        <div className="pointer-events-none absolute -right-3 bottom-0 h-6 w-6 rounded-bl-[18px] border-b border-l border-[#cbf2d3] bg-white/90" />

        <div className="text-left leading-none">
          <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#1e7e34]">
            Groceries
          </span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/80 text-[#0f5122]">
          <ArrowUpRight size={14} strokeWidth={2.6} />
        </div>
      </motion.button>

      <div className="relative flex items-center justify-around bg-white/90 backdrop-blur-xl border border-white/80 rounded-[22px] shadow-[0_8px_32px_rgba(15,23,42,0.12)] px-2 py-1.5">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = pathname === path;
          return (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center gap-1 py-1 relative"
            >
              {/* Active pill background */}
              <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.20)]'
                  : 'bg-transparent'
              }`}>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-white' : 'text-slate-400'}
                />
              </div>

              {/* Label */}
              <span className={`text-[9px] font-black uppercase tracking-[0.18em] transition-colors duration-200 ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {label}
              </span>

              {/* Active dot */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-orange-500"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavbar;
