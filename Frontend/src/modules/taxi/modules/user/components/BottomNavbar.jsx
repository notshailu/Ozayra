import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Clock, Map, User, ArrowUpRight, ShoppingBag } from 'lucide-react';

const navItems = [
  { icon: Home,  label: 'Ride',    path: '/taxi/user'         },
  { icon: Clock, label: 'History', path: '/taxi/user/activity' },
  { icon: Map,   label: 'Travel',  path: '/taxi/user/support'  },
  { icon: User,  label: 'Profile', path: '/taxi/user/profile'  },
  { icon: ShoppingBag, label: 'Grocery', path: '/quick', highlight: true },
];

const BottomNavbar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 pointer-events-none">
      {/* Main Navigation Bar Container */}
      <div className="relative flex items-center justify-around bg-white border-t border-gray-200 h-[64px] px-1 pointer-events-auto shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
        {navItems.map(({ icon: Icon, label, path, highlight }) => {
          const isActive = pathname === path || pathname.startsWith(`${path}/`) && path !== '/';
          return (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center h-full relative group"
            >
              {/* Active Top Line Indicator */}
              {isActive && !highlight && (
                <motion.div
                  layoutId="taxiNavIndicator"
                  className="absolute top-0 w-10 h-[3px] rounded-b-full bg-yellow-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="flex flex-col items-center justify-center gap-0 mt-1">
                  <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${
                          highlight 
                              ? "bg-[#0c831f] text-white" 
                              : "bg-transparent"
                      }`}
                    >
                      <Icon
                          size={highlight ? 20 : 24}
                          strokeWidth={isActive || highlight ? 2.5 : 2}
                          className={highlight ? 'text-white mb-0.5' : isActive ? 'text-gray-900' : 'text-gray-400'}
                      />
                  </div>

                  <span
                      className={`text-[10px] font-bold tracking-tight transition-colors duration-200 ${
                          highlight ? 'text-slate-900 text-[11px] font-black -mt-1' : isActive ? "text-gray-900" : "text-gray-500"
                      }`}
                  >
                      {label}
                  </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavbar;
