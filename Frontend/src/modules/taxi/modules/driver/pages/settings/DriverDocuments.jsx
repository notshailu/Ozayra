import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Eye, FileText, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentDriver, getDriverDocumentTemplates } from '../../services/registrationService';
import {
  flattenDriverDocumentFields,
  getDocumentPreviewUrl,
  normalizeDriverDocumentTemplates,
} from '../../utils/documentTemplates';

const formatDate = (value) => {
  if (!value) return 'Uploaded';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const DriverDocuments = () => {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [driver, setDriver] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDriver = async () => {
    setIsSyncing(true);
    setError('');

    try {
      const [driverResponse, templateResponse] = await Promise.all([
        getCurrentDriver(),
        getDriverDocumentTemplates(),
      ]);

      const driverData = driverResponse?.data?.data || driverResponse?.data || null;
      setDriver(driverData);

      const isOwner = String(driverData?.onboarding?.role || '').toLowerCase() === 'owner';
      const expectedType = isOwner ? 'fleet_drivers' : 'individual';

      const rawTemplates = templateResponse?.data?.data?.results || templateResponse?.data?.results || [];
      const normalized = normalizeDriverDocumentTemplates(rawTemplates);
      const filtered = normalized.filter(t => t.account_type === 'both' || t.account_type === expectedType);

      setTemplates(filtered);
    } catch (err) {
      setError(err?.message || 'Unable to load driver documents');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadDriver();
  }, []);

  const docs = useMemo(() => {
    const documents = driver?.documents || {};

    return flattenDriverDocumentFields(templates).map((field, index) => {
      const doc = documents[field.key] || null;
      const previewUrl = getDocumentPreviewUrl(doc);
      const uploadedAt = doc?.uploadedAt || doc?.createdAt || doc?.updatedAt || '';
      const hasDoc = Boolean(previewUrl || doc);

      return {
        id: field.key,
        name: field.label,
        templateName: field.templateName,
        status: hasDoc ? 'Uploaded' : 'Missing',
        date: hasDoc ? formatDate(uploadedAt) : 'Not uploaded',
        previewUrl,
        fileName: doc?.fileName || field.label,
        uploadedAt,
        order: index,
      };
    });
  }, [driver?.documents, templates]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans p-6 pt-10 pb-32 overflow-x-hidden">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate('/taxi/driver/profile')} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-slate-900" />
        </button>
        <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Documents</h1>
      </header>

      <AnimatePresence>
        {selectedDoc ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 rounded-3xl shadow-2xl space-y-4 max-w-xs w-full">
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-100">
                  <FileText size={18} />
                </div>
                <button onClick={() => setSelectedDoc(null)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[16px] font-semibold text-slate-900 leading-tight">{selectedDoc.name}</h4>
                <p className="text-[12px] font-medium text-slate-400">{selectedDoc.templateName}</p>
              </div>
              <div className="aspect-[3/2] bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                {selectedDoc.previewUrl ? (
                  <img src={selectedDoc.previewUrl} alt={selectedDoc.name} className="w-full h-full object-cover" />
                ) : (
                  <p className="text-[12px] font-medium text-slate-300">Preview unavailable</p>
                )}
              </div>
              <button onClick={() => setSelectedDoc(null)} className="w-full h-12 bg-slate-900 text-white rounded-2xl text-[13px] font-medium transition-all active:scale-[0.98]">
                Close
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <main className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-slate-900 leading-none">
                {isLoading ? 'Loading...' : `${docs.filter((doc) => doc.status === 'Uploaded').length} Uploaded`}
              </h3>
              <p className="text-[12px] font-medium text-slate-400 leading-tight">
                {docs.filter((doc) => doc.status !== 'Uploaded').length} action required
              </p>
            </div>
          </div>
          <button
            onClick={loadDriver}
            className={`text-[12px] font-medium px-4 py-2 rounded-xl transition-all ${isSyncing ? 'bg-slate-50 text-slate-300' : 'bg-blue-50 text-blue-600 active:bg-blue-100'}`}
            disabled={isSyncing}
          >
            {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : 'Refresh'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-medium text-slate-500">Uploaded Documents</h3>
          </div>

          <div className="space-y-3">
            {error ? (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-[12px] font-medium">
                {error}
              </div>
            ) : null}

            {!error && docs.length === 0 ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center text-[13px] font-medium text-slate-400">
                No documents uploaded yet.
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100">
                      <FileText size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[14px] font-semibold text-slate-900 leading-tight">{doc.name}</h4>
                      <p className="text-[12px] font-medium text-slate-400 leading-tight">{doc.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${doc.status === 'Uploaded' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      {doc.status === 'Uploaded' ? 'Done' : 'Missing'}
                    </span>
                    <Eye size={16} className="text-slate-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDocuments;
