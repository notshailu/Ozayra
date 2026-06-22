import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  Filter,
  Key,
  Loader2,
  Lock,
  MoreVertical,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
  MapPin,
  Truck,
  ChevronLeft,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { adminService } from '../../services/adminService';

const ACTION_MENU_WIDTH = 200;
const ACTION_MENU_GAP = 8;
const ACTION_MENU_MAX_HEIGHT = 280;

const normalizeDocuments = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  return Object.entries(raw).flatMap(([key, value]) => {
    if (!value) return [];
    const normalizeOne = (doc) => {
      const images = Array.isArray(doc?.images)
        ? doc.images.filter(Boolean)
        : doc?.image
          ? [doc.image]
          : doc?.url
            ? [doc.url]
            : doc?.previewUrl
              ? [doc.previewUrl]
              : doc?.secureUrl
                ? [doc.secureUrl]
                : [];
      return {
        key,
        name: doc?.name || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        identify_number: doc?.identify_number ?? doc?.identifyNumber ?? doc?.number ?? doc?.id_number ?? 'N/A',
        expiry_date: doc?.expiry_date ?? doc?.expiryDate ?? doc?.expiry ?? 'N/A',
        status: doc?.status ?? 'Pending',
        comment: doc?.comment ?? '-',
        images,
      };
    };
    return Array.isArray(value) ? value.map(normalizeOne) : [normalizeOne(value)];
  });
};

/* ─── Skeleton Row for loading state ──────────────────────── */
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gray-100" /><div className="h-3.5 w-28 bg-gray-100 rounded-md" /></div></td>
    <td className="px-4 py-4"><div className="h-3 w-16 bg-gray-100 rounded-md" /></td>
    <td className="px-4 py-4"><div className="h-3 w-24 bg-gray-100 rounded-md" /></td>
    <td className="px-4 py-4"><div className="h-3 w-16 bg-gray-100 rounded-md" /></td>
    <td className="px-4 py-4 text-center"><div className="h-6 w-20 bg-gray-100 rounded-full mx-auto" /></td>
    <td className="px-4 py-4 text-center"><div className="h-3 w-24 bg-gray-100 rounded-md mx-auto" /></td>
    <td className="px-6 py-4 text-right"><div className="h-8 w-20 bg-gray-100 rounded-md ml-auto" /></td>
  </tr>
);

/* ─── Stat Card Component ─────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, accent, iconBg }) => (
  <div className="bg-white rounded-xl border border-gray-200/80 p-5 flex items-center gap-4 hover:shadow-md hover:shadow-gray-100/50 transition-all duration-300 group">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} transition-transform duration-300 group-hover:scale-105`}>
      <Icon size={20} className={accent} strokeWidth={2} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
    </div>
  </div>
);

/* ─── Avatar Initials ─────────────────────────────────────── */
const AvatarInitial = ({ name }) => {
  const colors = [
    'bg-indigo-50 text-indigo-600',
    'bg-violet-50 text-violet-600',
    'bg-sky-50 text-sky-600',
    'bg-emerald-50 text-emerald-600',
    'bg-amber-50 text-amber-600',
    'bg-rose-50 text-rose-600',
    'bg-teal-50 text-teal-600',
    'bg-fuchsia-50 text-fuchsia-600',
  ];
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${colorClass} flex-shrink-0`}>
      {initials}
    </div>
  );
};

const PendingDrivers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, driverId: null, password: '', isSubmitting: false });
  const [detailModal, setDetailModal] = useState({ isOpen: false, driver: null });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const openActionMenu = (driverId, anchorEl) => {
    const rect = anchorEl.getBoundingClientRect();
    const viewportPadding = 12;
    const menuHeight = ACTION_MENU_MAX_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom - ACTION_MENU_GAP;
    const spaceAbove = rect.top - ACTION_MENU_GAP;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    const left = Math.min(
      Math.max(viewportPadding, rect.right - ACTION_MENU_WIDTH),
      window.innerWidth - ACTION_MENU_WIDTH - viewportPadding,
    );

    const position = {
      left,
      ...(openUp
        ? {
            bottom: Math.max(viewportPadding, window.innerHeight - rect.top + ACTION_MENU_GAP),
          }
        : {
            top: Math.min(
              rect.bottom + ACTION_MENU_GAP,
              window.innerHeight - menuHeight - viewportPadding,
            ),
          }),
    };

    setMenuPosition(position);
    setActiveMenu(driverId);
  };

  const closeMenu = () => {
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const handleAction = async (action, driverId) => {
    const confirmMsg = action === 'delete' ? 'Are you sure you want to delete this pending request?' : 'Are you sure you want to APPROVE this driver?';
    if (action !== 'view' && action !== 'edit' && action !== 'password' && !window.confirm(confirmMsg)) return;

    if (action === 'view') {
      const driver = pendingDrivers.find((d) => d.id === driverId);
      if (driver) {
        setDetailModal({
          isOpen: true,
          driver,
        });
      }
      return;
    }
    if (action === 'edit') {
      navigate(`/admin/drivers/edit/${driverId}`);
      return;
    }

    try {
      if (action === 'password') {
        setPasswordModal(prev => ({ ...prev, isSubmitting: true }));
      }

      if (action === 'approve') {
        await adminService.updateDriverStatus(driverId, { approve: true, status: 'approved' });
      } else if (action === 'delete') {
        await adminService.deleteDriver(driverId);
      } else if (action === 'password') {
        await adminService.updateDriverPassword(driverId, passwordModal.password);
      }

      if (action !== 'view' && action !== 'edit') {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        if (action === 'password') {
          setPasswordModal({ isOpen: false, driverId: null, password: '', isSubmitting: false });
        }
        if (action === 'delete' || action === 'approve') {
          await fetchPendingDrivers();
        }
      }
    } catch (err) {
      alert(err?.message || `Network error during ${action}`);
      if (action === 'password') setPasswordModal(prev => ({ ...prev, isSubmitting: false }));
    } finally {
      closeMenu();
    }
  };

  const isDriverApproved = (driver) => {
    if (!driver) return false;

    const approveRaw = driver.approve ?? '';
    const approveNormalized = String(approveRaw).toLowerCase();
    const status = String(driver.status || '').toLowerCase();

    return (
      approveRaw === true ||
      approveRaw === 1 ||
      ['true', '1', 'yes', 'approved'].includes(approveNormalized) ||
      ['approved', 'active', 'verified'].includes(status)
    );
  };

  const fetchPendingDrivers = async () => {
    setIsLoading(true);
    try {
      const responseData = await adminService.getDrivers(1, 50);
      const driversList = responseData.data?.results || [];
      const pending = driversList
        .filter((d) => !isDriverApproved(d) && String(d?.onboarding?.role || '').toLowerCase() !== 'owner')
        .map((d) => ({
          id: d._id,
          name: d.name || 'Unknown',
          email: d.email || 'N/A',
          gender: d.gender || 'N/A',
          serviceLocation: d.service_location_name || d.city || 'India',
          phone: d.phone || d.mobile || 'N/A',
          transport: d.transport_type || d.register_for || d.transport_type || 'N/A',
          vehicle_make: d.vehicle_make || 'N/A',
          vehicle_model: d.vehicle_model || 'N/A',
          vehicle_number: d.vehicle_number || 'N/A',
          vehicle_color: d.vehicle_color || 'N/A',
          vehicle_image: d.vehicle_image || '',
          referral_code: d.referral_code || 'N/A',
          docs: 'View Docs',
          documents: d.documents || {},
          status: (String(d.status || '').toUpperCase() || 'PENDING'),
          registeredAt: d.createdAt || null,
        }));

      setPendingDrivers(pending);
    } catch (err) {
      setError(err?.message || 'Failed to fetch pending drivers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDrivers();
  }, []);

  useEffect(() => {
    if (!activeMenu) return undefined;

    const handleOutsideMotion = () => closeMenu();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('scroll', handleOutsideMotion, true);
    window.addEventListener('resize', handleOutsideMotion);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleOutsideMotion, true);
      window.removeEventListener('resize', handleOutsideMotion);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredDrivers = useMemo(() =>
    pendingDrivers.filter((driver) =>
      (driver.name && driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (driver.phone && driver.phone.includes(searchTerm)) ||
      (driver.serviceLocation && driver.serviceLocation.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [pendingDrivers, searchTerm]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / itemsPerPage));
  const paginatedDrivers = filteredDrivers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const startEntry = filteredDrivers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, filteredDrivers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Stats
  const stats = useMemo(() => {
    const total = pendingDrivers.length;
    const locations = new Set(pendingDrivers.map(d => d.serviceLocation)).size;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = pendingDrivers.filter(d => {
      const reg = new Date(d.registeredAt);
      return reg >= today;
    }).length;
    return { total, locations, todayCount };
  }, [pendingDrivers]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans text-gray-900">
      {/* Error banner */}
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/50 px-5 py-3.5 text-sm font-medium text-rose-600 flex items-center gap-3 shadow-sm">
          <XCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600 transition-colors">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Drivers</span>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">Pending Drivers</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pending Drivers</h1>
            <p className="text-xs text-gray-400 mt-0.5">Review and approve driver registration requests</p>
          </div>
          <button
            onClick={() => navigate('/admin/drivers/create')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-200 shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-200"
          >
            <UserPlus size={16} /> Add Driver
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Clock} label="Pending Requests" value={stats.total} accent="text-amber-600" iconBg="bg-amber-50" />
        <StatCard icon={MapPin} label="Service Locations" value={stats.locations} accent="text-indigo-600" iconBg="bg-indigo-50" />
        <StatCard icon={UserPlus} label="Today's Requests" value={stats.todayCount} accent="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-visible">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`relative transition-all duration-300 ${isSearchFocused ? 'w-80' : 'w-64'}`}>
              <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isSearchFocused ? 'text-indigo-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search by name, phone, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-600 bg-white hover:border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg hover:from-orange-600 hover:to-orange-500 transition-all duration-200 shadow-sm shadow-orange-200 hover:shadow-md hover:shadow-orange-200">
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Transport</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Registered</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : paginatedDrivers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                        <Users size={24} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">No pending drivers found</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {searchTerm ? 'Try adjusting your search criteria' : 'All driver requests have been processed'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarInitial name={driver.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{driver.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{driver.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-300 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{driver.serviceLocation}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-gray-700 tabular-nums">{driver.phone}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 capitalize">
                        <Truck size={11} className="text-gray-400" />
                        {driver.transport}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {driver.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(driver.registeredAt)}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            setDetailModal({
                              isOpen: true,
                              driver,
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-all duration-200 inline-flex items-center gap-1 opacity-80 group-hover:opacity-100"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => handleAction('approve', driver.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-all duration-200 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100"
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenu === driver.id) {
                              closeMenu();
                              return;
                            }
                            openActionMenu(driver.id, e.currentTarget);
                          }}
                          className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 flex items-center justify-center opacity-60 group-hover:opacity-100"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && filteredDrivers.length > 0 && (
          <div className="px-5 py-3.5 flex items-center justify-between border-t border-gray-100 bg-gray-50/30">
            <span className="text-xs text-gray-400 font-medium">
              Showing <span className="text-gray-600">{startEntry}</span> to <span className="text-gray-600">{endEntry}</span> of <span className="text-gray-600">{filteredDrivers.length}</span> entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-white hover:text-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    page === currentPage
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-gray-500 hover:bg-white hover:text-gray-700 border border-transparent hover:border-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-white hover:text-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PASSWORD MODAL */}
      <AnimatePresence>
        {passwordModal.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Update Password</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Set a new password for this driver</p>
                  </div>
                  <button onClick={() => setPasswordModal({ isOpen: false, driverId: null, password: '', isSubmitting: false })} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <XCircle size={18} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter new password"
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                      value={passwordModal.password}
                      onChange={(e) => setPasswordModal(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Minimum 8 characters recommended</p>
                </div>
                <button
                  onClick={() => handleAction('password', passwordModal.driverId)}
                  disabled={passwordModal.isSubmitting || !passwordModal.password}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-200"
                >
                  {passwordModal.isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <Key size={15} />}
                  Update Password
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL (ONBOARDING DATA VIEW) */}
      <AnimatePresence>
        {detailModal.isOpen && detailModal.driver && (() => {
          const d = detailModal.driver;
          const normalizedDocs = normalizeDocuments(d.documents);
          return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-gray-50/80 to-white">
                  <div className="flex items-center gap-4">
                    <AvatarInitial name={d.name} />
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{d.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Onboarding Profile Audit · Driver Verification</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailModal({ isOpen: false, driver: null })}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-7 overflow-y-auto flex-grow">
                  {/* Left Column - Personal & Vehicle Details */}
                  <div className="space-y-5">
                    {/* Personal Card */}
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 space-y-4">
                      <h4 className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-200/50 pb-2 flex items-center gap-2">
                        <Users size={13} className="text-gray-400" />
                        Personal Information
                      </h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Name', value: d.name },
                          { label: 'Email', value: d.email, className: 'break-all' },
                          { label: 'Mobile', value: d.phone },
                          { label: 'Gender', value: d.gender },
                          { label: 'Location', value: d.serviceLocation },
                          { label: 'Referral', value: d.referral_code || 'N/A' },
                        ].map(({ label, value, className: cls }) => (
                          <div key={label} className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</span>
                            <span className={`text-sm font-semibold text-gray-800 text-right ${cls || ''}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vehicle Card */}
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 space-y-4">
                      <h4 className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-200/50 pb-2 flex items-center gap-2">
                        <Truck size={13} className="text-gray-400" />
                        Vehicle Details
                      </h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Type', value: d.transport },
                          { label: 'Make & Model', value: `${d.vehicle_make} ${d.vehicle_model}` },
                          { label: 'Plate No.', value: d.vehicle_number },
                          { label: 'Color', value: d.vehicle_color },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</span>
                            <span className="text-sm font-semibold text-gray-800 text-right capitalize">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Documents Table */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-100 pb-2">Documents Checklist</h4>
                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ID Number</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                          {normalizedDocs.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-5 py-12 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                    <Eye size={18} className="text-gray-300" />
                                  </div>
                                  <p className="text-xs text-gray-400">No documents uploaded yet</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            normalizedDocs.map((doc, idx) => (
                              <tr key={`${doc.name}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3.5 font-semibold text-gray-900 text-sm">{doc.name}</td>
                                <td className="px-4 py-3.5 text-xs text-gray-600 tabular-nums">{doc.identify_number}</td>
                                <td className="px-4 py-3.5 text-xs text-gray-600">{doc.expiry_date}</td>
                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide capitalize ${
                                    doc.status?.toLowerCase() === 'verified' || doc.status?.toLowerCase() === 'approved'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                                      : doc.status?.toLowerCase() === 'declined' || doc.status?.toLowerCase() === 'rejected'
                                        ? 'bg-rose-50 text-rose-600 border border-rose-100/50'
                                        : 'bg-amber-50 text-amber-600 border border-amber-100/50'
                                  }`}>
                                    {doc.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-xs text-gray-400 italic max-w-[120px] truncate">{doc.comment}</td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {doc.images.map((url, i) => (
                                      <button
                                        key={`view-${i}`}
                                        onClick={() => window.open(url, '_blank')}
                                        className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                      >
                                        <Eye size={11} /> View
                                      </button>
                                    ))}
                                    {doc.images.map((url, i) => (
                                      <a
                                        key={`download-${i}`}
                                        href={url}
                                        download
                                        className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                      >
                                        <Download size={11} /> Save
                                      </a>
                                    ))}
                                    {doc.images.length === 0 && (
                                      <span className="text-[11px] text-gray-400 italic">No file</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 px-7 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/30">
                  <button
                    onClick={() => setDetailModal({ isOpen: false, driver: null })}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setDetailModal({ isOpen: false, driver: null });
                      handleAction('approve', d.id);
                    }}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-sm shadow-emerald-200 inline-flex items-center gap-2"
                  >
                    <CheckCircle2 size={15} /> Approve Driver
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ACTION MENU PORTAL */}
      {activeMenu && menuPosition && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-transparent" onClick={closeMenu} />
          <div
            className="fixed z-[9999] bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 text-left overflow-y-auto"
            style={{
              width: ACTION_MENU_WIDTH,
              maxHeight: `min(${ACTION_MENU_MAX_HEIGHT}px, calc(100vh - 24px))`,
              ...menuPosition,
            }}
          >
            <button onClick={() => handleAction('approve', activeMenu)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors text-xs font-semibold">
              <CheckCircle2 size={14} /> Approve
            </button>
            <button onClick={() => handleAction('edit', activeMenu)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-xs font-medium">
              <Edit2 size={14} className="text-gray-400" /> Edit Details
            </button>
            <button
              onClick={() => {
                closeMenu();
                setPasswordModal({ isOpen: true, driverId: activeMenu, password: '', isSubmitting: false });
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-xs font-medium"
            >
              <Key size={14} className="text-gray-400" /> Update Password
            </button>
            <button onClick={() => handleAction('view', activeMenu)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors text-xs font-medium">
              <Eye size={14} /> View Profile
            </button>
            <div className="h-px bg-gray-100 my-1 mx-2" />
            <button onClick={() => handleAction('delete', activeMenu)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors text-xs font-semibold">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>,
        document.body,
      )}

    </div>
  );
};

export default PendingDrivers;
