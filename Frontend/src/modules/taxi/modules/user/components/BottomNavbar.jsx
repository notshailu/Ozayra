import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 pointer-events-none">
      {/* Groceries Button - Floating Glassmorphic Pill */}
      {pathname === '/taxi/user/profile' && (
        <div className="flex justify-end w-full mb-4 pr-4 pointer-events-auto">
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
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm"
        >
          {/* Subtle green pulse status dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          
          <ShoppingBag size={14} className="text-green-600" />
          
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-700">
            Groceries
          </span>
          
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 ml-1">
            <ArrowUpRight size={12} strokeWidth={2.5} />
          </div>
        </motion.button>
      </div>
      )}

      {/* Main Navigation Bar Container */}
      <div className="relative flex items-center justify-around bg-white border-t border-gray-200 h-[68px] px-2 pointer-events-auto shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe pt-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = pathname === path;
          return (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center h-full relative group"
            >
              {/* Active Top Line Indicator */}
              {isActive && (
                <motion.div
                  layoutId="taxiNavIndicator"
                  className="absolute top-0 w-10 h-[3px] rounded-b-full bg-yellow-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon Container */}
              <div 
                className={`flex flex-col items-center transition-colors duration-200 mt-1 ${
                  isActive
                    ? 'text-gray-900'
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-gray-900' : 'text-gray-400'}
                />
                
                {/* Label */}
                <span className={`text-[10px] font-bold mt-1 transition-colors duration-200 ${
                  isActive ? 'text-gray-900' : 'text-gray-500'
                }`}>
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
