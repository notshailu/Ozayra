import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User, Car, Bike } from 'lucide-react';
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
        { label: 'Order Again', icon: ShoppingBag, path: getQuickOrdersPath() },
        { label: 'Categories', icon: LayoutGrid, path: getQuickCategoriesPath() },
        { label: 'Profile', icon: User, path: getQuickProfilePath() },
        { label: 'Rides', icon: Bike, path: '/taxi/user', highlight: true },
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
        <div className="fixed bottom-0 left-0 right-0 z-[500] md:hidden">
            {/* Bottom Nav Bar Container - Blinkit exact 5-tab layout */}
            <div className="flex items-center justify-between bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] h-[64px] pb-safe pointer-events-auto">
                {/* 5 Equal Tabs mapped from navItems */}
                <div className="flex items-center justify-around flex-1 h-full px-1">
                    {navItems.map((item) => {
                        const isActive = isActivePath(item.path);
                        const isHighlighted = item.highlight;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex-1 flex flex-col items-center justify-center h-full relative group"
                            >
                                <div className="flex flex-col items-center justify-center gap-1 mt-1">
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200",
                                            isHighlighted 
                                                ? "bg-[#F9C124] text-slate-900" // Rapido Yellow permanent circle
                                                : isActive 
                                                    ? "bg-[#fce69a] text-slate-900" // Blinkit active yellow circle
                                                    : "bg-transparent text-slate-500"
                                        )}
                                      >
                                        <Icon
                                            size={22}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            fill={isActive ? "currentColor" : "none"}
                                        />
                                    </div>

                                    <span
                                        className={cn(
                                            "text-[10px] font-bold tracking-tight transition-colors duration-200",
                                            isActive ? "text-slate-900" : "text-slate-500"
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNav;

