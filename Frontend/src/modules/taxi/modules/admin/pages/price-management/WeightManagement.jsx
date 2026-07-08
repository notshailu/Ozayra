import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  Trash2,
  Edit2,
  ArrowLeft,
  Scale,
  CheckCircle2,
  Loader2,
  Info,
  Save,
  DollarSign,
  Route,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../../shared/api/axiosInstance';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-2 block text-[12px] font-bold text-slate-700';

const defaultFormData = {
  weight_range: '',
  base_price: '',
  base_distance: '',
  price_per_distance: '',
  active: 1,
  vehicle_types: [],
};

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const StatusToggle = ({ active, onToggle }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={`relative h-6 w-12 rounded-full transition-all ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
  >
    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
  </button>
);

const WeightManagement = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditor = mode === 'create' || mode === 'edit';

  const [ranges, setRanges] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const [rangesResponse, vehiclesResponse] = await Promise.all([
          api.get('/admin/types/weight-ranges'),
          api.get('/admin/types/vehicle-types'),
        ]);

        if (!mounted) return;

        const rangesPayload = unwrap(rangesResponse);
        const results = Array.isArray(rangesPayload) ? rangesPayload : (rangesPayload?.results || []);

        const vehiclesPayload = unwrap(vehiclesResponse);
        const vehicleResults = Array.isArray(vehiclesPayload) ? vehiclesPayload : (vehiclesPayload?.results || vehiclesPayload?.vehicle_types || []);

        const filteredVehicles = vehicleResults.filter(v => {
          const type = String(v.transport_type || '').toLowerCase();
          return type === 'delivery' || type === 'both';
        });

        setRanges(results);
        setVehicleOptions(filteredVehicles.map(v => ({
          id: String(v._id || v.id),
          name: v.name || 'Unknown Vehicle',
          transport_type: v.transport_type || '',
        })));

        if (mode === 'edit' && id) {
          const existing = results.find((item) => String(item.id || item._id) === String(id));
          if (existing) {
            setFormData({
              weight_range: existing.weight_range,
              base_price: String(existing.base_price ?? ''),
              base_distance: String(existing.base_distance ?? ''),
              price_per_distance: String(existing.price_per_distance ?? ''),
              active: existing.active,
              vehicle_types: Array.isArray(existing.vehicle_types) 
                ? existing.vehicle_types.map(vt => vt.id || vt._id || vt) 
                : [],
            });
          }
        } else if (mode === 'create') {
          setFormData(defaultFormData);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error.message || 'Could not load weight ranges.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [id, mode]);

  const filteredRanges = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return ranges;
    return ranges.filter((item) => item.weight_range.toLowerCase().includes(query));
  }, [ranges, searchTerm]);

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.weight_range.trim()) {
      setErrorMessage('Weight range description is required.');
      return;
    }
    if (formData.base_price === '') {
      setErrorMessage('Base price is required.');
      return;
    }
    if (formData.base_distance === '') {
      setErrorMessage('Base distance is required.');
      return;
    }
    if (formData.price_per_distance === '') {
      setErrorMessage('Price per Km is required.');
      return;
    }
    if (!formData.vehicle_types.length) {
      setErrorMessage('Select at least one supported vehicle type.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        weight_range: formData.weight_range.trim(),
        base_price: Number(formData.base_price),
        base_distance: Number(formData.base_distance),
        price_per_distance: Number(formData.price_per_distance),
        active: Number(formData.active),
        vehicle_types: formData.vehicle_types,
      };

      if (id && mode === 'edit') {
        await api.patch(`/admin/types/weight-ranges/${id}`, payload);
      } else {
        await api.post('/admin/types/weight-ranges', payload);
      }

      navigate('/taxi/admin/pricing/weight-management');
    } catch (error) {
      setErrorMessage(error.message || 'Could not save weight range.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this weight range bracket?')) {
      return;
    }

    try {
      await api.delete(`/admin/types/weight-ranges/${itemId}`);
      setRanges((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
    } catch (error) {
      setErrorMessage(error.message || 'Could not delete weight range.');
    }
  };

  const handleToggleStatus = async (item) => {
    const nextActive = item.active === 1 ? 0 : 1;

    try {
      await api.patch(`/admin/types/weight-ranges/${item.id}`, { active: nextActive });
      setRanges((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, active: nextActive } : entry)),
      );
    } catch (error) {
      setErrorMessage(error.message || 'Could not update status.');
    }
  };

  if (!isEditor) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Pricing</span>
            <ChevronRight size={12} />
            <span className="text-slate-700">Weight Management</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Weight Management</h1>
              <p className="mt-1 text-sm text-slate-500">Manage global parcel weight brackets and their associated fares.</p>
            </div>
            <button
              onClick={() => navigate('/taxi/admin/pricing/weight-management/create')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2e3c78] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#24305f]"
            >
              <Plus size={18} />
              Add Weight Bracket
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="relative max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search weight ranges"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Weight Range</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Base Price</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Included Distance</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Price Per Km</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Supported Vehicles</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-sm text-slate-400">Loading weight brackets...</td>
                  </tr>
                ) : !filteredRanges.length ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-sm text-slate-400">No weight brackets found.</td>
                  </tr>
                ) : filteredRanges.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Scale size={18} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{item.weight_range}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-slate-700">₹{item.base_price}</td>
                    <td className="px-6 py-5 font-medium text-slate-700">{item.base_distance} Km</td>
                    <td className="px-6 py-5 font-medium text-slate-700">₹{item.price_per_distance}/Km</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {item.vehicle_types && item.vehicle_types.length > 0 ? (
                          item.vehicle_types.map((vt) => (
                            <span key={vt.id} className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              {vt.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-slate-400">No vehicles assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusToggle active={item.active === 1} onToggle={() => handleToggleStatus(item)} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/taxi/admin/pricing/weight-management/edit/${item.id}`)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Pricing</span>
            <ChevronRight size={12} />
            <span className="text-slate-700">Weight Management</span>
            <ChevronRight size={12} />
            <span className="text-slate-700">{id ? 'Edit' : 'Create'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{id ? 'Edit Weight Bracket' : 'Create Weight Bracket'}</h1>
          <p className="mt-1 text-sm text-slate-500">Define weight range description and its corresponding fare calculation structure.</p>
        </div>
        <button
          onClick={() => navigate('/taxi/admin/pricing/weight-management')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {errorMessage ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-2 lg:p-8">
          <div>
            <label className={labelClass}>Weight Range Name *</label>
            <input
              type="text"
              value={formData.weight_range}
              onChange={(e) => updateForm('weight_range', e.target.value)}
              className={inputClass}
              placeholder="e.g. Under 5kg"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <div className="flex h-[50px] items-center rounded-xl border border-slate-200 px-4">
              <StatusToggle
                active={formData.active === 1}
                onToggle={() => updateForm('active', formData.active === 1 ? 0 : 1)}
              />
              <span className="ml-3 text-sm font-medium text-slate-700">
                {formData.active === 1 ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Base Price (₹) *</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={formData.base_price}
                onChange={(e) => updateForm('base_price', e.target.value)}
                className={inputClass + ' pl-10'}
                placeholder="45"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Included Distance (Km) *</label>
            <div className="relative">
              <Route size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={formData.base_distance}
                onChange={(e) => updateForm('base_distance', e.target.value)}
                className={inputClass + ' pl-10'}
                placeholder="2"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Price Per Km (₹) *</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={formData.price_per_distance}
                onChange={(e) => updateForm('price_per_distance', e.target.value)}
                className={inputClass + ' pl-10'}
                placeholder="15"
                required
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>Supported Vehicles *</label>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {vehicleOptions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {vehicleOptions.map((option) => {
                    const checked = formData.vehicle_types.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          checked
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setFormData((prev) => {
                              const exists = prev.vehicle_types.includes(option.id);
                              return {
                                ...prev,
                                vehicle_types: exists
                                  ? prev.vehicle_types.filter((id) => id !== option.id)
                                  : [...prev.vehicle_types, option.id],
                              };
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{option.name} {option.transport_type ? `(${option.transport_type})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No vehicle types found.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/50 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 px-4 py-3">
            <Info size={16} className="mt-0.5 shrink-0 text-indigo-600" />
            <p className="text-sm text-indigo-800">
              Weight ranges configured here will automatically determine base pricing, free distance, and incremental per-kilometer rates for parcel deliveries.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24305f] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : id ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/taxi/admin/pricing/weight-management')}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {!loading && formData.active === 1 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#14b8a6] text-white shadow-2xl"
          >
            <CheckCircle2 size={24} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default WeightManagement;
