import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Phone,
  Plus,
  Trash2,
  Zap,
  X,
  CheckCircle2,
  User,
  Smartphone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  addDriverEmergencyContact,
  deleteDriverEmergencyContact,
  getDriverEmergencyContacts,
} from '../../services/registrationService';
import { useSettings } from '../../../../shared/context/SettingsContext';

const MAX_CONTACTS = 5;
const PHONE_REGEX = /^\d{3,15}$/;

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 15);

const SecuritySOS = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const canUseContactPicker =
    typeof navigator !== 'undefined' &&
    navigator.contacts &&
    typeof navigator.contacts.select === 'function';

  const remainingSlots = useMemo(
    () => Math.max(0, MAX_CONTACTS - contacts.length),
    [contacts.length],
  );

  const resetForm = () => {
    setName('');
    setPhone('');
    setErrors({});
  };

  const loadContacts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getDriverEmergencyContacts();
      setContacts(response?.data?.results || []);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load emergency contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (!showToast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setShowToast(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  const validateContact = (contactName, contactPhone) => {
    const nextErrors = {};
    const trimmedName = String(contactName || '').trim();
    const normalizedPhone = normalizePhone(contactPhone);

    if (!trimmedName) {
      nextErrors.name = 'Name is required';
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      nextErrors.phone = 'Enter a valid mobile or emergency number';
    }

    if (contacts.some((contact) => normalizePhone(contact.phone) === normalizedPhone)) {
      nextErrors.phone = 'This number is already added';
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      name: trimmedName,
      phone: normalizedPhone,
    };
  };

  const handleAddContact = async ({ contactName, contactPhone, source = 'manual' }) => {
    const result = validateContact(contactName, contactPhone);

    if (!result.isValid) {
      return;
    }

    if (contacts.length >= MAX_CONTACTS) {
      setError(`You can add up to ${MAX_CONTACTS} emergency contacts`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await addDriverEmergencyContact({
        name: result.name,
        phone: result.phone,
        source,
      });

      setContacts((prev) => [...prev, response?.data || {}]);
      resetForm();
      setShowAddSheet(false);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to add emergency contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    setIsDeletingId(deleteTarget.id);
    setError('');

    try {
      await deleteDriverEmergencyContact(deleteTarget.id);
      setContacts((prev) => prev.filter((contact) => contact.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to remove emergency contact');
    } finally {
      setIsDeletingId('');
    }
  };

  const handlePickFromDevice = async () => {
    if (!canUseContactPicker) {
      setError('Phone contact selection is not supported on this device/browser');
      return;
    }

    if (contacts.length >= MAX_CONTACTS) {
      setError(`You can add up to ${MAX_CONTACTS} emergency contacts`);
      return;
    }

    setError('');

    try {
      const [pickedContact] = await navigator.contacts.select(['name', 'tel'], {
        multiple: false,
      });

      if (!pickedContact) {
        return;
      }

      const pickedName = Array.isArray(pickedContact.name)
        ? pickedContact.name[0]
        : pickedContact.name || '';
      const pickedPhone = Array.isArray(pickedContact.tel)
        ? pickedContact.tel[0]
        : pickedContact.tel || '';

      setName(String(pickedName || '').trim());
      setPhone(normalizePhone(pickedPhone));
      setShowAddSheet(true);

      await handleAddContact({
        contactName: pickedName,
        contactPhone: pickedPhone,
        source: 'device',
      });
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        return;
      }

      setError(requestError?.message || 'Unable to read device contacts');
    }
  };

  const triggerSOS = () => {
    setShowToast(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans p-6 pt-10 pb-32">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/taxi/driver/home')} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-slate-900" />
        </button>
        <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Security & SOS</h1>
      </header>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 left-6 right-6 z-[100] bg-rose-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-xl"
          >
            <Zap size={18} fill="currentColor" />
            <p className="text-[13px] font-medium">SOS triggered for saved contacts</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="space-y-6">
        {/* Hero Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-[17px] font-semibold text-slate-900">Emergency Contacts</h3>
              <p className="text-[13px] font-medium text-slate-500 leading-relaxed max-w-[260px]">
                Add trusted contacts for emergency driver safety actions.
              </p>
            </div>
            <div className="w-11 h-11 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
          </div>
          <button
            type="button"
            onClick={triggerSOS}
            className="h-11 w-full bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[13px] font-medium transition-all active:scale-[0.98]"
          >
            Test panic mode
          </button>
        </div>

        {/* Contact List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-medium text-slate-500">Emergency list</h3>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-slate-400">
                {contacts.length}/{MAX_CONTACTS}
              </span>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddSheet(true);
                }}
                disabled={remainingSlots === 0}
                className="text-[12px] font-medium text-blue-600 disabled:text-slate-300"
              >
                + Add new
              </button>
            </div>
          </div>

          {error ? (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-[12px] font-medium">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center text-[13px] font-medium text-slate-400">
              Loading emergency contacts...
            </div>
          ) : null}

          {!isLoading && contacts.length === 0 ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center text-[13px] font-medium text-slate-400">
              No emergency contacts added yet.
            </div>
          ) : null}

          {!isLoading &&
            contacts.map((contact) => (
              <div key={contact.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-100">
                    <Phone size={17} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-[14px] font-semibold text-slate-900 leading-tight">{contact.name}</h4>
                    <p className="text-[12px] font-medium text-slate-400 leading-tight">
                      +91 {contact.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(`tel:+91${contact.phone}`)}
                    className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Phone size={13} className="text-emerald-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(contact)}
                    className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Trash2 size={13} className="text-rose-400" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* Add Contact Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] max-w-lg mx-auto"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl px-5 pt-4 pb-10 z-[101]"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[17px] font-semibold text-slate-900">Add emergency contact</h3>
                <button type="button" onClick={() => setShowAddSheet(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <X size={15} className="text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handlePickFromDevice}
                  disabled={!canUseContactPicker || remainingSlots === 0 || isSaving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Smartphone size={16} />
                  {canUseContactPicker ? 'Pick from phone contacts' : 'Phone contact picker unavailable'}
                </button>

                <div>
                  <label className="text-[12px] font-medium text-slate-500 ml-1 mb-1.5 block">Name</label>
                  <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${errors.name ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
                    <User size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Contact name"
                      className="flex-1 bg-transparent border-none text-[15px] font-medium text-slate-900 focus:outline-none placeholder:text-slate-300"
                    />
                  </div>
                  {errors.name ? <p className="text-[12px] font-medium text-rose-500 ml-1 mt-1">{errors.name}</p> : null}
                </div>

                <div>
                  <label className="text-[12px] font-medium text-slate-500 ml-1 mb-1.5 block">Mobile number</label>
                  <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${errors.phone ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
                    <Phone size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      maxLength={15}
                      value={phone}
                      onChange={(event) => {
                        setPhone(normalizePhone(event.target.value));
                        setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="Mobile or emergency number"
                      className="flex-1 bg-transparent border-none text-[15px] font-medium text-slate-900 focus:outline-none placeholder:text-slate-300"
                    />
                    {PHONE_REGEX.test(phone) ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : null}
                  </div>
                  {errors.phone ? <p className="text-[12px] font-medium text-rose-500 ml-1 mt-1">{errors.phone}</p> : null}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => handleAddContact({ contactName: name, contactPhone: phone, source: 'manual' })}
                  disabled={isSaving || remainingSlots === 0}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 mt-2 disabled:opacity-60 active:scale-[0.98] transition-all"
                >
                  {isSaving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>
                    <Plus size={15} />
                    Save contact
                  </>}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] max-w-lg mx-auto"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[82%] max-w-sm bg-white rounded-3xl p-6 z-[101] shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} className="text-rose-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-slate-900 mb-1">Remove contact?</h3>
              <p className="text-[13px] font-medium text-slate-500 mb-6">
                {deleteTarget.name} will be removed from your emergency list.
              </p>
              <div className="space-y-2.5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleDeleteContact}
                  disabled={isDeletingId === deleteTarget.id}
                  className="w-full bg-rose-500 text-white py-3 rounded-xl text-[14px] font-medium"
                >
                  {isDeletingId === deleteTarget.id ? 'Removing...' : 'Remove'}
                </motion.button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-full py-3 text-[14px] font-medium text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default SecuritySOS;
