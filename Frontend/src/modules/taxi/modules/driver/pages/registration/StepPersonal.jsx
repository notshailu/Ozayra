import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, User, Mail, Phone, Lock, ChevronRight,
    Car, MapPin, Zap, Package, Tag, Gift, ArrowRight,
    Camera, CheckCircle2, FileText, ShieldCheck, AlertCircle, LoaderCircle,
    Eye, EyeOff, Check, X, Smartphone, Sparkles
} from 'lucide-react';
import {
    getStoredDriverRegistrationSession,
    saveDriverPersonalDetails,
    saveDriverRegistrationSession,
    getDriverServiceLocations,
    saveDriverVehicle,
    saveDriverReferral,
    getDriverDocumentTemplates,
    saveDriverDocuments,
    completeDriverOnboarding,
    clearDriverRegistrationSession,
    getDriverVehicleTypes
} from '../../services/registrationService';
import { getLucideIcon } from '../../utils/iconMapping';
import {
  flattenDriverDocumentFields,
  getDocumentPreviewUrl,
  normalizeDriverDocumentTemplates,
} from '../../utils/documentTemplates';

const unwrap = (response) => response?.data?.data || response?.data || response;

const normalizeDocument = (doc) => {
  if (!doc) return null;
  if (typeof doc === 'string') {
    return { previewUrl: doc, secureUrl: doc, uploaded: true };
  }
  return {
    ...doc,
    previewUrl: getDocumentPreviewUrl(doc),
    uploaded: doc.uploaded ?? Boolean(getDocumentPreviewUrl(doc)),
  };
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const StepPersonal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Core session loading
    const session = {
        ...getStoredDriverRegistrationSession(),
        ...(location.state || {}),
    };
    const phone = session.phone || '95898 14119';
    const registrationId = session.registrationId || '';
    const role = session.role || 'driver';
    const isOwner = role === 'owner';

    // Steps definition derived from URL path
    const step = useMemo(() => {
        if (location.pathname.endsWith('/step-referral')) return 2;
        if (location.pathname.endsWith('/step-vehicle')) return 3;
        if (location.pathname.endsWith('/step-documents')) return 4;
        return 1;
    }, [location.pathname]);

    const goToStep = (nextStep) => {
        const paths = {
            1: '/taxi/driver/step-personal',
            2: '/taxi/driver/step-referral',
            3: '/taxi/driver/step-vehicle',
            4: '/taxi/driver/step-documents',
        };
        navigate(paths[nextStep], { state: session });
    };

    // Step 1: Personal State
    const [personalForm, setPersonalForm] = useState({
        fullName: session.fullName || '',
        email: session.email || '',
        gender: session.gender || '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    // Step 2: Referral State
    const [referralCode, setReferralCode] = useState(session.referralCode || '');

    // Step 3: Vehicle/Company State
    const [locations, setLocations] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(true);
    const vehicleImageRef = useRef(null);
    const [vehicleForm, setVehicleForm] = useState({
        registerFor: session.registerFor || 'taxi',
        locationId: session.locationId || '',
        vehicleTypeId: session.vehicleTypeId || '',
        make: session.make || '',
        model: session.model || '',
        year: session.year || '',
        number: session.number || '',
        color: session.color || '',
        companyName: session.companyName || '',
        companyAddress: session.companyAddress || '',
        city: session.city || '',
        postalCode: session.postalCode || '',
        taxNumber: session.taxNumber || ''
    });

    // Step 4: Documents State
    const inputRefs = useRef({});
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [docs, setDocs] = useState(() =>
      Object.fromEntries(
        Object.entries(session.documents || {}).map(([key, value]) => [key, normalizeDocument(value)]),
      ),
    );
    const [uploading, setUploading] = useState(null);

    // Global loading and error message states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [dbVehicleTypes, setDbVehicleTypes] = useState([]);
    const [dbVehicleTypesLoading, setDbVehicleTypesLoading] = useState(true);

    const genderOptions = [
        { value: 'Male', label: 'Male', icon: (active) => (
            <svg className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="14" r="5" />
                <path d="M19 5L13.5 10.5" />
                <path d="M14 5h5v5" />
            </svg>
        )},
        { value: 'Female', label: 'Female', icon: (active) => (
            <svg className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="9" r="5" />
                <path d="M12 14v7" />
                <path d="M9 18h6" />
            </svg>
        )},
        { value: 'Other', label: 'Other', icon: (active) => (
            <svg className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M12 12h.01" />
            </svg>
        )}
    ];

    const getVehicleIconComponent = (iconName, active) => {
        const className = active ? 'text-white' : 'text-slate-500';
        const name = String(iconName || '').toLowerCase().trim();
        if (name === 'bike_icon' || name === 'bike') return <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M15 6h5v3"/><path d="M12 12h3.5l2.5 5.5"/><path d="M12 12L9 6H5.5"/><path d="M12 12l-2.5 5.5"/><path d="M12 6h-3.5L6 11.5"/></svg>;
        if (name === 'auto_icon' || name === 'auto') return <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.3.9L1 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M9 17h5"/></svg>;
        return <Car size={18} className={className} />;
    };

    // Load Locations for Step 3
    useEffect(() => {
        let active = true;
        const loadLocations = async () => {
            try {
                setLocationsLoading(true);
                const response = await getDriverServiceLocations();
                const results = response?.data?.results || response?.data || [];
                if (active) setLocations(Array.isArray(results) ? results : []);
            } catch (err) {
                console.warn('Locations Load Error:', err);
            } finally {
                if (active) setLocationsLoading(false);
            }
        };
        loadLocations();
        return () => { active = false; };
    }, []);

    // Load Vehicle Types from API
    useEffect(() => {
        let active = true;
        const loadVehicleTypes = async () => {
            try {
                setDbVehicleTypesLoading(true);
                const response = await getDriverVehicleTypes();
                const data = unwrap(response);
                const results = data?.results || data || [];
                if (active) setDbVehicleTypes(Array.isArray(results) ? results : []);
            } catch (err) {
                console.warn('Vehicle Types Load Error:', err);
            } finally {
                if (active) setDbVehicleTypesLoading(false);
            }
        };
        loadVehicleTypes();
        return () => { active = false; };
    }, []);

    // Load KYC Templates for Step 4
    useEffect(() => {
        const loadTemplates = async () => {
            setTemplatesLoading(true);
            try {
                const response = await getDriverDocumentTemplates();
                const results = response?.data?.data?.results || response?.data?.results || [];
                setTemplates(normalizeDriverDocumentTemplates(results));
            } catch (err) {
                console.warn('Templates Load Error:', err);
                setTemplates(normalizeDriverDocumentTemplates([]));
            } finally {
                setTemplatesLoading(false);
            }
        };
        loadTemplates();
    }, []);

    // Filter vehicle types based on selected registerFor service
    const filteredVehicleTypes = useMemo(() => {
        const selectedService = vehicleForm.registerFor; // 'taxi', 'delivery', 'both'
        
        let list = dbVehicleTypes;
        if (list.length === 0) {
            // Fallback list to ensure user always sees defaults if DB is empty or loading
            list = [
                { _id: 'v1', name: 'Bike', icon_types: 'bike', transport_type: 'both' },
                { _id: 'v2', name: 'Cab', icon_types: 'car', transport_type: 'taxi' },
                { _id: 'v3', name: 'Auto', icon_types: 'auto', transport_type: 'taxi' }
            ];
        }
        
        return list.filter(item => {
            if (selectedService === 'both') return true;
            if (selectedService === 'taxi') {
                return item.transport_type === 'taxi' || item.transport_type === 'both';
            }
            if (selectedService === 'delivery') {
                return item.transport_type === 'delivery' || item.transport_type === 'both';
            }
            return true;
        }).map(item => {
            // Determine icon by parsing name & icon_types
            const iconName = String(item.icon_types || item.icon_types_for || '').toLowerCase().trim();
            const name = String(item.name || '').toLowerCase().trim();
            let iconType = 'car';
            if (iconName === 'bike' || name.includes('bike') || name.includes('scooter') || name.includes('cycle') || name.includes('motorcycle')) {
                iconType = 'bike';
            } else if (iconName === 'auto' || name.includes('auto') || name.includes('rickshaw') || name.includes('tuk') || name.includes('three')) {
                iconType = 'auto';
            }
            
            // Determine map image
            const val = (iconName || name).toLowerCase();
            let mapImage = '/4_Taxi.png';
            if (val.includes('bike')) mapImage = '/1_Bike.png';
            else if (val.includes('auto')) mapImage = '/2_AutoRickshaw.png';
            else if (val.includes('ehc')) mapImage = '/ehcv.png';
            else if (val.includes('hcv')) mapImage = '/hcv.png';
            else if (val.includes('lcv')) mapImage = '/LCV.png';
            else if (val.includes('mcv')) mapImage = '/mcv.png';
            else if (val.includes('truck')) mapImage = '/truck.png';
            else if (val.includes('lux')) mapImage = '/Luxury.png';
            else if (val.includes('premium')) mapImage = '/Premium.png';
            else if (val.includes('suv')) mapImage = '/SUV.png';

            return {
                id: item._id || item.id,
                label: item.name,
                icon: iconType,
                image: mapImage
            };
        });
    }, [dbVehicleTypes, vehicleForm.registerFor]);

    // Validation hook to clear invalid vehicleTypeId if the service selected changes
    useEffect(() => {
        if (vehicleForm.vehicleTypeId && filteredVehicleTypes.length > 0) {
            const isValid = filteredVehicleTypes.some(t => String(t.id) === String(vehicleForm.vehicleTypeId));
            if (!isValid) {
                setVehicleForm(p => ({ ...p, vehicleTypeId: '' }));
            }
        }
    }, [filteredVehicleTypes, vehicleForm.vehicleTypeId]);

    const documentTemplates = useMemo(() => {
        const list = normalizeDriverDocumentTemplates(templates);
        const expectedType = isOwner ? 'fleet_drivers' : 'individual';
        return list.filter(t => t.account_type === 'both' || t.account_type === expectedType);
    }, [templates, isOwner]);
    const uploadFields = useMemo(() => flattenDriverDocumentFields(documentTemplates), [documentTemplates]);

    // Back navigation handler
    const handleBack = () => {
        if (step > 1) {
            goToStep(step - 1);
            setError('');
        } else {
            navigate(-1);
        }
    };

    // Save Step 1: Personal Information
    const handleSavePersonal = async () => {
        if (!personalForm.fullName || !personalForm.email || !personalForm.gender || !personalForm.password) {
            setError('Please fill all required details');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { password: _password, ...safePersonalForm } = personalForm;
            const response = await saveDriverPersonalDetails({
                registrationId,
                phone,
                ...personalForm,
            });
            saveDriverRegistrationSession({
                ...session,
                registrationId,
                phone,
                role,
                ...safePersonalForm,
                personalSession: response?.data?.session || null,
            });
            goToStep(2);
        } catch (err) {
            setError(err?.message || 'Unable to save personal details');
        } finally {
            setLoading(false);
        }
    };

    // Save Step 2: Referral Details
    const handleSaveReferral = async (skip = false) => {
        setLoading(true);
        setError('');
        try {
            const codeToSave = skip ? '' : referralCode;
            const response = await saveDriverReferral({
                registrationId,
                phone,
                referralCode: codeToSave,
            });
            saveDriverRegistrationSession({
                ...session,
                referralCode: codeToSave,
                referralSession: response?.data?.session || null,
            });
            goToStep(3);
        } catch (err) {
            setError(err?.message || 'Unable to save referral code');
        } finally {
            setLoading(false);
        }
    };

    // Save Step 3: Vehicle Details
    const handleSaveVehicle = async () => {
        let required = [];
        if (isOwner) {
            required = ['locationId', 'companyName', 'companyAddress', 'city', 'postalCode', 'taxNumber'];
        } else {
            required = ['locationId', 'vehicleTypeId', 'make', 'model', 'year', 'number', 'color'];
        }

        const isFormValid = required.every(key => vehicleForm[key]);
        if (!isFormValid) {
            setError(isOwner ? 'Please fill all company fields' : 'Please fill all vehicle fields');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const selectedServiceLocation = locations.find(
                (item) => String(item._id || item.id) === String(vehicleForm.locationId)
            );

            const response = await saveDriverVehicle({
                registrationId,
                phone,
                registerFor: vehicleForm.registerFor,
                locationId: vehicleForm.locationId,
                locationName: selectedServiceLocation?.name || selectedServiceLocation?.service_location_name || '',
                serviceLocation: selectedServiceLocation || null,
                vehicleTypeId: vehicleForm.vehicleTypeId,
                make: vehicleForm.make,
                model: vehicleForm.model,
                year: vehicleForm.year,
                number: vehicleForm.number,
                color: vehicleForm.color,
                companyName: vehicleForm.companyName,
                companyAddress: vehicleForm.companyAddress,
                city: isOwner ? vehicleForm.city : selectedServiceLocation?.name || selectedServiceLocation?.service_location_name || vehicleForm.city,
                postalCode: vehicleForm.postalCode,
                taxNumber: vehicleForm.taxNumber,
                vehicleImage: vehicleForm.vehicleImage,
            });

            saveDriverRegistrationSession({
                ...session,
                ...vehicleForm,
                vehicleSession: response?.data?.session || null,
            });
            goToStep(4);
        } catch (err) {
            setError(err?.message || 'Unable to save vehicle details');
        } finally {
            setLoading(false);
        }
    };

    // Step 4 Document Upload helper
    const openPicker = (key) => {
        inputRefs.current[key]?.click();
    };

    const handleVehicleImageChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setVehicleForm(p => ({ ...p, vehicleImagePreview: previewUrl }));
        
        try {
            const dataUrl = await fileToDataUrl(file);
            setVehicleForm(p => ({ ...p, vehicleImage: dataUrl }));
        } catch (err) {
            setError('Error reading file');
        }
    };

    const handleFileChange = async (key, event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        const tempPreviewUrl = URL.createObjectURL(file);
        setUploading(key);
        setError('');

        setDocs((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            previewUrl: tempPreviewUrl,
            fileName: file.name,
            mimeType: file.type,
            uploaded: false,
            uploading: true,
          },
        }));

        try {
            const dataUrl = await fileToDataUrl(file);
            const response = await saveDriverDocuments({
                registrationId,
                phone,
                documents: {
                  [key]: {
                    dataUrl,
                    fileName: file.name,
                    mimeType: file.type,
                  },
                },
            });
            const payload = unwrap(response);
            const uploadedDoc = payload?.documents?.[key] || payload?.session?.documents?.[key];
            const nextDoc = normalizeDocument(uploadedDoc) || {
                previewUrl: tempPreviewUrl,
                secureUrl: tempPreviewUrl,
                fileName: file.name,
                mimeType: file.type,
                uploaded: true,
            };

            setDocs((prev) => ({ ...prev, [key]: nextDoc }));

            const storedSession = getStoredDriverRegistrationSession();
            saveDriverRegistrationSession({
                ...storedSession,
                documents: {
                  ...(storedSession.documents || {}),
                  [key]: nextDoc,
                },
            });
        } catch (uploadError) {
            setError(uploadError?.message || 'Unable to upload document');
            setDocs((prev) => ({
                ...prev,
                [key]: normalizeDocument(session.documents?.[key]),
            }));
        } finally {
            setUploading(null);
            URL.revokeObjectURL(tempPreviewUrl);
        }
    };

    const isDocumentsComplete = useMemo(() => {
        return uploadFields.every((item) => !item.isRequired || Boolean(docs[item.key]?.uploaded)) &&
            !uploading &&
            !templatesLoading;
    }, [uploadFields, docs, uploading, templatesLoading]);

    // Step 4: Final Submit Application
    const handleSubmit = async () => {
        if (!isDocumentsComplete) {
            setError(uploading ? 'Please wait for upload to finish' : 'Please upload all required documents');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const submittedDocuments = Object.fromEntries(
                Object.entries(docs).filter(([, value]) => Boolean(value?.uploaded || value?.secureUrl)),
            );

            const completeResponse = await completeDriverOnboarding({
                registrationId,
                phone,
                documents: submittedDocuments,
            });
            const payload = unwrap(completeResponse);

            const token = payload?.token;
            if (token) {
                localStorage.setItem('token', token);
                localStorage.setItem('driverToken', token);
                localStorage.setItem('role', isOwner ? 'owner' : 'driver');
            }

            saveDriverRegistrationSession({
                ...session,
                documents: docs,
                completedRegistration: payload || null,
            });
            clearDriverRegistrationSession();

            navigate('/taxi/driver/registration-status', {
                state: {
                  ...session,
                  documents: docs,
                  completedRegistration: payload || null,
                },
            });
        } catch (submitError) {
            setError(submitError?.message || 'Unable to complete registration');
        } finally {
            setLoading(false);
        }
    };

    // Client-side validations
    const isNameValid = personalForm.fullName.trim().split(/\s+/).filter(Boolean).length >= 1 && personalForm.fullName.trim().length >= 2;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalForm.email);
    const isPasswordValid = personalForm.password.length >= 6;

    return (
        <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-white to-slate-100/40 font-sans p-5 pt-8 select-none overflow-x-hidden pb-32">
            <header className="mb-8 flex items-center justify-between">
                <button 
                    onClick={handleBack} 
                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-900 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
                
                {/* Modern Step Progress Indicator */}
                <div className="flex-1 max-w-[200px] ml-4 mr-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                            Step {step} of 4
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {Math.round((step / 4) * 100)}% Done
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-slate-800 to-slate-950 rounded-full"
                            initial={{ width: `${((step - 1) / 4) * 100}%` }}
                            animate={{ width: `${(step / 4) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-sm mx-auto">
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-rose-50 border border-rose-100/80 p-3 rounded-2xl flex items-start gap-2.5 mb-5 shadow-sm"
                    >
                        <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-rose-600 leading-tight">{error}</p>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-1">
                                <span className="bg-slate-900/5 text-slate-800 text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                                    Registration Details
                                </span>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase leading-none font-display pt-1">Personal Details</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Tell us more about yourself</p>
                            </div>

                            <div className="space-y-4">
                                {/* Full Name Field */}
                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                    <div className="w-10 h-10 bg-slate-50 group-focus-within:bg-slate-950 group-focus-within:text-white rounded-xl flex items-center justify-center text-slate-400 transition-colors duration-300">
                                        <User size={18} />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Full Name</label>
                                        <input 
                                            value={personalForm.fullName}
                                            onChange={(e) => setPersonalForm(p => ({ ...p, fullName: e.target.value }))}
                                            placeholder="John Doe"
                                            autoComplete="name"
                                            className="w-full bg-transparent border-none p-0 text-[14px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                        />
                                    </div>
                                    {personalForm.fullName && (
                                        <button 
                                            type="button" 
                                            onClick={() => setPersonalForm(p => ({ ...p, fullName: '' }))}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {isNameValid && (
                                        <div className="text-emerald-500 pr-1">
                                            <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Number Badge (Security check) */}
                                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-inner">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                            <Smartphone size={18} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Mobile Number</label>
                                            <p className="text-[14px] font-black text-slate-900">+91 {phone}</p>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-100/60 text-emerald-800 text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <Check size={10} strokeWidth={3} /> Verified
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                    <div className="w-10 h-10 bg-slate-50 group-focus-within:bg-slate-950 group-focus-within:text-white rounded-xl flex items-center justify-center text-slate-400 transition-colors duration-300">
                                        <Mail size={18} />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Email Address</label>
                                        <input 
                                            type="email"
                                            value={personalForm.email}
                                            onChange={(e) => setPersonalForm(p => ({ ...p, email: e.target.value }))}
                                            placeholder="john@redigo.in"
                                            autoComplete="email"
                                            className="w-full bg-transparent border-none p-0 text-[14px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                        />
                                    </div>
                                    {personalForm.email && (
                                        <button 
                                            type="button" 
                                            onClick={() => setPersonalForm(p => ({ ...p, email: '' }))}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {isEmailValid && (
                                        <div className="text-emerald-500 pr-1">
                                            <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Gender Card Grid */}
                                <div className="space-y-2.5 pt-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Gender Selection</label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {genderOptions.map((g) => {
                                            const active = personalForm.gender === g.value;
                                            return (
                                                <button
                                                    key={g.value}
                                                    type="button"
                                                    onClick={() => setPersonalForm(p => ({ ...p, gender: g.value }))}
                                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
                                                        active 
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]' 
                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 active:scale-[0.98]'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                                                        active ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'
                                                    }`}>
                                                        {g.icon(active)}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">{g.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                    <div className="w-10 h-10 bg-slate-50 group-focus-within:bg-slate-950 group-focus-within:text-white rounded-xl flex items-center justify-center text-slate-400 transition-colors duration-300">
                                        <Lock size={18} />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Password</label>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={personalForm.password}
                                            onChange={(e) => setPersonalForm(p => ({ ...p, password: e.target.value }))}
                                            placeholder="Min. 6 characters"
                                            autoComplete="new-password"
                                            className="w-full bg-transparent border-none p-0 text-[14px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(p => !p)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    {isPasswordValid && (
                                        <div className="text-emerald-500 pr-1">
                                            <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Floating glassmorphic action bar */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent max-w-sm mx-auto z-45">
                                <button 
                                    onClick={handleSavePersonal}
                                    disabled={loading || !(isNameValid && isEmailValid && personalForm.gender && isPasswordValid)}
                                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] ${
                                        isNameValid && isEmailValid && personalForm.gender && isPasswordValid
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 shadow-md' 
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
                                    }`}
                                >
                                    {loading ? (
                                        <LoaderCircle size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            Continue
                                            <ChevronRight size={16} strokeWidth={3} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-1">
                                <span className="bg-slate-900/5 text-slate-800 text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                                    Joining Incentives
                                </span>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase leading-none font-display pt-1">Got a Code?</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Enter referral for joining bonus</p>
                            </div>

                            <div className="space-y-5">
                                {/* Referral code input */}
                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                    <div className="w-10 h-10 bg-slate-50 group-focus-within:bg-slate-950 group-focus-within:text-white rounded-xl flex items-center justify-center text-slate-400 transition-colors duration-300">
                                        <Tag size={18} />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Referral Code</label>
                                        <input 
                                            value={referralCode}
                                            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                            placeholder="ZETO-BONUS-9080"
                                            autoComplete="off"
                                            className="w-full bg-transparent border-none p-0 text-[14px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300 uppercase tracking-wider"
                                        />
                                    </div>
                                    {referralCode && (
                                        <button 
                                            type="button" 
                                            onClick={() => setReferralCode('')}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Premium Rewards Coupon Card */}
                                <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-200/40 p-4.5 rounded-2xl flex items-start gap-3.5 shadow-sm">
                                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                        <Sparkles size={20} className="animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                                            Exclusive Driver Bonus
                                        </span>
                                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight mt-1">₹500 JOINING REWARD</h4>
                                        <p className="text-[10px] font-medium text-slate-500 leading-normal">
                                            Apply a valid referral code to unlock <span className="text-amber-600 font-extrabold">₹500 cash bonus</span> directly in your wallet after you complete your first 10 rides.
                                        </p>
                                    </div>
                                </div>

                                {/* Actions in glassmorphic footer */}
                                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent max-w-sm mx-auto z-45 space-y-2.5">
                                    <button 
                                        onClick={() => handleSaveReferral(false)}
                                        disabled={loading || !referralCode}
                                        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all ${
                                            referralCode 
                                            ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 shadow-md' 
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
                                        }`}
                                    >
                                        {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Apply Code'} <ArrowRight size={16} strokeWidth={3} />
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleSaveReferral(true)}
                                        disabled={loading}
                                        className="w-full h-11 rounded-2xl bg-white border border-slate-100 text-[11px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-all hover:bg-slate-50 block text-center"
                                    >
                                        Skip for now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div 
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 animate-fadeIn"
                        >
                            <div className="space-y-1">
                                <span className="bg-slate-900/5 text-slate-800 text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                                    Asset Registration
                                </span>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase leading-none font-display pt-1">
                                    {isOwner ? 'Company Info' : 'Vehicle Info'}
                                </h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                                    {isOwner ? 'Your business details' : 'Complete your vehicle registry'}
                                </p>
                            </div>

                            <div className="space-y-5">
                                {/* Service Location dropdown list */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300 relative">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ml-0.5">
                                       <MapPin size={12} className="text-slate-400" /> Service City
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={vehicleForm.locationId}
                                            onChange={(e) => setVehicleForm(p => ({ ...p, locationId: e.target.value, vehicleTypeId: '' }))}
                                            disabled={locationsLoading || locations.length === 0}
                                            className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 appearance-none cursor-pointer disabled:opacity-50 pr-8"
                                        >
                                            <option value="">{locationsLoading ? 'Loading locations...' : 'Select service city'}</option>
                                            {locations.map(loc => (
                                                <option key={loc._id || loc.id} value={loc._id || loc.id}>
                                                    {loc.service_location_name || loc.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {!vehicleForm.locationId && (
                                    <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl animate-fadeIn">
                                        <MapPin size={24} className="text-slate-400 mx-auto mb-2" />
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Select Service City to Continue
                                        </p>
                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                                            We need to know your operational area first
                                        </p>
                                    </div>
                                )}

                                {vehicleForm.locationId && (
                                    <>
                                        {/* Register For Grid (Non-Owners only) */}
                                        {!isOwner && (
                                            <div className="space-y-2 animate-fadeIn">
                                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Register For Services</label>
                                                 <div className="grid grid-cols-3 gap-2.5">
                                                     {[
                                                         { id: 'taxi', label: 'Taxi', icon: <Car size={16} /> },
                                                         { id: 'delivery', label: 'Delivery', icon: <Package size={16} /> },
                                                         { id: 'both', label: 'Both', icon: <Zap size={16} /> }
                                                     ].map((item) => {
                                                         const active = vehicleForm.registerFor === item.id;
                                                         return (
                                                             <button
                                                                 key={item.id}
                                                                 type="button"
                                                                 onClick={() => setVehicleForm(p => ({ ...p, registerFor: item.id }))}
                                                                 className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                                                     active 
                                                                     ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]' 
                                                                     : 'bg-white border border-slate-100 text-slate-500 hover:border-slate-200 active:scale-[0.98]'
                                                                 }`}
                                                             >
                                                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                                                                     active ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'
                                                                 }`}>
                                                                     {item.icon}
                                                                 </div>
                                                                 <span className="text-[9.5px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                                                                 {active && (
                                                                     <div className="absolute top-1 right-1.5 text-white">
                                                                         <Check size={8} strokeWidth={4} />
                                                                     </div>
                                                                 )}
                                                             </button>
                                                         );
                                                     })}
                                                 </div>
                                            </div>
                                        )}

                                        {isOwner ? (
                                            <div className="space-y-4 pt-1 animate-fadeIn">
                                                {/* Company Name */}
                                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Name</label>
                                                    <input 
                                                        value={vehicleForm.companyName}
                                                        onChange={(e) => setVehicleForm(p => ({ ...p, companyName: e.target.value }))}
                                                        placeholder="Enter registered company name"
                                                        className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                    />
                                                </div>

                                                {/* Company Address */}
                                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Address</label>
                                                    <input 
                                                        value={vehicleForm.companyAddress}
                                                        onChange={(e) => setVehicleForm(p => ({ ...p, companyAddress: e.target.value }))}
                                                        placeholder="Enter full office address"
                                                        className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                    />
                                                </div>

                                                {/* City & Postal Code */}
                                                <div className="grid grid-cols-2 gap-3.5">
                                                    <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">City</label>
                                                        <input 
                                                            value={vehicleForm.city}
                                                            onChange={(e) => setVehicleForm(p => ({ ...p, city: e.target.value }))}
                                                            placeholder="City"
                                                            className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                    <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Postal Code</label>
                                                        <input 
                                                            value={vehicleForm.postalCode}
                                                            onChange={(e) => setVehicleForm(p => ({ ...p, postalCode: e.target.value }))}
                                                            placeholder="Zip Code"
                                                            className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Company Tax ID */}
                                                <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Tax Number</label>
                                                    <input 
                                                        value={vehicleForm.taxNumber}
                                                        onChange={(e) => setVehicleForm(p => ({ ...p, taxNumber: e.target.value.toUpperCase() }))}
                                                        placeholder="GSTIN/VAT/TAX ID"
                                                        className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300 uppercase tracking-wider"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 pt-1">
                                                {/* Vehicle Class Selectors */}
                                                <div className="space-y-2 animate-fadeIn">
                                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Vehicle Class</label>
                                                     {dbVehicleTypesLoading && dbVehicleTypes.length === 0 ? (
                                                         <div className="text-[11px] font-bold text-slate-400 p-3 bg-white border border-slate-100 rounded-2xl text-center">
                                                             Loading vehicle classes...
                                                         </div>
                                                     ) : (
                                                         <div className="grid grid-cols-3 gap-2.5">
                                                             {filteredVehicleTypes.map((type) => {
                                                                 const active = String(vehicleForm.vehicleTypeId) === String(type.id);
                                                                 return (
                                                                     <button
                                                                         key={type.id}
                                                                         type="button"
                                                                         onClick={() => setVehicleForm(p => ({ ...p, vehicleTypeId: type.id }))}
                                                                         className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-1.5 justify-center relative overflow-hidden ${
                                                                             active 
                                                                             ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]' 
                                                                             : 'bg-white border border-slate-100 text-slate-500 hover:border-slate-200 active:scale-[0.98]'
                                                                         }`}
                                                                     >
                                                                         <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                                                                             active ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'
                                                                         }`}>
                                                                            {type.image ? (
                                                                                <img src={type.image} alt={type.label} className="w-full h-full object-contain p-0.5" />
                                                                            ) : (
                                                                                getVehicleIconComponent(type.icon, active)
                                                                            )}
                                                                         </div>
                                                                         <span className="text-[10px] font-black uppercase tracking-wider leading-none text-center">{type.label}</span>
                                                                         {active && (
                                                                             <div className="absolute top-1 right-1.5 text-white">
                                                                                 <Check size={8} strokeWidth={4} />
                                                                             </div>
                                                                         )}
                                                                     </button>
                                                                 );
                                                             })}
                                                         </div>
                                                     )}
                                                </div>

                                                {!vehicleForm.vehicleTypeId && (
                                                    <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl animate-fadeIn">
                                                        <Car size={24} className="text-slate-400 mx-auto mb-2" />
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                            Select Vehicle Class
                                                        </p>
                                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                                                            Choose a class to input vehicle specifications
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Make, Model, Year, Color, Plate Grid */}
                                                {vehicleForm.vehicleTypeId && (
                                                    <div className="grid grid-cols-2 gap-3.5 animate-fadeIn">
                                                        <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Brand</label>
                                                            <input 
                                                                value={vehicleForm.make}
                                                                onChange={(e) => setVehicleForm(p => ({ ...p, make: e.target.value }))}
                                                                placeholder="e.g. Suzuki"
                                                                className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                            />
                                                        </div>

                                                        <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Model</label>
                                                            <input 
                                                                value={vehicleForm.model}
                                                                onChange={(e) => setVehicleForm(p => ({ ...p, model: e.target.value }))}
                                                                placeholder="e.g. WagonR"
                                                                className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                            />
                                                        </div>

                                                        <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Year</label>
                                                            <input 
                                                                type="tel"
                                                                maxLength={4}
                                                                value={vehicleForm.year}
                                                                onChange={(e) => setVehicleForm(p => ({ ...p, year: e.target.value.replace(/\D/g, '') }))}
                                                                placeholder="e.g. 2024"
                                                                className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                            />
                                                        </div>

                                                        <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Color</label>
                                                            <input 
                                                                value={vehicleForm.color}
                                                                onChange={(e) => setVehicleForm(p => ({ ...p, color: e.target.value }))}
                                                                placeholder="e.g. White"
                                                                className="w-full bg-transparent border-none p-0 text-[13.5px] font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                                            />
                                                        </div>

                                                        <div className="group relative bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all duration-300 col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehicle Plate Number</label>
                                                            <input 
                                                                value={vehicleForm.number}
                                                                onChange={(e) => setVehicleForm(p => ({ ...p, number: e.target.value.toUpperCase() }))}
                                                                placeholder="MP 09 AB 1234"
                                                                className="w-full bg-transparent border-none p-0 text-[13.5px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300 uppercase tracking-widest"
                                                            />
                                                        </div>

                                                        {/* Vehicle Image Upload via Camera */}
                                                        <div 
                                                            onClick={() => vehicleImageRef.current?.click()}
                                                            className={`group relative bg-white border rounded-2xl p-3.5 shadow-sm transition-all duration-300 col-span-2 flex flex-col items-center justify-center cursor-pointer min-h-[140px] ${
                                                                vehicleForm.vehicleImagePreview ? 'border-slate-200' : 'border-dashed border-slate-200 hover:border-slate-350'
                                                            }`}
                                                        >
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 pointer-events-none">Vehicle Photo (Camera Only)</label>
                                                            <input 
                                                                type="file" 
                                                                accept="image/*" 
                                                                capture="environment" 
                                                                className="hidden" 
                                                                ref={vehicleImageRef}
                                                                onChange={handleVehicleImageChange}
                                                            />
                                                            {vehicleForm.vehicleImagePreview ? (
                                                                <>
                                                                    <img src={vehicleForm.vehicleImagePreview} alt="Vehicle" className="absolute inset-0 h-full w-full object-cover rounded-2xl opacity-90 transition-transform duration-500 group-hover:scale-[1.02]" />
                                                                    <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/25 transition-colors duration-300" />
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 flex items-center justify-center gap-1.5 text-[9px] font-black text-white uppercase tracking-widest rounded-b-2xl transform translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                                        <Camera size={11} /> Replace Photo
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center gap-2 text-center pointer-events-none">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm border border-slate-100/50">
                                                                        <Camera size={18} />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tap to capture</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Floating glassmorphic button bar */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent max-w-sm mx-auto z-45">
                                <button 
                                    onClick={handleSaveVehicle}
                                    disabled={loading}
                                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] ${
                                        (isOwner ? 
                                            (vehicleForm.locationId && vehicleForm.companyName && vehicleForm.companyAddress && vehicleForm.city && vehicleForm.postalCode && vehicleForm.taxNumber) : 
                                            (vehicleForm.locationId && vehicleForm.vehicleTypeId && vehicleForm.make && vehicleForm.model && vehicleForm.year && vehicleForm.number && vehicleForm.color))
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 shadow-md' 
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
                                    }`}
                                >
                                    {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Continue'} <ChevronRight size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div 
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-1">
                                <span className="bg-slate-900/5 text-slate-800 text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                                    Identity Verification
                                </span>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase leading-none font-display pt-1">KYC Vault</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Upload required documents</p>
                            </div>

                            <div className="space-y-5">
                                {templatesLoading ? (
                                    <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-[12px] font-bold text-slate-400 flex flex-col items-center justify-center gap-2 shadow-sm">
                                      <LoaderCircle size={20} className="animate-spin text-slate-400" />
                                      Loading document checklist...
                                    </div>
                                ) : (
                                    documentTemplates.map((template) => (
                                      <div key={template.id} className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-sm space-y-3.5">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <h3 className="text-[13.5px] font-black text-slate-900 uppercase tracking-tight">{template.name}</h3>
                                            <span className={`text-[8.5px] font-black uppercase tracking-widest mt-1 inline-block px-2 py-0.5 rounded-full ${
                                                template.is_required ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                              {template.is_required ? 'Required' : 'Optional'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid gap-3 grid-cols-1">
                                          {template.fields.map((field) => {
                                            const document = docs[field.key];

                                            return (
                                              <button
                                                key={field.key}
                                                type="button"
                                                onClick={() => openPicker(field.key)}
                                                className={`group relative min-h-[140px] rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col items-center justify-center ${
                                                  document?.previewUrl
                                                    ? 'border-slate-200 bg-slate-50'
                                                    : 'border-dashed border-slate-200 bg-white hover:border-slate-350'
                                                }`}
                                              >
                                                <input
                                                  ref={(element) => {
                                                    inputRefs.current[field.key] = element;
                                                  }}
                                                  type="file"
                                                  accept="image/*"
                                                  capture="environment"
                                                  className="hidden"
                                                  onChange={(event) => handleFileChange(field.key, event)}
                                                />

                                                {uploading === field.key ? (
                                                  <div className="flex flex-col items-center justify-center gap-2.5">
                                                    <LoaderCircle size={20} className="animate-spin text-slate-900" />
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Uploading File...</span>
                                                  </div>
                                                ) : document?.previewUrl ? (
                                                  <>
                                                    <img src={document.previewUrl} alt={field.label} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors duration-300" />
                                                    
                                                    {/* Custom glass replacement overlay */}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 flex items-center justify-center gap-1.5 text-[9px] font-black text-white uppercase tracking-widest transform translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        <Camera size={11} /> Replace Photo
                                                    </div>
                                                  </>
                                                ) : (
                                                  <div className="flex flex-col items-center justify-center gap-2.5 px-4 text-center">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm border border-slate-100/50">
                                                      <FileText size={18} />
                                                    </div>
                                                    <div>
                                                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">{field.label}</p>
                                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        Tap to upload photo
                                                      </p>
                                                    </div>
                                                  </div>
                                                )}

                                                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                                                  {!document?.previewUrl ? (
                                                    <div className="rounded-lg bg-white p-1.5 shadow-sm border border-slate-100 text-slate-650">
                                                      <Camera size={11} strokeWidth={2.5} />
                                                    </div>
                                                  ) : null}
                                                  {document?.uploaded && uploading !== field.key ? (
                                                    <div className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md transform scale-100 group-hover:scale-110 transition-transform duration-300 border-2 border-white">
                                                      <Check size={14} strokeWidth={3} />
                                                    </div>
                                                  ) : null}
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))
                                )}

                                {/* Warning/Requirement tip banner */}
                                <div className="bg-amber-50/50 p-4 border border-amber-100/50 rounded-2xl flex gap-3">
                                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-[10px] font-bold text-slate-600 leading-snug">
                                    Ensure all captured photos are <span className="text-amber-700 font-black">clear and legible</span> under bright lighting conditions to expedite approval.
                                  </p>
                                </div>
                            </div>

                            {/* Floating submit bar */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent max-w-sm mx-auto z-45">
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !isDocumentsComplete}
                                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] ${
                                      isDocumentsComplete 
                                      ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 shadow-md' 
                                      : 'bg-slate-250 text-slate-400 cursor-not-allowed pointer-events-none'
                                    }`}
                                >
                                    {loading ? <LoaderCircle size={16} className="animate-spin" /> : 'Submit Application'} <ShieldCheck size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default StepPersonal;
