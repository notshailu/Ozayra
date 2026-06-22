import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Car, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  Save, 
  ArrowLeft,
  Loader2,
  CreditCard,
  User,
  Zap,
  Truck,
  Layers,
  ShieldCheck,
  Activity,
  DollarSign,
  Tag,
  Clock,
  ChevronLeft,
  Gift,
  Settings,
  Filter,
  Cone,
  Info,
  ChevronDown,
  Globe,
  Eye,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';

const inputClass = "w-full border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-800 bg-white focus:border-indigo-500 transition-all outline-none";
const labelClass = "block text-[13px] font-semibold text-gray-700 mb-2.5";

const StatusToggle = ({ active, onToggle }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${active ? 'bg-[#00BFA5]' : 'bg-gray-200'}`}
  >
    <div className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
  </button>
);

const initialFormState = {
  zone_id: '',
  service_location_id: '',
  transport_type: '',
  vehicle_type: '',
  payment_type: ['cash'],
  admin_commision_type: '1',
  admin_commision: '',
  admin_commission_type_from_driver: '1',
  admin_commission_from_driver: '',
  admin_commission_type_for_owner: '1',
  admin_commission_for_owner: '',
  service_tax: '',
  order_number: '',
  base_price: '',
  base_distance: '',
  price_per_distance: '',
  time_price: '',
  waiting_charge: '',
  free_waiting_before: '',
  free_waiting_after: '',
  enable_airport_ride: false,
  support_airport_fee: '',
  airport_surge: '',
  enable_outstation_ride: false,
  outstation_base_price: '',
  outstation_base_distance: '',
  outstation_price_per_distance: '',
  outstation_time_price: '',
  enable_ride_sharing: false,
  enable_shared_ride: 0,
  price_per_seat: '',
  shared_price_per_distance: '',
  shared_cancel_fee: '',
  user_cancellation_fee: '',
  user_cancellation_fee_type: 'percentage',
  driver_cancellation_fee: '',
  driver_cancellation_fee_type: 'percentage',
  cancellation_fee_goes_to: 'admin',
  status: 'active',
  active: 1,
  parcel_weight_ranges: []
};

const SetPrices = ({ mode, filterType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isCreateOrEdit = mode === 'create' || mode === 'edit';
  const view = isCreateOrEdit ? 'create' : 'list';
  const editingId = id || null;

  const basePath = location.pathname.split('/pricing/')[0] + '/pricing/' + (filterType === 'taxi' ? 'taxi-commission' : 'parcel-commission');

  const [prizes, setPrizes] = useState([]);
  const [prizesFull, setPrizesFull] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [zones, setZones] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const { transportTypes } = useTaxiTransportTypes();

  const [formData, setFormData] = useState({
    ...initialFormState,
    transport_type: filterType || ''
  });

  const baseUrl = `${API_BASE_URL}/admin`;
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  useEffect(() => {
    if (mode === 'edit' && id && prizesFull.length > 0) {
      const pData = prizesFull.find(d => (String(d._id || '') === String(id) || String(d.id || '') === String(id)));
      if (pData) {
        setFormData({
          ...initialFormState,
          ...pData,
          zone_id: pData.zone_id?._id || pData.zone_id || '',
          service_location_id: pData.service_location_id?._id || pData.service_location_id || '',
          vehicle_type: pData.vehicle_type?._id || pData.vehicle_type || '',
          admin_commision: pData.admin_commision ?? pData.customer_commission ?? '',
          admin_commision_type: String(pData.admin_commision_type ?? 1),
          admin_commission_from_driver: pData.admin_commission_from_driver ?? pData.driver_commission ?? '',
          admin_commission_type_from_driver: String(pData.admin_commission_type_from_driver ?? 1),
          admin_commission_for_owner: pData.admin_commission_for_owner ?? 0,
          admin_commission_type_for_owner: String(pData.admin_commission_type_for_owner ?? 1),
          order_number: pData.order_number ?? pData.eta_sequence ?? '',
          payment_type: Array.isArray(pData.payment_type) ? pData.payment_type : (pData.payment_type ? [pData.payment_type] : ['cash']),
          user_cancellation_fee_type: pData.user_cancellation_fee_type || 'percentage',
          driver_cancellation_fee_type: pData.driver_cancellation_fee_type || 'percentage',
          parcel_weight_ranges: pData.parcel_weight_ranges || [],
        });
      }
    } else if (mode === 'create') {
      setFormData({
        ...initialFormState,
        transport_type: filterType || ''
      });
    }
  }, [mode, id, prizesFull, filterType]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const auth = { 'Authorization': `Bearer ${token}` };
      const [prizesRes, zonesRes, vehiclesRes] = await Promise.all([
        fetch(`${baseUrl}/types/set-prices`, { headers: auth }),
        fetch(`${baseUrl}/zones`, { headers: auth }),
        fetch(`${baseUrl}/types/vehicle-types`, { headers: auth })
      ]);

      const [prizesData, zonesData, vehiclesData] = await Promise.all([
        prizesRes.json(), zonesRes.json(), vehiclesRes.json()
      ]);

      if (prizesData.success) {
        const items = prizesData.results || prizesData.data?.results || [];
        const fullItems = prizesData.paginator?.data || items || [];
        setPrizes(items);
        setPrizesFull(fullItems);
      }
      
      const zItems = zonesData.results || zonesData.data?.zones || JSON.parse(JSON.stringify(zonesData.data?.results || []));
      setZones(Array.isArray(zItems) ? zItems : []);
      
      const vItems = vehiclesData.results || vehiclesData.data?.vehicle_types || JSON.parse(JSON.stringify(vehiclesData.data?.results || []));
      setVehicleTypes(Array.isArray(vItems) ? vItems : []);
      
    } catch (error) { 
      console.error("Fetch Data Error:", error);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSave = async (e) => {
    if(e) e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${baseUrl}/types/set-prices/${editingId}` : `${baseUrl}/types/set-prices`;
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          payment_type: Array.isArray(formData.payment_type) ? formData.payment_type.join(',') : formData.payment_type
        })
      });
      const data = await res.json();
      if (data.success) {
        navigate(basePath);
        fetchInitialData();
      } else alert(data.message || "Failed to save");
    } catch (error) { console.error(error); } finally { setSaving(false); }
  };

  const filteredPrizes = prizes.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (p.zone_name || '').toLowerCase().includes(q) || (p.vehicle_type_name || '').toLowerCase().includes(q);
    if (filterType === 'taxi') {
      return matchesSearch && (p.transport_type === 'taxi' || p.transport_type === 'both' || p.transport_type === 'all');
    }
    if (filterType === 'delivery') {
      return matchesSearch && (p.transport_type === 'delivery' || p.transport_type === 'both' || p.transport_type === 'all');
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="p-6 lg:p-8 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-6">
               <h1 className="text-sm font-bold text-[#1E293B] uppercase tracking-[0.15em]">
                 {filterType === 'taxi' ? 'TAXI COMMISSION' : (filterType === 'delivery' ? 'PARCEL COMMISSION' : 'SET PRICES')}
               </h1>
               <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium tracking-tight">
                  <span className="hover:text-slate-600 transition-colors cursor-pointer" onClick={() => fetchInitialData()}>
                    {filterType === 'taxi' ? 'Taxi Commission' : (filterType === 'delivery' ? 'Parcel Commission' : 'Set Prices')}
                  </span>
                  <ChevronRight size={10} className="text-slate-300" />
                  <span className="text-slate-800 font-bold">Listing</span>
               </div>
            </div>

            <div className="bg-white rounded-md border border-gray-100 shadow-sm overflow-hidden">
               <div className="p-5 flex items-center justify-between border-b border-gray-50 bg-white px-8">
                  <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                    <span>show</span>
                    <div className="relative">
                      <select className="appearance-none bg-white border border-gray-200 rounded px-4 py-1.5 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700 font-bold text-[13px]">
                        <option>10</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <span>entries</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => fetchInitialData()} className={`w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full text-slate-400 hover:text-indigo-600 transition-all shadow-sm ${loading ? 'animate-spin' : ''}`}>
                      {loading ? <Loader2 size={18} /> : <Search size={18} />}
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-[#F37048] text-white rounded text-sm font-bold shadow-sm">
                      <Filter size={16} /> Filters
                    </button>
                    <button onClick={() => navigate(`${basePath}/create`)} className="flex items-center gap-2 px-6 py-2 bg-[#44516F] text-white rounded text-sm font-bold shadow-sm">
                      <Plus size={18} /> Add {filterType === 'taxi' ? 'Taxi Commission' : (filterType === 'delivery' ? 'Parcel Commission' : 'Set Price')}
                    </button>
                  </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-[#FBFCFF]">
                     <tr className="border-b border-gray-100 text-[11px] text-slate-800 uppercase font-black tracking-[0.1em]">
                        <th className="px-8 py-5">Zone</th>
                        <th className="px-8 py-5">Transport Type</th>
                        <th className="px-8 py-5">Vehicle Type</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-right pr-12">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                    {loading && prizes.length === 0 ? (
                       <tr><td colSpan="5" className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Price Matrix...</td></tr>
                    ) : filteredPrizes.length === 0 ? (
                       <tr><td colSpan="5" className="py-24 text-center text-slate-400 italic">No price rules configured.</td></tr>
                    ) : (
                      filteredPrizes.map((prize) => (
                        <tr key={prize.id || prize._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 text-sm font-semibold text-slate-700">{prize.zone_name || 'India'}</td>
                          <td className="px-8 py-6 text-sm text-slate-600 font-medium">
                            {prize.transport_type === 'both' ? 'All' : (prize.transport_type === 'taxi' ? 'Ride Hailing' : (prize.transport_type === 'delivery' ? 'Parcel Delivery' : (prize.transport_type || 'All')))}
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-800 font-bold">{prize.vehicle_type_name || 'Premium Car'}</td>
                          <td className="px-8 py-6">
                             <StatusToggle active={Number(prize.active) === 1} onToggle={async () => {
                               try {
                                 await fetch(`${baseUrl}/types/set-prices/${prize.id || prize._id}`, {
                                   method: 'PATCH',
                                   headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ active: Number(prize.active) === 1 ? 0 : 1 })
                                 });
                                 fetchInitialData();
                               } catch(e) {}
                             }} />
                          </td>
                          <td className="px-8 py-6 text-right pr-12">
                             <div className="flex items-center justify-end gap-2">
                                <button onClick={() => navigate(`${basePath}/edit/${prize.id || prize._id}`)} className="w-8 h-8 flex items-center justify-center bg-[#FFF7ED] text-[#F97316] rounded transition-colors hover:bg-orange-100"><Edit2 size={14} /></button>
                                 <button 
                                   title="set package prices"
                                   onClick={() => navigate(`${basePath}/packages/${prize.id || prize._id}`)}
                                   className="w-8 h-8 flex items-center justify-center bg-[#F0FDFA] text-[#14B8A6] rounded transition-colors hover:bg-emerald-100"
                                 >
                                    <Gift size={14} />
                                 </button>
                                 <button 
                                   title="Surge"
                                   onClick={() => navigate(`${basePath}/surge/${prize.id || prize._id}`)}
                                   className="w-8 h-8 flex items-center justify-center bg-[#FEF2F2] text-[#EF4444] rounded transition-colors hover:bg-red-100"
                                 >
                                    <Zap size={14} />
                                 </button>
                                 <button 
                                   title="driver incentive"
                                   onClick={() => navigate(`${basePath}/incentive/${prize.id || prize._id}`)}
                                   className="w-8 h-8 flex items-center justify-center bg-[#EEF2FF] text-[#6366F1] rounded transition-colors hover:bg-indigo-100"
                                 >
                                    <Cone size={14} />
                                 </button>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="p-6 lg:p-8 space-y-6"
          >
            {/* Form Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-8">
               <h1 className="text-sm font-bold text-[#1E293B] uppercase tracking-[0.15em]">
                 {mode === 'edit' ? 'EDIT' : 'CREATE'} {filterType === 'taxi' ? 'TAXI COMMISSION' : (filterType === 'delivery' ? 'PARCEL COMMISSION' : 'PRICE')}
               </h1>
               <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <span className="hover:text-slate-600 transition-colors cursor-pointer" onClick={() => navigate(basePath)}>
                    {filterType === 'taxi' ? 'Taxi Commission' : (filterType === 'delivery' ? 'Parcel Commission' : 'Set Prices')}
                  </span>
                  <ChevronRight size={10} className="text-slate-300" />
                  <span className="text-slate-800 font-bold">{mode === 'edit' ? 'Edit' : 'Create'}</span>
               </div>
            </div>

            <div className="bg-white rounded-md border border-gray-100 shadow-sm p-4 lg:p-10 relative">
               {loading && mode === 'edit' && (
                  <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-4">
                     <Loader2 className="animate-spin text-indigo-600" size={40} />
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hydrating Form State...</p>
                  </div>
               )}
               
               <div className="flex justify-end mb-4">
                  <button className="text-[11px] font-bold text-[#00BFA5] underline decoration-dotted underline-offset-4">How It Works</button>
               </div>

               <form onSubmit={handleSave} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                     {/* Column System */}
                     <div>
                        <label className={labelClass}>Zone <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <select 
                              required 
                              className={inputClass + " appearance-none cursor-pointer"} 
                              value={formData.zone_id} 
                              onChange={e => {
                                 const val = e.target.value;
                                 const matched = zones.find(z => String(z._id || z.id) === String(val));
                                 setFormData(p => ({
                                    ...p, 
                                    zone_id: val,
                                    service_location_id: matched?.service_location_id || ''
                                 }));
                              }}
                           >
                              <option value="">Select Zone</option>
                              {zones.map(z => <option key={z._id || z.id} value={z._id || z.id}>{z.name}</option>)}
                           </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className={labelClass}>Transport Type <span className="text-rose-500">*</span></label>
                        <div className="relative">
                            <select required disabled={!!filterType} className={inputClass + " appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-500"} value={formData.transport_type} onChange={e => setFormData(p=>({...p, transport_type: e.target.value}))}>
                               <option value="">Select Transport Type</option>
                               {transportTypes.map(t => (
                                 <option key={t.id || t._id} value={t.name}>{t.display_name}</option>
                               ))}
                            </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                         {['delivery', 'both', 'all'].includes(String(formData.transport_type).toLowerCase()) ? (
                           <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1"><Info size={11} /> Weight-based rates configuration is enabled below.</p>
                         ) : (
                           <p className="text-[11px] font-semibold text-slate-400 mt-1.5 flex items-center gap-1"><Info size={11} /> Select "Delivery" or "Both" to configure weight-specific pricing brackets.</p>
                         )}
                     </div>
                     <div>
                        <label className={labelClass}>Vehicle Type <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <select required className={inputClass + " appearance-none cursor-pointer"} value={formData.vehicle_type} onChange={e => setFormData(p=>({...p, vehicle_type: e.target.value}))}>
                              <option value="">Select Vehicle Type</option>
                              {vehicleTypes.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name}</option>)}
                           </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className={labelClass}>Payment Type <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <select required className={inputClass + " appearance-none cursor-pointer"} value={Array.isArray(formData.payment_type) ? (formData.payment_type[0] || 'cash') : (formData.payment_type || 'cash')} onChange={e => setFormData(p=>({...p, payment_type: [e.target.value]}))}>
                              <option value="">Select Payment Type</option>
                              <option value="cash">Cash</option>
                              <option value="online">Online</option>
                              <option value="wallet">Wallet</option>
                           </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className={labelClass}>Admin Commission Type From Customer <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <select required className={inputClass + " appearance-none cursor-pointer"} value={formData.admin_commision_type} onChange={e => setFormData(p=>({...p, admin_commision_type: e.target.value}))}>
                              <option value="">Select Type</option>
                              <option value="1">Percentage</option>
                              <option value="2">Fixed</option>
                           </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className={labelClass}>Admin Commission From Customer <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Admin Commission From Customer" value={formData.admin_commision} onChange={e => setFormData(p=>({...p, admin_commision: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Admin Commission Type From Driver <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <select required className={inputClass + " appearance-none cursor-pointer"} value={formData.admin_commission_type_from_driver} onChange={e => setFormData(p=>({...p, admin_commission_type_from_driver: e.target.value}))}>
                              <option value="">Select Type</option>
                              <option value="1">Percentage</option>
                              <option value="2">Fixed</option>
                           </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className={labelClass}>Admin Commission From Driver <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Admin Commission From Driver" value={formData.admin_commission_from_driver} onChange={e => setFormData(p=>({...p, admin_commission_from_driver: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Admin Commission Type From Owner <span className="text-rose-500">*</span></label>
                        <div className="relative">
                           <select required className={inputClass + " appearance-none cursor-pointer"} value={formData.admin_commission_type_for_owner} onChange={e => setFormData(p=>({...p, admin_commission_type_for_owner: e.target.value}))}>
                              <option value="">Select Type</option>
                              <option value="1">Percentage</option>
                              <option value="2">Fixed</option>
                           </select>
                           <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className={labelClass}>Admin Commission From Owner <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Admin Commission From Owner" value={formData.admin_commission_for_owner} onChange={e => setFormData(p=>({...p, admin_commission_for_owner: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Service Tax (%) <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Service Tax (%)" value={formData.service_tax} onChange={e => setFormData(p=>({...p, service_tax: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>ETA Sequence <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Order Number" value={formData.order_number} onChange={e => setFormData(p=>({...p, order_number: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Base Price <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Base Price" value={formData.base_price} onChange={e => setFormData(p=>({...p, base_price: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Base Distance <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Base Distance" value={formData.base_distance} onChange={e => setFormData(p=>({...p, base_distance: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Price Per Distance <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Price Per Distance" value={formData.price_per_distance} onChange={e => setFormData(p=>({...p, price_per_distance: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Time Price in Mintue <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Time Price" value={formData.time_price} onChange={e => setFormData(p=>({...p, time_price: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Waiting Charge <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Enter Waiting Charge" value={formData.waiting_charge} onChange={e => setFormData(p=>({...p, waiting_charge: e.target.value}))} />
                     </div>
                     <div>
                        <label className={labelClass}>Free Waiting Time In Minutes Before Start A Ride <span className="text-rose-500">*</span></label>
                        <input type="number" required className={inputClass} placeholder="Free Waiting Time In Minutes Before Start A Ride" value={formData.free_waiting_before} onChange={e => setFormData(p=>({...p, free_waiting_before: e.target.value}))} />
                     </div>

                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        <div>
                           <label className={labelClass}>Free Waiting Time In Minutes After Start A Ride <span className="text-rose-500">*</span></label>
                           <input type="number" required className={inputClass} placeholder="Free Waiting Time In Minutes After Start A Ride" value={formData.free_waiting_after} onChange={e => setFormData(p=>({...p, free_waiting_after: e.target.value}))} />
                        </div>
                     </div>

                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 pt-4">
                        <div className="flex items-center gap-2 pt-2 ml-1">
                           <input type="checkbox" className="w-4 h-4 rounded border-gray-300 pointer-events-auto" checked={formData.enable_airport_ride} onChange={e => setFormData(p=>({...p, enable_airport_ride: e.target.checked}))} />
                           <span className="text-[13px] font-semibold text-gray-700">Enable Airport Ride</span>
                        </div>
                     </div>

                     {formData.enable_airport_ride && (
                        <div className="md:col-span-2 space-y-6 pt-6 border-t border-gray-100 mt-4">
                           <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Airport Ride</h2>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                              <div>
                                 <label className={labelClass}>Airport Surge Fee <span className="text-rose-500">*</span></label>
                                 <input type="number" required={formData.enable_airport_ride} className={inputClass} placeholder="Enter Airport Surge Fee" value={formData.airport_surge} onChange={e => setFormData(p=>({...p, airport_surge: e.target.value}))} />
                              </div>
                              <div>
                                 <label className={labelClass}>Support Airport Fee <span className="text-rose-500">*</span></label>
                                 <input type="number" required={formData.enable_airport_ride} className={inputClass} placeholder="Enter Support Airport Fee" value={formData.support_airport_fee} onChange={e => setFormData(p=>({...p, support_airport_fee: e.target.value}))} />
                              </div>
                           </div>
                        </div>
                     )}

                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        <div className="flex items-center gap-2 pt-2 ml-1">
                           <input type="checkbox" className="w-4 h-4 rounded border-gray-300 pointer-events-auto" checked={formData.enable_outstation_ride} onChange={e => setFormData(p=>({...p, enable_outstation_ride: e.target.checked}))} />
                           <span className="text-[13px] font-semibold text-gray-700">Enable Outstation Ride</span>
                        </div>
                     </div>

                     {formData.enable_outstation_ride && (
                        <div className="md:col-span-2 space-y-6 pt-6 border-t border-gray-100 mt-4">
                           <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Outstation</h2>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                              <div>
                                 <label className={labelClass}>Base Price <span className="text-rose-500">*</span></label>
                                 <input type="number" required={formData.enable_outstation_ride} className={inputClass} placeholder="Enter Base Price" value={formData.outstation_base_price} onChange={e => setFormData(p=>({...p, outstation_base_price: e.target.value}))} />
                              </div>
                              <div>
                                 <label className={labelClass}>Base Distance <span className="text-rose-500">*(Kilometers)</span></label>
                                 <input type="number" required={formData.enable_outstation_ride} className={inputClass} placeholder="Enter Base Distance" value={formData.outstation_base_distance} onChange={e => setFormData(p=>({...p, outstation_base_distance: e.target.value}))} />
                              </div>
                              <div>
                                 <label className={labelClass}>Price Per Distance <span className="text-rose-500">*(Kilometers)</span></label>
                                 <input type="number" required={formData.enable_outstation_ride} className={inputClass} placeholder="Enter Price Per Distance" value={formData.outstation_price_per_distance} onChange={e => setFormData(p=>({...p, outstation_price_per_distance: e.target.value}))} />
                              </div>
                              <div>
                                 <label className={labelClass}>Time Price in Mintue <span className="text-rose-500">*</span></label>
                                 <input type="number" required={formData.enable_outstation_ride} className={inputClass} placeholder="Enter Time Price" value={formData.outstation_time_price} onChange={e => setFormData(p=>({...p, outstation_time_price: e.target.value}))} />
                              </div>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Section: Parcel Weight Pricing (Only for Delivery) */}
                  {['delivery', 'both', 'all'].includes(String(formData.transport_type).toLowerCase()) && (
                     <div className="space-y-6 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                           <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Parcel Weight Pricing Brackets</h2>
                           <button
                              type="button"
                              onClick={() => {
                                 const ranges = [...(formData.parcel_weight_ranges || [])];
                                 ranges.push({
                                    weight_range: '',
                                    base_price: '',
                                    base_distance: '',
                                    price_per_distance: '',
                                    admin_commission_type: 1,
                                    admin_commission: ''
                                 });
                                 setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                              }}
                              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors"
                           >
                              <Plus size={14} /> Add Bracket
                           </button>
                        </div>

                        {(!formData.parcel_weight_ranges || formData.parcel_weight_ranges.length === 0) ? (
                           <div className="bg-slate-50 border border-gray-100 rounded-lg p-6 text-center text-slate-400 text-sm font-medium">
                              No weight brackets configured yet. Click "Add Bracket" to configure weight-specific rates.
                           </div>
                        ) : (
                           <div className="space-y-6">
                              {formData.parcel_weight_ranges.map((bracket, index) => (
                                 <div key={index} className="bg-slate-50/50 rounded-lg border border-gray-100 p-6 relative">
                                    <button
                                       type="button"
                                       onClick={() => {
                                          const ranges = (formData.parcel_weight_ranges || []).filter((_, i) => i !== index);
                                          setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                       }}
                                       className="absolute top-4 right-4 text-gray-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded transition-colors"
                                    >
                                       <Trash2 size={16} />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pr-8">
                                       <div>
                                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Weight Range (e.g. Under 5kg)</label>
                                          <input
                                             type="text"
                                             required
                                             className="w-full border border-gray-200 rounded px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                             value={bracket.weight_range}
                                             onChange={e => {
                                                const ranges = [...formData.parcel_weight_ranges];
                                                ranges[index].weight_range = e.target.value;
                                                setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                             }}
                                             placeholder="Under 5kg"
                                          />
                                       </div>
                                       <div>
                                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Base Price (₹)</label>
                                          <input
                                             type="number"
                                             required
                                             className="w-full border border-gray-200 rounded px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                             value={bracket.base_price}
                                             onChange={e => {
                                                const ranges = [...formData.parcel_weight_ranges];
                                                ranges[index].base_price = e.target.value;
                                                setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                             }}
                                             placeholder="45"
                                          />
                                       </div>
                                       <div>
                                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Base Distance (Km)</label>
                                          <input
                                             type="number"
                                             required
                                             className="w-full border border-gray-200 rounded px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                             value={bracket.base_distance}
                                             onChange={e => {
                                                const ranges = [...formData.parcel_weight_ranges];
                                                ranges[index].base_distance = e.target.value;
                                                setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                             }}
                                             placeholder="2"
                                          />
                                       </div>
                                       <div>
                                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Price Per Km (₹)</label>
                                          <input
                                             type="number"
                                             required
                                             className="w-full border border-gray-200 rounded px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                             value={bracket.price_per_distance}
                                             onChange={e => {
                                                const ranges = [...formData.parcel_weight_ranges];
                                                ranges[index].price_per_distance = e.target.value;
                                                setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                             }}
                                             placeholder="10"
                                          />
                                       </div>
                                       <div>
                                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Commission Type</label>
                                          <select
                                             className="w-full border border-gray-200 rounded px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                             value={bracket.admin_commission_type}
                                             onChange={e => {
                                                const ranges = [...formData.parcel_weight_ranges];
                                                ranges[index].admin_commission_type = Number(e.target.value);
                                                setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                             }}
                                          >
                                             <option value="1">Percentage (%)</option>
                                             <option value="2">Fixed Amount</option>
                                          </select>
                                       </div>
                                       <div>
                                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Admin Commission</label>
                                          <input
                                             type="number"
                                             required
                                             className="w-full border border-gray-200 rounded px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                             value={bracket.admin_commission}
                                             onChange={e => {
                                                const ranges = [...formData.parcel_weight_ranges];
                                                ranges[index].admin_commission = e.target.value;
                                                setFormData(p => ({ ...p, parcel_weight_ranges: ranges }));
                                             }}
                                             placeholder="10"
                                          />
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  )}

                  {/* Section: Cancellation Fee */}
                  <div className="space-y-6 pt-6 border-t border-gray-100">
                     <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Cancellation Fee</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div>
                           <label className={labelClass}>Cancellation Fee for User <span className="text-rose-500">*</span></label>
                           <div className="flex border border-gray-200 rounded-md overflow-hidden focus-within:border-indigo-500">
                              <select className="bg-gray-50 px-3 text-[11px] font-black border-r outline-none cursor-pointer" value={formData.user_cancellation_fee_type} onChange={e => setFormData(p=>({...p, user_cancellation_fee_type: e.target.value}))}>
                                 <option value="percentage">%</option>
                                 <option value="fixed">FIXED</option>
                              </select>
                              <input type="number" className="flex-1 px-4 py-3 text-sm outline-none" placeholder="Enter Cancellation Fee for User" value={formData.user_cancellation_fee} onChange={e => setFormData(p=>({...p, user_cancellation_fee: e.target.value}))} />
                           </div>
                        </div>
                        <div>
                           <label className={labelClass}>Cancellation Fee for Driver <span className="text-rose-500">*</span></label>
                           <div className="flex border border-gray-200 rounded-md overflow-hidden focus-within:border-indigo-500">
                              <select className="bg-gray-50 px-3 text-[11px] font-black border-r outline-none cursor-pointer" value={formData.driver_cancellation_fee_type} onChange={e => setFormData(p=>({...p, driver_cancellation_fee_type: e.target.value}))}>
                                 <option value="percentage">%</option>
                                 <option value="fixed">FIXED</option>
                              </select>
                              <input type="number" className="flex-1 px-4 py-3 text-sm outline-none" placeholder="Enter Cancellation Fee for Driver" value={formData.driver_cancellation_fee} onChange={e => setFormData(p=>({...p, driver_cancellation_fee: e.target.value}))} />
                           </div>
                        </div>
                        <div>
                           <label className={labelClass}>Fee Goes to <span className="text-rose-500">*</span></label>
                           <div className="relative">
                              <select required className={inputClass + " appearance-none cursor-pointer"} value={formData.cancellation_fee_goes_to} onChange={e => setFormData(p=>({...p, cancellation_fee_goes_to: e.target.value}))}>
                                 <option value="">Select who get cancellation fee</option>
                                 <option value="admin">Admin</option>
                                 <option value="driver">Driver</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Section: Shared Ride */}
                  <div className="space-y-6 pt-6 border-t border-gray-100">
                     <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-wider">Shared Ride</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="flex items-center gap-2 pt-2 ml-1">
                           <input type="checkbox" className="w-4 h-4 rounded border-gray-300 pointer-events-auto" checked={formData.enable_ride_sharing} onChange={e => setFormData(p=>({...p, enable_ride_sharing: e.target.checked, enable_shared_ride: e.target.checked ? 1 : 0}))} />
                           <span className="text-[13px] font-semibold text-gray-700">Enable Ride Sharing</span>
                        </div>
                        {formData.enable_ride_sharing && (
                           <div>
                              <label className={labelClass}>Base Price per Seat <span className="text-rose-500">*</span></label>
                              <input type="number" required={formData.enable_ride_sharing} className={inputClass} placeholder="Enter Base Price per Seat" value={formData.price_per_seat} onChange={e => setFormData(p=>({...p, price_per_seat: e.target.value}))} />
                           </div>
                        )}
                        {formData.enable_ride_sharing && (
                           <div>
                              <label className={labelClass}>Price per Distance Per Shared Seat <span className="text-rose-500">*</span></label>
                              <input type="number" required={formData.enable_ride_sharing} className={inputClass} placeholder="0" value={formData.shared_price_per_distance} onChange={e => setFormData(p=>({...p, shared_price_per_distance: e.target.value}))} />
                           </div>
                        )}
                        {formData.enable_ride_sharing && (
                           <div>
                              <label className={labelClass}>Cancellation Fee per shared seat <span className="text-rose-500">*</span></label>
                              <input type="number" required={formData.enable_ride_sharing} className={inputClass} placeholder="0" value={formData.shared_cancel_fee} onChange={e => setFormData(p=>({...p, shared_cancel_fee: e.target.value}))} />
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-8 flex justify-end">
                     <button type="submit" disabled={saving} className="px-12 py-3.5 bg-[#00BFA5] text-white rounded text-[13px] font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center gap-2">
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? 'Saving Changes...' : 'Save'}
                     </button>
                  </div>
               </form>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SetPrices;
