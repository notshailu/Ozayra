import React, { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  FileText,
  Download,
  Star,
  Plus,
  Eye,
  Edit2,
  Key,
  XCircle,
  Trash2,
  Lock,
  Loader2,
  ChevronRight,
  Filter,
  List,
  LayoutGrid
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { adminService } from '../../services/adminService';

const ACTION_MENU_WIDTH = 176;
const ACTION_MENU_GAP = 8;
const ACTION_MENU_MAX_HEIGHT = 260;

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

const DriverList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, driverId: null, password: '', isSubmitting: false });
  const [detailModal, setDetailModal] = useState({ isOpen: false, driver: null });
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDrivers = async () => {
      setIsLoading(true);
      try {
        const responseData = await adminService.getDrivers(1, 50);
        const driversList = responseData.data?.results || [];
        if (responseData.success) {
          const approved = driversList.filter(d => {
            return d.approve === true || d.status?.toLowerCase() === 'active' || d.status?.toLowerCase() === 'approved';
          }).map(d => ({
            id: d._id,
            name: d.name || 'Unknown',
            email: d.email || 'N/A',
            gender: d.gender || 'N/A',
            serviceLocation: d.service_location_name || d.city || d.service_location?.name || 'India',
            phone: d.phone || d.mobile || 'N/A',
            transport: d.transport_type || d.register_for || d.transport_type || 'N/A',
            transportType: d.transport_type || d.register_for || d.vehicle_type || 'All - Bike',
            vehicle_make: d.vehicle_make || 'N/A',
            vehicle_model: d.vehicle_model || 'N/A',
            vehicle_number: d.vehicle_number || 'N/A',
            vehicle_color: d.vehicle_color || 'N/A',
            vehicle_image: d.vehicle_image || '',
            referral_code: d.referral_code || 'N/A',
            rating: Number(d.rating_count || d.ratingCount || 0) > 0
              ? Number(d.rating || d.average_rating || d.avg_rating || 0)
              : 0,
            registeredAt: d.createdAt || null,
            documents: d.documents || {},
            status: d.approve ? 'Approved' : (d.status || 'Approved')
          }));
          setDrivers(approved);
        } else {
          setError(responseData.message || 'Failed to fetch drivers');
        }
      } catch (err) {
        setError(err.message || 'Network error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  const closeMenu = () => {
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const toggleMenu = (e, userId) => {
    e.stopPropagation();
    if (activeMenu === userId) {
      closeMenu();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom - ACTION_MENU_GAP;
    const spaceAbove = rect.top - ACTION_MENU_GAP;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    const left = Math.min(
      Math.max(viewportPadding, rect.right - ACTION_MENU_WIDTH),
      window.innerWidth - ACTION_MENU_WIDTH - viewportPadding,
    );

    setMenuPosition({
      left,
      ...(openUp
        ? { bottom: Math.max(viewportPadding, window.innerHeight - rect.top + ACTION_MENU_GAP) }
        : {
            top: Math.max(
              viewportPadding,
              Math.min(
                rect.bottom + ACTION_MENU_GAP,
                window.innerHeight - ACTION_MENU_MAX_HEIGHT - viewportPadding,
              ),
            ),
          }),
    });
    setActiveMenu(userId);
  };

  useEffect(() => {
    if (!activeMenu) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    const handleReset = () => closeMenu();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReset, true);
    window.addEventListener('resize', handleReset);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReset, true);
      window.removeEventListener('resize', handleReset);
    };
  }, [activeMenu]);

  const handleAction = async (action, driverId) => {
    const confirmMsg = action === 'delete' ? 'Are you sure you want to delete this driver?' : 'Are you sure you want to disapprove this driver?';
    if (action !== 'password' && !window.confirm(confirmMsg)) return;

    try {
      let resData;
      if (action === 'delete') {
        resData = await adminService.deleteDriver(driverId);
      } else if (action === 'disapprove') {
        resData = await adminService.updateDriverStatus(driverId, { approve: false, status: 'disapproved', active: false });
      } else if (action === 'password') {
        setPasswordModal(prev => ({ ...prev, isSubmitting: true }));
        resData = await adminService.updateDriverPassword(driverId, passwordModal.password);
      }

      if (resData.success) {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        if (action === 'delete' || action === 'disapprove') {
          setDrivers(prev => prev.filter(d => d.id !== driverId));
        }
        if (action === 'password') {
          setPasswordModal({ isOpen: false, driverId: null, password: '', isSubmitting: false });
        }
      } else {
        alert(resData.message || `Failed to ${action}`);
        if (action === 'password') setPasswordModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      alert(err.message || `Network error during ${action}`);
      if (action === 'password') setPasswordModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.phone.includes(searchTerm)
  );

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

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {error && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Drivers</span>
          <ChevronRight size={12} />
          <span className="text-gray-700">Approved Drivers</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Approved Drivers</h1>
          <button
            onClick={() => navigate('/admin/drivers/create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} /> Add Drivers
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 bg-teal-500 text-white rounded-lg flex items-center justify-center shadow-sm">
              <List size={18} />
            </button>
            <button className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center hover:bg-indigo-50 transition-all">
              <LayoutGrid size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-400 flex items-center justify-center shadow-sm">
              <Search size={16} />
            </button>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm uppercase tracking-wide">
              <Filter size={14} /> Filters
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Service Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mobile Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Transport Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Approved Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Registered at</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                      <p className="text-sm text-gray-400">Loading drivers...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center text-sm text-gray-400">No drivers found.</td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{driver.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{driver.serviceLocation}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{driver.phone}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{driver.transportType}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={13} className={s <= driver.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(driver.registeredAt)}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="relative inline-block flex items-center gap-2 justify-end">
                        <button
                          onClick={() => {
                            setDetailModal({
                              isOpen: true,
                              driver,
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button 
                          onClick={(e) => toggleMenu(e, driver.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filteredDrivers.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing 1 to {filteredDrivers.length} of {filteredDrivers.length} entries</span>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-400" disabled>Prev</button>
              <button className="w-7 h-7 rounded bg-indigo-600 text-white text-xs font-medium">1</button>
              <button className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-400" disabled>Next</button>
            </div>
          </div>
        )}
      </div>

      {activeMenu && menuPosition && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-transparent" onClick={closeMenu} />
          <div
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 py-1 overflow-y-auto"
            style={{
              width: ACTION_MENU_WIDTH,
              maxHeight: `min(${ACTION_MENU_MAX_HEIGHT}px, calc(100vh - 24px))`,
              ...menuPosition,
            }}
          >
            <button
              onClick={() => {
                closeMenu();
                handleAction('disapprove', activeMenu);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <XCircle size={13} /> Disapprove
            </button>
            <button
              onClick={() => {
                closeMenu();
                navigate(`/admin/drivers/edit/${activeMenu}`);
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 size={13} className="text-gray-400" /> Edit
            </button>
            <button
              onClick={() => {
                closeMenu();
                setPasswordModal({ isOpen: true, driverId: activeMenu, password: '', isSubmitting: false });
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Key size={13} className="text-gray-400" /> Update Password
            </button>
            <button
              onClick={() => {
                closeMenu();
                const driver = drivers.find((d) => d.id === activeMenu);
                if (driver) {
                  setDetailModal({
                    isOpen: true,
                    driver,
                  });
                }
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye size={13} className="text-gray-400" /> View Profile
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={() => {
                closeMenu();
                handleAction('delete', activeMenu);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>,
        document.body,
      )}

      {/* Password Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-gray-200">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Update Password</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Set a new password for this driver</p>
                </div>
                <button 
                  onClick={() => setPasswordModal({ isOpen: false, driverId: null, password: '', isSubmitting: false })}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Enter new password"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={passwordModal.password}
                    onChange={(e) => setPasswordModal(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Minimum 8 characters required.</p>
              </div>

              <button 
                onClick={() => {
                  if (passwordModal.password.length < 4) { alert('Password too short'); return; }
                  handleAction('password', passwordModal.driverId);
                }}
                disabled={passwordModal.isSubmitting || !passwordModal.password}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {passwordModal.isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <Key size={15} />}
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (ONBOARDING DATA VIEW) */}
      <AnimatePresence>
        {detailModal.isOpen && detailModal.driver && (() => {
          const d = detailModal.driver;
          const normalizedDocs = normalizeDocuments(d.documents);
          return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl border border-gray-200 p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Onboarding Profile Audit</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Driver Verification System</p>
                  </div>
                  <button 
                    onClick={() => setDetailModal({ isOpen: false, driver: null })}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 overflow-y-auto pr-2 flex-grow">
                  {/* Left Column - Personal & Vehicle Details */}
                  <div className="space-y-6">
                    {/* Personal Card */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-200 pb-1.5">Personal Information</h4>
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Name</p>
                          <p className="font-semibold text-gray-800">{d.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Email</p>
                          <p className="font-semibold text-gray-800 break-all">{d.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Mobile Number</p>
                          <p className="font-semibold text-gray-800">{d.phone}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Gender</p>
                          <p className="font-semibold text-gray-800">{d.gender}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Service Location</p>
                          <p className="font-semibold text-gray-800">{d.serviceLocation}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Referral Code</p>
                          <p className="font-semibold text-gray-800">{d.referral_code || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Card */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-200 pb-1.5">Vehicle Details</h4>
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Transport Type</p>
                          <p className="font-semibold text-gray-800 capitalize">{d.transport}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vehicle Make & Model</p>
                          <p className="font-semibold text-gray-800">{d.vehicle_make} {d.vehicle_model}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Plate Number</p>
                          <p className="font-semibold text-gray-800 uppercase">{d.vehicle_number}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Color</p>
                          <p className="font-semibold text-gray-800">{d.vehicle_color}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Documents Table */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider border-b border-gray-100 pb-1.5">Documents Checklist</h4>
                    <div className="overflow-x-auto border border-gray-150 rounded-lg">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                            <th className="px-6 py-3">Document Name</th>
                            <th className="px-4 py-3">Identify Number</th>
                            <th className="px-4 py-3">Expiry Date</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3">Comment</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                          {normalizedDocs.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-12 text-center text-gray-400">No documents uploaded.</td>
                            </tr>
                          ) : (
                            normalizedDocs.map((doc, idx) => (
                              <tr key={`${doc.name}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-900">{doc.name}</td>
                                <td className="px-4 py-4">{doc.identify_number}</td>
                                <td className="px-4 py-4">{doc.expiry_date}</td>
                                <td className="px-4 py-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium capitalize ${
                                    doc.status?.toLowerCase() === 'verified' || doc.status?.toLowerCase() === 'approved'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : doc.status?.toLowerCase() === 'declined' || doc.status?.toLowerCase() === 'rejected'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {doc.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-gray-400 italic">{doc.comment}</td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {doc.images.map((url, i) => (
                                      <button
                                        key={`view-${i}`}
                                        onClick={() => window.open(url, '_blank')}
                                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                      >
                                        <Eye size={12} /> View
                                      </button>
                                    ))}
                                    {doc.images.map((url, i) => (
                                      <a
                                        key={`download-${i}`}
                                        href={url}
                                        download
                                        className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                      >
                                        <Download size={12} /> Download
                                      </a>
                                    ))}
                                    {doc.images.length === 0 && (
                                      <span className="text-xs text-gray-400 italic">No File</span>
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

                <div className="flex justify-end pt-4 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => setDetailModal({ isOpen: false, driver: null })}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default DriverList;
