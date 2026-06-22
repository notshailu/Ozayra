import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Home, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';

const STORAGE_KEY = 'rydon24:savedAddresses';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultState = {
  home: {
    label: 'Home',
    address: 'Vijay Nagar, Indore',
    landmark: '',
    notes: '',
  },
  work: null,
  landmarks: [],
};

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
    {children}
  </div>
);

const PrimaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 text-gray-900 px-4 py-3.5 text-sm font-bold shadow-sm active:scale-95 transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 text-gray-800 px-4 py-3.5 text-sm font-bold shadow-sm active:scale-95 hover:bg-gray-50 transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);

const AddressCard = ({ icon: Icon, title, subtitle, isEmpty, onEdit, onDelete }) => (
  <motion.div
    whileTap={{ scale: 0.985 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4"
  >
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-gray-900">
      <Icon size={24} strokeWidth={2} />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 mt-0.5">
          <div className="text-base font-bold text-gray-900 leading-none">{title}</div>
          <div className={`mt-1.5 text-sm ${isEmpty ? 'text-gray-400 italic' : 'text-gray-500'} truncate`}>
            {subtitle}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={`Edit ${title}`}
          >
            <Pencil size={18} strokeWidth={2} />
          </button>
          {!isEmpty && (
            <button
              type="button"
              onClick={onDelete}
              className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
              aria-label={`Delete ${title}`}
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
);

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:p-4">
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <div className="px-5 pt-6 pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold text-gray-900 tracking-tight">{title}</div>
            {subtitle && <div className="mt-1 text-sm font-medium text-gray-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="px-5 py-5 overflow-y-auto">{children}</div>
    </motion.div>
  </div>
);

const AddressSettings = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(defaultState);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const draftDefaults = useMemo(() => {
    const mode = modal?.mode;
    if (!mode) return null;
    if (mode === 'home') return data.home || defaultState.home;
    if (mode === 'work') return data.work || { label: 'Work', address: '', landmark: '', notes: '' };
    if (mode === 'landmark') {
      const existing = data.landmarks.find((l) => l.id === modal.id);
      return existing || { id: createId(), label: '', address: '', landmark: '', notes: '' };
    }
    return null;
  }, [data, modal]);

  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') setData({ ...defaultState, ...parsed });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);

  useEffect(() => {
    if (!draftDefaults) {
      setDraft(null);
      return;
    }
    setDraft(draftDefaults);
  }, [draftDefaults]);

  const closeModal = () => setModal(null);
  const openEdit = (mode, id) => setModal({ mode, id });

  const saveDraft = () => {
    if (!modal || !draft) return;

    if (modal.mode === 'home') {
      setData((prev) => ({ ...prev, home: { ...prev.home, ...draft, label: 'Home' } }));
      closeModal();
      return;
    }

    if (modal.mode === 'work') {
      setData((prev) => ({ ...prev, work: { ...draft, label: 'Work' } }));
      closeModal();
      return;
    }

    if (modal.mode === 'landmark') {
      if (!draft.label.trim() || !draft.address.trim()) return;
      setData((prev) => {
        const exists = prev.landmarks.some((l) => l.id === draft.id);
        const nextLandmarks = exists
          ? prev.landmarks.map((l) => (l.id === draft.id ? { ...draft } : l))
          : [{ ...draft }, ...prev.landmarks];
        return { ...prev, landmarks: nextLandmarks };
      });
      closeModal();
    }
  };

  const doDelete = () => {
    if (!confirmDelete) return;

    if (confirmDelete.mode === 'home') {
      setData((prev) => ({ ...prev, home: { ...prev.home, address: '', landmark: '', notes: '' } }));
    } else if (confirmDelete.mode === 'work') {
      setData((prev) => ({ ...prev, work: null }));
    } else if (confirmDelete.mode === 'landmark') {
      setData((prev) => ({ ...prev, landmarks: prev.landmarks.filter((l) => l.id !== confirmDelete.id) }));
    }

    setConfirmDelete(null);
  };

  const homeSubtitle = data.home?.address?.trim() ? data.home.address : 'Add your home address';
  const workSubtitle = data.work?.address?.trim() ? data.work.address : 'Add your office address';
  const hasLandmarks = data.landmarks.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto flex flex-col font-sans pb-8 relative">
      <header className="sticky top-0 z-30">
        <div className="bg-white border-b border-gray-200">
          <div className="px-5 py-4 flex items-center gap-4">
            <button onClick={() => navigate('/taxi/user/profile')} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
              <ArrowLeft size={22} className="text-gray-900" strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Profile</p>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none truncate">
                Addresses
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 pt-6 space-y-6 flex-1">
        <div className="space-y-3">
          <AddressCard
            icon={Home}
            title="Home"
            subtitle={homeSubtitle}
            isEmpty={!data.home?.address?.trim()}
            onEdit={() => openEdit('home')}
            onDelete={() => setConfirmDelete({ mode: 'home', title: 'Home address' })}
          />
          <AddressCard
            icon={Briefcase}
            title="Work"
            subtitle={workSubtitle}
            isEmpty={!data.work?.address?.trim()}
            onEdit={() => openEdit('work')}
            onDelete={() => setConfirmDelete({ mode: 'work', title: 'Work address' })}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Landmarks</div>
              <div className="mt-1 text-lg font-bold text-gray-900 tracking-tight">Saved places</div>
            </div>
            <button
              type="button"
              onClick={() => openEdit('landmark')}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-bold text-gray-800 transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add
            </button>
          </div>

          {hasLandmarks ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {data.landmarks.map((lm) => (
                <div key={lm.id} className="px-4 py-4 border-b border-gray-100 last:border-none flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center shrink-0 text-gray-600">
                    <MapPin size={22} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0 mt-0.5">
                    <div className="text-base font-bold text-gray-900 truncate">{lm.label}</div>
                    <div className="mt-1 text-sm text-gray-500 truncate">{lm.address}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit('landmark', lm.id)}
                      className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={`Edit ${lm.label}`}
                    >
                      <Pencil size={18} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ mode: 'landmark', id: lm.id, title: lm.label })}
                      className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${lm.label}`}
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-400 mb-4">
                <MapPin size={24} strokeWidth={2} />
              </div>
              <div className="text-base font-bold text-gray-900">No landmarks yet</div>
              <div className="mt-1.5 text-sm font-medium text-gray-500 px-4">
                Save places like "Gym", "Mom's house", or "Office gate".
              </div>
              <div className="mt-6">
                <SecondaryButton onClick={() => openEdit('landmark')}>
                  <Plus size={18} strokeWidth={2.5} />
                  Add landmark
                </SecondaryButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modal && draft && (
          <ModalShell
            title={
              modal.mode === 'home'
                ? 'Edit Home'
                : modal.mode === 'work'
                  ? 'Edit Work'
                  : modal.id
                    ? 'Edit Landmark'
                    : 'Add Landmark'
            }
            subtitle={modal.mode === 'landmark' ? 'Save a place for quick access.' : 'Update your saved address.'}
            onClose={closeModal}
          >
            <div className="space-y-5">
              {modal.mode === 'landmark' && (
                <Field label="Label">
                  <input
                    value={draft.label}
                    onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Gym, Office gate"
                    className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
                  />
                </Field>
              )}

              <Field label="Address">
                <textarea
                  value={draft.address}
                  onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Add full address"
                  rows={3}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all resize-none"
                />
              </Field>

              <Field label="Landmark (Optional)">
                <input
                  value={draft.landmark}
                  onChange={(e) => setDraft((prev) => ({ ...prev, landmark: e.target.value }))}
                  placeholder="Near..."
                  className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
                />
              </Field>

              <Field label="Notes (Optional)">
                <input
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., Ring bell, call on arrival"
                  className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
                />
              </Field>

              <div className="pt-4 space-y-3">
                <PrimaryButton onClick={saveDraft}>
                  {modal.mode === 'landmark' ? 'Save Landmark' : 'Save Address'}
                </PrimaryButton>
                <SecondaryButton onClick={closeModal}>Cancel</SecondaryButton>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-gray-900">Delete Address</div>
                  <div className="mt-1.5 text-sm font-medium text-gray-500">
                    Remove <span className="font-bold text-gray-900">{confirmDelete.title}</span> from saved addresses?
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-3.5 text-sm font-bold text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressSettings;
