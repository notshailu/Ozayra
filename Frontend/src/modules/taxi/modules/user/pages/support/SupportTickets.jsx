import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronRight, Headset, X, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { supportTicketService } from '../../../shared/services/supportTicketService';

const STATUS_STYLES = {
  pending: 'bg-orange-50 text-orange-600 border-orange-100',
  assigned: 'bg-blue-50 text-blue-600 border-blue-100',
  closed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const TABS = ['All', 'Open', 'Resolved'];

const SupportTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [titleOptions, setTitleOptions] = useState([]);
  const [activeTab, setActiveTab]   = useState('All');
  const [showForm, setShowForm]     = useState(false);
  const [titleId, setTitleId]       = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDesc]      = useState('');
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const rolePrefix = window.location.pathname.includes('/taxi/driver') ? '/taxi/driver' : '/taxi/user';
  const requesterType = rolePrefix.includes('/driver') ? 'driver' : 'user';

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [titlesResponse, ticketsResponse] = await Promise.all([
        supportTicketService.getTitles(requesterType),
        supportTicketService.listMyTickets({ page: 1, limit: 100 }),
      ]);

      setTitleOptions(titlesResponse?.data?.results || []);
      setTickets(ticketsResponse?.data?.results || []);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to load support data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [requesterType]);

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      if (activeTab === 'All') return true;
      if (activeTab === 'Open') return ['pending', 'assigned'].includes(ticket.status);
      return ticket.status === 'closed';
    });
  }, [tickets, activeTab]);

  const validate = () => {
    const e = {};
    if (!titleId && !customTitle.trim()) e.title = 'Select title or write custom title';
    if (!description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await supportTicketService.createTicket({
        titleId: titleId || undefined,
        title: customTitle || undefined,
        description,
        message: description,
      });
      const newTicket = created?.data;
      setTickets((prev) => [newTicket, ...prev]);
      setTitleId('');
      setCustomTitle('');
      setDesc('');
      setErrors({});
      setShowForm(false);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to raise support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto font-sans pb-12 relative overflow-hidden">
      {/* Header */}
      <header className="bg-white px-5 pt-8 pb-4 sticky top-0 z-20 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all text-slate-900 hover:bg-slate-50 rounded-full">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Help Center</p>
            <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">Support Tickets</h1>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(true)}
            className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center shrink-0">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </motion.button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3">
        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : null}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Headset size={30} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-700">No tickets yet</p>
              <p className="text-[13px] font-medium text-slate-400 mt-1">Tap + to get help</p>
            </div>
          </div>
        )}

        {!loading && filtered.map((t, i) => (
          <motion.button key={t.id} type="button"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`${rolePrefix}/support/ticket/${t.ticketCode}`, { state: { ticket: t } })}
            className="w-full text-left rounded-2xl border border-slate-100 bg-white shadow-sm px-4 py-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
              <Headset size={18} className="text-slate-600" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate flex-1">{t.title}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${STATUS_STYLES[t.status] || STATUS_STYLES.pending}`}>
                  {t.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[12px] font-medium text-slate-500 mt-1.5">
                {t.supportType} · {new Date(t.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" strokeWidth={2.5} />
          </motion.button>
        ))}
      </div>

      {/* New ticket bottom sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] max-w-lg mx-auto" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl px-5 pt-4 pb-10 z-[101] max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[18px] font-semibold text-slate-900">New Ticket</h3>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-600" strokeWidth={2.5} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Ticket Title</label>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-[14px] font-medium border transition-all ${
                      showDropdown ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                    } ${!titleId ? 'text-slate-400' : 'text-slate-900'}`}
                  >
                    <span className="truncate">
                      {titleId ? titleOptions.find((o) => String(o.id) === String(titleId))?.title : 'Select title'}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${showDropdown ? 'rotate-180 text-slate-900' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.08)] z-50 overflow-hidden"
                        >
                          <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                            {titleOptions.length === 0 ? (
                              <div className="px-3 py-3 text-center text-[13px] text-slate-400">Loading...</div>
                            ) : (
                              titleOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    setTitleId(option.id);
                                    setErrors((prev) => ({ ...prev, title: '' }));
                                    setShowDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-[14px] font-medium rounded-lg transition-all ${
                                    String(titleId) === String(option.id) ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {option.title}
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Or Custom Title</label>
                  <input type="text" value={customTitle} onChange={e => { setCustomTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                    placeholder="Write custom title if not listed"
                    className={`w-full rounded-xl px-4 py-3.5 text-[14px] font-medium text-slate-900 border focus:outline-none transition-all placeholder:text-slate-400 ${errors.title ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white focus:border-slate-900'}`} />
                  {errors.title && <p className="text-[11px] font-medium text-red-500 ml-1 mt-1.5 flex items-center gap-1"><AlertCircle size={12} strokeWidth={2} />{errors.title}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Description</label>
                  <textarea value={description} onChange={e => { setDesc(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className={`w-full rounded-xl px-4 py-3.5 text-[14px] font-medium text-slate-900 border focus:outline-none transition-all placeholder:text-slate-400 resize-none ${errors.description ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white focus:border-slate-900'}`} />
                  {errors.description && <p className="text-[11px] font-medium text-red-500 ml-1 mt-1.5 flex items-center gap-1"><AlertCircle size={12} strokeWidth={2} />{errors.description}</p>}
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-slate-900 text-white py-4 mt-2 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm">
                  {submitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Ticket'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportTickets;
