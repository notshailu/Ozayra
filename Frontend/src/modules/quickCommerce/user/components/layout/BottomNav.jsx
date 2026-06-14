import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

    const redirectTo = `${location.pathname || '/quick'}${location.search || ''}${location.hash || ''}`;

    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[500] px-4 pb-5 pt-2 md:hidden">
            {/* Explore Button */}
            <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/taxi/user')}
                className="relative z-10 -mb-3 ml-auto mr-3 flex items-center gap-2 rounded-t-[18px] rounded-b-[10px] border border-b-0 border-[#ffdcb8] bg-[linear-gradient(180deg,#fffcf9_0%,#fff2e5_58%,#ffe3ca_100%)] px-3 pb-3 pt-2 shadow-[0_-2px_0_rgba(255,255,255,0.75),0_-10px_24px_rgba(249,115,22,0.12)]"
            >
                <div className="pointer-events-none absolute -bottom-3 left-0 right-0 h-4 bg-[linear-gradient(180deg,rgba(255,227,202,0.95)_0%,rgba(255,255,255,0)_100%)]" />
                <div className="pointer-events-none absolute -left-3 bottom-0 h-6 w-6 rounded-br-[18px] border-b border-r border-[#ffdcb8] bg-white/90" />
                <div className="pointer-events-none absolute -right-3 bottom-0 h-6 w-6 rounded-bl-[18px] border-b border-l border-[#ffdcb8] bg-white/90" />

                <div className="text-left leading-none">
                    <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#c2410c]">
                        Rides
                    </span>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/80 text-[#7c2d12]">
                    <ArrowUpRight size={14} strokeWidth={2.6} />
                </div>
            </motion.button>

            {/* Bottom Nav Bar */}
            <div className="relative flex items-center justify-around bg-white/90 backdrop-blur-xl border border-white/80 rounded-[22px] shadow-[0_8px_32px_rgba(15,23,42,0.12)] px-2 py-1.5 h-[70px]">
                {navItems.map((item) => {
                    const isActive = isActivePath(item.path);

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex-1 flex flex-col items-center justify-center h-full relative group transition-all"
                        >
                            <div className="flex flex-col items-center justify-center relative">
                                {/* Active Indicator Background (Subtle Glow) */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="absolute -inset-y-2 -inset-x-4 bg-[#0c831f]/5 dark:bg-[#0c831f]/20 rounded-[20px] -z-10"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </AnimatePresence>

                                <motion.div
                                    animate={{
                                        y: isActive ? -2 : 0,
                                        scale: isActive ? 1.1 : 1
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <item.icon
                                        size={24}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={cn(
                                            "transition-colors duration-300",
                                            isActive ? "text-[#0c831f]" : "text-gray-400 dark:text-slate-500"
                                        )}
                                    />
                                </motion.div>

                                <motion.span
                                    animate={{
                                        y: isActive ? 1 : 0
                                    }}
                                    className={cn(
                                        "text-[10px] font-bold tracking-tight mt-1 transition-colors duration-300",
                                        isActive ? "text-[#0c831f]" : "text-gray-400 dark:text-slate-500"
                                    )}
                                >
                                    {item.label}
                                </motion.span>
                            </div>

                            {/* Top Accent Line for Active State */}
                            {isActive && (
                                <motion.div
                                    layoutId="topLine"
                                    className="absolute -top-[1px] w-8 h-[3px] bg-[#0c831f] rounded-full"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
