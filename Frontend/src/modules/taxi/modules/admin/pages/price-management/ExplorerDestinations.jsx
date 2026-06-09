import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Autocomplete, GoogleMap, MarkerF } from '@react-google-maps/api';
import { 
  ArrowLeft, 
  Edit2, 
  Loader2, 
  MapPin, 
  Plus, 
  Save, 
  Search, 
  Trash2,
  ChevronRight,
  Compass,
  FileSearch,
  Filter,
  Tag,
  Info,
  Upload
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAppGoogleMapsLoader } from '../../utils/googleMaps';

const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5";

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const VARANASI_CENTER = { lat: 25.3176, lng: 82.9739 };

const defaultFormData = {
  title: '',
  code: '',
  label: '',
  image: '',
  address: '',
  latitude: '',
  longitude: '',
  status: 'active',
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ExplorerDestinations = ({ mode: initialMode = "list" }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [view, setView] = useState(initialMode);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDestId, setSelectedDestId] = useState(id || null);
  const [formData, setFormData] = useState(defaultFormData);
  const [mapCenter, setMapCenter] = useState(VARANASI_CENTER);
  const [autocomplete, setAutocomplete] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef(null);
  const { isLoaded, loadError } = useAppGoogleMapsLoader();

  useEffect(() => {
    setView(initialMode);
    if (initialMode === 'list') {
      resetFormState();
    }
  }, [initialMode]);

  const resetFormState = () => {
    setSelectedDestId(null);
    setFormData(defaultFormData);
    setMapCenter(VARANASI_CENTER);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await adminService.getExplorerDestinations();
      const list = res?.data || res?.results || (Array.isArray(res) ? res : []);
      setDestinations(Array.isArray(list) ? list : []);

      if (id && initialMode === 'edit') {
        const destToEdit = list.find(d => (d._id || d.id) === id);
        if (destToEdit) handleEdit(destToEdit);
      }
    } catch (error) {
      console.error('Destinations fetch error:', error);
      setErrorMessage(`Failed to connect to backend.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (id && destinations.length > 0 && initialMode === 'edit') {
      const destToEdit = destinations.find(d => (d._id || d.id) === id);
      if (destToEdit) handleEdit(destToEdit);
    }
  }, [id, destinations]);

  const filteredDestinations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return destinations;
    return destinations.filter(d => [
      d.title, d.code, d.label, d.address
    ].filter(Boolean).some(val => String(val).toLowerCase().includes(query)));
  }, [destinations, searchTerm]);

  const updatePinnedLocation = (lat, lng) => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;

    setFormData(prev => ({ 
      ...prev, 
      latitude: nextLat.toFixed(6), 
      longitude: nextLng.toFixed(6) 
    }));
    setMapCenter({ lat: nextLat, lng: nextLng });

    if (window.google?.maps?.Geocoder) {
      setIsGeocoding(true);
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: nextLat, lng: nextLng } }, (results, status) => {
        setIsGeocoding(false);
        if (status === 'OK' && results[0]) {
          setFormData(prev => ({ ...prev, address: results[0].formatted_address }));
        }
      });
    }
  };

  const handleMapClick = (event) => updatePinnedLocation(event.latLng?.lat(), event.latLng?.lng());
  const handleMarkerDragEnd = (event) => updatePinnedLocation(event.latLng?.lat(), event.latLng?.lng());

  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      updatePinnedLocation(lat, lng);
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(15);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setFormData(prev => ({ ...prev, image: dataUrl }));
    } catch (err) {
      alert('Failed to read image file');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.latitude || !formData.longitude) {
      alert('Title and pinned map coordinates are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
      };
      const res = selectedDestId 
        ? await adminService.updateExplorerDestination(selectedDestId, payload) 
        : await adminService.createExplorerDestination(payload);
      
      if (res?.success || res?.status === 200 || res?.status === 201 || res?.id || res?._id) {
        navigate("/admin/pricing/explorer-destinations");
        fetchData();
        resetFormState();
      } else {
        alert(res?.message || 'Failed to save explorer destination');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Server error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dest) => {
    setSelectedDestId(dest._id || dest.id);
    setFormData({
      title: dest.title || '',
      code: dest.code || '',
      label: dest.label || '',
      image: dest.image || '',
      address: dest.address || '',
      latitude: dest.latitude ?? '',
      longitude: dest.longitude ?? '',
      status: dest.status || 'active',
    });
    if (dest.latitude && dest.longitude) {
      setMapCenter({ lat: Number(dest.latitude), lng: Number(dest.longitude) });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this explorer destination permanently?')) {
      try {
        const res = await adminService.deleteExplorerDestination(id);
        if (res?.success || res === true) {
          setDestinations(prev => prev.filter(d => d._id !== id && d.id !== id));
        }
      } catch (err) { 
        alert('Delete failed'); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 animate-in fade-in duration-500 font-sans">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Pricing</span>
                <ChevronRight size={12} />
                <span className="text-gray-700">Explorer Destinations</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Explorer Destinations</h1>
                  <p className="text-xs text-gray-500 mt-1">Manage popular destinations pinned on the client app's Explorer section.</p>
                </div>
                <button 
                  onClick={() => navigate("create")}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Add Destination
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>Show</span>
                  <select 
                    value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="border border-gray-200 rounded px-2 py-1 bg-white outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search destinations..." 
                      className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all w-64"
                    />
                  </div>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Image</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Title / Code</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Address</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Travel Label</th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-right font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-20 text-center text-gray-400">
                          <Loader2 className="animate-spin mx-auto mb-2" />
                          <span>Loading data...</span>
                        </td>
                      </tr>
                    ) : filteredDestinations.length > 0 ? (
                      filteredDestinations.slice(0, entriesPerPage).map(dest => (
                        <tr key={dest._id || dest.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="w-12 h-8 rounded bg-gray-100 overflow-hidden border border-gray-200">
                              {dest.image ? (
                                <img src={dest.image} alt={dest.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Compass size={14} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{dest.title}</div>
                            <div className="text-xs font-bold text-indigo-600 mt-0.5">{dest.code || 'NO CODE'}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                            {dest.address || 'No address configured'}
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-medium">
                            {dest.label || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${dest.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                              {dest.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 text-gray-400">
                              <button onClick={() => navigate(`edit/${dest._id || dest.id}`)} className="p-1.5 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete(dest._id || dest.id)} className="p-1.5 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-32 text-center text-gray-400">
                          <FileSearch size={48} className="mx-auto mb-4 opacity-20" />
                          <h3 className="text-gray-900 font-semibold">No Destinations Found</h3>
                          <p className="text-xs">Try adjusting your search or add a new custom explorer destination.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Pricing</span>
                <ChevronRight size={12} />
                <span>Explorer Destinations</span>
                <ChevronRight size={12} />
                <span className="text-gray-700">{id ? 'Edit' : 'Create'}</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">{id ? 'Edit Destination' : 'Add Destination'}</h1>
                <button 
                  onClick={() => navigate("/admin/pricing/explorer-destinations")}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-5 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
                   <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Compass size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Destination Details</h3>
                        <p className="text-xs text-gray-400">Add info and choose geographic details</p>
                      </div>
                   </div>

                   <div>
                     <label className={labelClass}>Title / Name *</label>
                     <input 
                       type="text" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                       placeholder="e.g. Dashashwamedh Ghat"
                       className={inputClass}
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className={labelClass}>Transit Code (e.g. VNS, GHT)</label>
                       <input 
                         type="text" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                         placeholder="e.g. BSB"
                         className={inputClass}
                       />
                     </div>
                     <div>
                       <label className={labelClass}>Travel Label (e.g. 10 min)</label>
                       <input 
                         type="text" value={formData.label} onChange={(e) => setFormData(p => ({ ...p, label: e.target.value }))}
                         placeholder="e.g. 15 min"
                         className={inputClass}
                       />
                     </div>
                   </div>

                   <div>
                     <label className={labelClass}>Full Address</label>
                     <textarea 
                       value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                       placeholder="Exact pinned address"
                       className={inputClass}
                       rows={2}
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className={labelClass}>Latitude</label>
                       <input 
                         type="text" readOnly value={formData.latitude}
                         className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-400 bg-gray-50 outline-none"
                       />
                     </div>
                     <div>
                       <label className={labelClass}>Longitude</label>
                       <input 
                         type="text" readOnly value={formData.longitude}
                         className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-400 bg-gray-50 outline-none"
                       />
                     </div>
                   </div>

                   <div>
                     <label className={labelClass}>Card Image</label>
                     <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                       <div className="group relative flex min-h-[160px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                         {formData.image ? (
                           <>
                             <img src={formData.image} alt="Destination preview" className="max-h-[140px] w-full object-contain p-2" />
                             <button
                               type="button"
                               onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                               className="absolute right-3 top-3 rounded-xl bg-white p-2 text-red-500 shadow-sm border border-red-100 transition hover:bg-red-500 hover:text-white"
                             >
                               <Trash2 size={14} />
                             </button>
                           </>
                         ) : (
                           <label className="flex cursor-pointer flex-col items-center gap-2">
                             <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                             <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm border border-gray-100">
                               <Upload size={16} />
                             </span>
                             <span className="text-xs font-semibold text-slate-700">Upload Image Card</span>
                           </label>
                         )}
                       </div>
                     </div>
                   </div>

                   <div className="flex items-center gap-3">
                     <input 
                       type="checkbox" id="active_dest"
                       checked={formData.status === 'active'}
                       onChange={(e) => setFormData(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))}
                       className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                     />
                     <label htmlFor="active_dest" className="text-xs font-bold text-gray-700">Active Destination</label>
                   </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
                   <button 
                     onClick={handleSave} disabled={saving}
                     className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     {id ? 'Update Destination' : 'Save Destination'}
                   </button>
                   <button 
                     onClick={() => navigate("/admin/pricing/explorer-destinations")}
                     className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                   >
                     Cancel
                   </button>
                </div>
              </div>

              <div className="xl:col-span-7">
                <div className="bg-white rounded-xl border border-gray-200 p-2 h-[660px] shadow-sm relative overflow-hidden">
                  {isLoaded ? (
                    <div className="w-full h-full rounded-lg overflow-hidden relative">
                       <div className="absolute left-6 top-6 z-10 w-full max-w-md pr-12">
                         <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white/95 px-4 shadow-2xl backdrop-blur-sm">
                           <Search className="text-gray-400" size={18} />
                           {window.google?.maps?.places ? (
                              <Autocomplete
                                onLoad={(a) => setAutocomplete(a)}
                                onPlaceChanged={handlePlaceChanged}
                                className="flex-1"
                              >
                                <input
                                  type="text"
                                  placeholder="Search location to pin"
                                  className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                                />
                              </Autocomplete>
                            ) : (
                              <input
                                type="text"
                                placeholder="Search location (Places API disabled)"
                                className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                              />
                            )}
                         </div>
                       </div>
                       
                       <GoogleMap
                         mapContainerStyle={MAP_CONTAINER_STYLE}
                         center={mapCenter} zoom={13}
                         onLoad={m => { mapRef.current = m; }}
                         onClick={handleMapClick}
                         options={{
                            styles: [
                                { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
                                { elementType: "labels.icon", stylers: [{ visibility: "off" }] }
                            ],
                            disableDefaultUI: false,
                            zoomControl: true,
                            mapTypeControl: true,
                            streetViewControl: false,
                            fullscreenControl: true
                         }}
                       >
                         {formData.latitude && formData.longitude && (
                           <MarkerF 
                              position={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} 
                              draggable onDragEnd={handleMarkerDragEnd}
                              icon={window.google ? {
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: "#4f46e5",
                                fillOpacity: 1,
                                strokeColor: "white",
                                strokeWeight: 3
                              } : undefined}
                           />
                         )}
                       </GoogleMap>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                       <Loader2 className="animate-spin text-gray-300" size={32} />
                    </div>
                  )}
                </div>

                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                   <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                   <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                     Click anywhere on the map or drag the pin marker to specify the exact coordinates for the client's destination ride. You can also search the location using the search box above.
                   </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExplorerDestinations;
