import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User, ArrowUpRight, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    getQuickCategoriesPath,
    getQuickHomePath,
    getQuickOrdersPath,
    getQuickProfilePath,
} from '../../utils/routes';

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const isSharedQuickProfileRoute =
        location.pathname === '/profile' ||
        location.pathname.startsWith('/profile/');
        
    const navItems = [
        { label: 'Home', icon: Home, path: getQuickHomePath(location.pathname) },
        { label: 'Category', icon: LayoutGrid, path: getQuickCategoriesPath() },
        { label: 'Orders', icon: ShoppingBag, path: getQuickOrdersPath() },
        { label: 'Profile', icon: User, path: getQuickProfilePath() },
    ];
    
    const isActivePath = (targetPath) => {
        if (targetPath === getQuickProfilePath() && isSharedQuickProfileRoute) {
            return true;
        }
        if (targetPath === getQuickHomePath(location.pathname)) {
            return location.pathname === targetPath;
        }
        return location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[500] px-4 pb-5 pt-2 md:hidden pointer-events-none">
            {/* Rides Button - Floating Glassmorphic Pill */}
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
                    onClick={() => navigate('/taxi/user')}
                    className="flex items-center gap-2.5 rounded-full border border-orange-500/20 bg-white/90 backdrop-blur-xl px-4 py-2 shadow-[0_8px_30px_rgba(249,115,22,0.14),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                >
                    {/* Subtle orange pulse status dot */}
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    
                    <Car size={13} className="text-orange-600 animate-pulse" />
                    
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-800 font-sans">
                        Rides
                    </span>
                    
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                        <ArrowUpRight size={11} strokeWidth={3} />
                    </div>
                </motion.button>
            </div>

            {/* Bottom Nav Bar Container */}
            <div className="relative flex items-center justify-around bg-white/85 backdrop-blur-xl border border-white/60 rounded-[24px] shadow-[0_12px_40px_rgba(15,23,42,0.12)] px-2 py-1.5 h-[70px] pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = isActivePath(item.path);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex-1 flex flex-col items-center justify-center h-full relative group transition-all"
                        >
                            {/* Sliding background bubble */}
                            {isActive && (
                                <motion.div
                                    layoutId="quickActiveBubble"
                                    className="absolute inset-x-2 inset-y-1 bg-[#0c831f]/5 rounded-[16px] -z-10"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}

                            <motion.div
                                animate={{
                                    y: isActive ? -1 : 0,
                                    scale: isActive ? 1.12 : 1
                                }}
                                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                className={`w-10 h-10 rounded-[16px] flex items-center justify-center transition-all duration-300 ${
                                    isActive
                                        ? 'bg-[#0c831f] text-white shadow-[0_6px_20px_rgba(12,131,31,0.22)]'
                                        : 'text-gray-400 dark:text-slate-500 hover:text-[#0c831f]/75 bg-transparent'
                                }`}
                              >
                                <Icon
                                    size={18}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </motion.div>

                            <span
                                className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 transition-colors duration-300",
                                    isActive ? "text-[#0c831f]" : "text-gray-400 dark:text-slate-500"
                                )}
                            >
                                {item.label}
                            </span>

                            {/* Active indicator dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="quickActiveIndicator"
                                    className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-[#0c831f]"
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;

