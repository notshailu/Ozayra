import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/core/context/AuthContext";
import { useSettings } from "@/core/context/SettingsContext";
import { cn } from "@/lib/utils";
import { HiChevronDown } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import AdminModuleSwitcher from "@/shared/components/AdminModuleSwitcher";

const SidebarItem = ({
  item,
  isOpen,
  onToggle,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  const location = useLocation();

  const hasChildren = item.children && item.children.length > 0;
  const isChildActive =
    hasChildren &&
    item.children.some((child) => location.pathname === child.path);

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={onToggle}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={cn(
            "w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 group relative",
            isChildActive || isOpen
              ? "bg-slate-50 text-slate-900"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50",
          )}>
          <div className="flex items-center space-x-3 z-10">
            <div
              className={cn(
                "transition-all duration-300",
                isChildActive || isOpen
                  ? "text-emerald-600"
                  : "text-slate-400 group-hover:text-slate-600",
              )}>
              {item.icon && <item.icon className="h-4.5 w-4.5" />}
            </div>
            <span
              className={cn(
                "text-xs tracking-tight transition-all duration-200",
                isChildActive || isOpen ? "font-bold" : "font-semibold",
              )}>
              {item.label}
            </span>
          </div>
          <div
            className={cn(
              "transition-all duration-200 z-10",
              isOpen
                ? "rotate-180 text-emerald-600"
                : "rotate-0 text-slate-400 group-hover:text-slate-600",
            )}>
            <HiChevronDown className="h-4 w-4" />
          </div>
        </button>
        {isOpen && (
          <div className="pl-10 pr-3 py-1 space-y-1 animate-in slide-in-from-top-2 fade-in duration-350">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.end !== undefined ? child.end : false}
                className={({ isActive }) =>
                  cn(
                    "block text-xs py-1.5 px-3 rounded-lg transition-all duration-200 relative",
                    isActive
                      ? "text-emerald-700 font-bold bg-emerald-50/40 ring-1 ring-emerald-100/35"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/30",
                  )
                }>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-emerald-500" />
                    )}
                    {child.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.end !== undefined ? item.end : false}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={({ isActive }) =>
        cn(
          "flex items-center space-x-3 rounded-xl px-3 py-2.5 transition-all duration-200 group relative",
          isActive
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/50"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50",
        )
      }>
      {({ isActive }) => (
        <>
          <div
            className={cn(
              "transition-all duration-300 z-10",
              isActive
                ? "text-emerald-600"
                : "text-slate-400 group-hover:text-slate-650",
            )}>
            {item.icon && <item.icon className="h-4.5 w-4.5" />}
          </div>
          <span
            className={cn(
              "text-xs tracking-tight transition-all duration-200 z-10",
              isActive ? "font-bold" : "font-semibold",
            )}>
            {item.label}
          </span>
          {isActive && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
          )}
        </>
      )}
    </NavLink>
  );
};

const SidebarContent = ({ items, title, onClose, openMenu, handleToggle, hoveredIdx, setHoveredIdx }) => {
  const { settings } = useSettings();
  const appName = settings?.appName || 'App';
  const location = useLocation();
  const isAdminPanel = location.pathname.startsWith("/admin");

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Brand Header */}
      <div className="flex-shrink-0 flex h-16 items-center justify-between px-6 border-b border-slate-100 z-10">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/10">
            <span className="text-sm font-black italic">{appName.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-800 leading-none">
              {appName}
            </h1>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1 block">
              {title}
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="p-2 md:hidden text-slate-400 hover:text-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        data-lenis-prevent
        onMouseLeave={() => setHoveredIdx(null)}
        className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto overscroll-contain custom-scrollbar min-h-0 pb-6 relative z-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isAdminPanel && (
          <div className="mb-4 px-1">
            <p className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-2">
              Module
            </p>
            <AdminModuleSwitcher className="grid grid-cols-2 gap-1 rounded-xl border border-slate-100 bg-slate-50/50 p-1 shadow-none [&>button]:justify-center [&>button]:px-2 [&>button]:py-2 [&>button]:text-[10px] [&>button]:tracking-[0.18em]" />
          </div>
        )}
        <p className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-3">
          Core Management
        </p>
        <AnimatePresence>
          {items.map((item, idx) => (
            <SidebarItem
              key={idx}
              item={item}
              isOpen={openMenu === item.label}
              onToggle={() => handleToggle(item.label)}
              isHovered={hoveredIdx === idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => { }}
            />
          ))}
        </AnimatePresence>
      </nav>

      {/* Profile Footer */}
      <div className="p-4 border-t border-slate-100 flex-shrink-0">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:bg-slate-100/70 transition-all group cursor-pointer">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-emerald-500/10">
                {appName.charAt(0)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate transition-colors">
                {title?.toLowerCase().includes('seller') ? 'Seller Console' : 'Admin Console'}
              </p>
              <p className="text-[9px] text-slate-400 truncate font-semibold uppercase tracking-wider mt-0.5">
                {title?.toLowerCase().includes('seller') ? 'Seller' : 'Super Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ items, title, isOpen, onClose }) => {
  const { role } = useAuth();
  const [openMenu, setOpenMenu] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const handleToggle = (label) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  };

  const commonProps = {
    items,
    title,
    onClose,
    openMenu,
    handleToggle,
    hoveredIdx,
    setHoveredIdx
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 inset-y-0 w-80 bg-white text-slate-650 border-r border-slate-100 shadow-[10px_0_40px_rgba(0,0,0,0.02)] md:flex flex-col z-50 transition-all duration-300",
        (role === "admin" || role === "seller") ? "hidden md:flex" : "flex",
      )}>
        <SidebarContent {...commonProps} />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            />

            {/* Outer Container */}
            <div className="absolute left-0 inset-y-0 w-80 flex flex-col pointer-events-none">
              {/* Inner Animation Wrapper */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                className="flex-1 bg-white shadow-2xl flex flex-col pointer-events-auto min-h-0"
              >
                <SidebarContent {...commonProps} />
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
