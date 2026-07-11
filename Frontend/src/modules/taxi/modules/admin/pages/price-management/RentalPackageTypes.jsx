import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  ArrowLeft,
  Loader2,
  Clock,
  Filter,
  Save,
  Activity,
  ChevronDown,
  Info
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-2 block text-[12px] font-bold text-slate-700';
const selectClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E\')] bg-[length:18px] bg-[right_12px_center] bg-no-repeat';

const StatusToggle = ({ active, onToggle }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${active ? 'bg-[#10B981]' : 'bg-gray-300'}`}
  >
    <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-5.5' : 'translate-x-0'}`} />
  </button>
);

const RentalPackageTypes = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  const isCreate = propMode === 'create' || location.pathname.endsWith('/create');
  const isEdit = propMode === 'edit' || location.pathname.includes('/edit/');
  const isList = !isCreate && !isEdit;

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    transport_type: 'taxi',
    short_description: '',
    description: '',
    status: 'active',
  });

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await adminService.getRentalPackageTypes();
      if (res && res.success) {
        // Backend pattern consistency: check data.results or rental_packages.results
        const rawPackages = res.data?.rental_packages?.results || res.data?.rental_packages || res.rental_packages?.results || res.rental_packages || res.results || res.data?.results || [];
        setPackages(Array.isArray(rawPackages) ? rawPackages : []);
      }
    } catch (err) {
      toast.error('Failed to load rental packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isList) {
      fetchPackages();
    } else if (isEdit && id) {
      const fetchItem = async () => {
        try {
          const res = await adminService.getRentalPackageTypes();
          const items = res.data?.rental_packages?.results || res.data?.rental_packages || res.rental_packages?.results || res.rental_packages || res.results || res.data?.results || [];
          const itemsArr = Array.isArray(items) ? items : [];
          const item = itemsArr.find(p => String(p._id || p.id) === String(id));
          if (item) {
            setFormData({
              name: item.name || '',
              transport_type: item.transport_type || 'taxi',
              short_description: item.short_description || '',
              description: item.description || '',
              status: item.status || 'active',
            });
          }
        } catch (err) {
          toast.error('Failed to fetch package details');
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    } else {
      setLoading(false);
    }
  }, [isList, isEdit, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name) return toast.error('Package name is required');
    try {
      setSubmitting(true);
      if (isEdit) {
        await adminService.updateRentalPackageType(id, formData);
        toast.success('Package updated');
      } else {
        await adminService.createRentalPackageType(formData);
        toast.success('Package created');
      }
      navigate('/admin/pricing/rental-packages');
    } catch (err) {
      toast.error(err.message || 'Failed to save package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pid) => {
    if (!window.confirm('Delete this rental package type?')) return;
    try {
      await adminService.deleteRentalPackageType(pid);
      toast.success('Package deleted');
      fetchPackages();
    } catch (err) {
      toast.error('Failed to delete package');
    }
  };

  const filteredPackages = useMemo(() => {
    return packages.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [packages, searchTerm]);

  if (isList) {
    return (
      <div className="min-h-screen bg-[#F3F4F9] animate-in fade-in duration-500 font-sans flex flex-col">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm relative z-10">
          <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">RENTAL PACKAGES</h1>
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
            <span>Pricing</span>
            <ChevronRight size={12} className="opacity-30" />
            <span className="text-gray-500">Rental Packages</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-10">
          <motion.div 
            key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
              {/* Toolbar */}
              <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                  <span>show</span>
                  <select 
                    value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded-md px-2 py-1 text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search packages..."
                      className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-64"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#EF6C4D] text-white rounded-lg text-[13px] font-bold shadow-md hover:bg-[#D95B3D] transition-colors">
                    <Filter size={16} /> Filters
                  </button>
                  <button 
                    onClick={() => navigate("create")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#3B488C] text-white rounded-lg text-[13px] font-bold shadow-md hover:bg-[#2D3870] transition-colors"
                  >
                    <Plus size={18} /> Add Package
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="px-8 pb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#E9E9E9]">
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Name</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Transport Type</th>
                        <th className="px-6 py-4 text-[13px] font-bold text-slate-700">Status</th>
                        <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="py-24 text-center">
                            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                          </td>
                        </tr>
                      ) : filteredPackages.length > 0 ? (
                        filteredPackages.slice(0, entriesPerPage).map(p => (
                          <tr key={p._id || p.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={16} /></div>
                                <span className="text-[14px] font-bold text-slate-700">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.transport_type === 'taxi' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                {p.transport_type || 'Taxi'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <StatusToggle 
                                active={p.status === 'active' || p.active} 
                                onToggle={() => {
                                  const sid = p._id || p.id;
                                  const currentActive = p.status === 'active' || p.active;
                                  adminService.updateRentalPackageType(sid, { status: currentActive ? 'inactive' : 'active', active: !currentActive })
                                    .then(() => { toast.success('Status Updated'); fetchPackages(); });
                                }}
                              />
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => navigate(`edit/${p._id || p.id}`)} className="p-2 bg-orange-50 text-orange-400 hover:bg-orange-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(p._id || p.id)} className="p-2 bg-rose-50 text-rose-400 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-32 text-center text-gray-400 font-medium italic">
                            No rental packages configured in the system.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate("/admin/pricing/rental-packages")}>Rental Package Types</span>
            <ChevronRight size={12} />
            <span className="text-slate-700">{isEdit ? 'Edit' : 'Create'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Rental Package' : 'Create Rental Package'}</h1>
          <p className="mt-1 text-sm text-slate-500">Define rental package details and its transport type.</p>
        </div>
        <button
          onClick={() => navigate('/admin/pricing/rental-packages')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-2 lg:p-8">
          <div>
            <label className={labelClass}>Transport Type *</label>
            <select name="transport_type" value={formData.transport_type} onChange={handleInputChange} className={selectClass}>
              <option value="">Select Transport Type</option>
              <option value="taxi">Taxi / Ride-Hailing</option>
              <option value="delivery">Logistics / Delivery</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Name *</label>
            <input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. 2 Hrs - 20 Kms" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Short Description *</label>
            <input name="short_description" value={formData.short_description} onChange={handleInputChange} placeholder="e.g. Ideal for short trips" className={inputClass} />
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>Description *</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              rows={3} 
              placeholder="Enter detailed description here..." 
              className={inputClass + " resize-none min-h-[80px]"} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/50 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 px-4 py-3">
            <Info size={16} className="mt-0.5 shrink-0 text-indigo-600" />
            <p className="text-sm text-indigo-800">
              Rental packages allow users to book vehicles on an hourly basis. Ensure descriptions clearly state what is included.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <button 
              type="submit" disabled={submitting}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24305f] disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {submitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
            <button 
              type="button" onClick={() => navigate('/admin/pricing/rental-packages')}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RentalPackageTypes;
