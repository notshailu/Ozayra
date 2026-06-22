import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, Trash2, Tag, ShieldCheck, Star, AlertCircle, RefreshCw, Megaphone, CheckCircle2 } from 'lucide-react';
import BottomNavbar from '../components/BottomNavbar';
import { userAuthService } from '../services/authService';
import toast from 'react-hot-toast';

const formatNotificationTime = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TYPE_ICONS = {
  ride:     { icon: Star,        bg: 'bg-orange-50',  color: 'text-orange-500' },
  promo:    { icon: Tag,         bg: 'bg-yellow-50',  color: 'text-yellow-600' },
  safety:   { icon: ShieldCheck, bg: 'bg-blue-50',    color: 'text-blue-500'   },
  referral: { icon: Star,        bg: 'bg-green-50', color: 'text-green-500'},
  parcel:   { icon: Bell,        bg: 'bg-purple-50',  color: 'text-purple-500' },
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl bg-white border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-200 rounded-full w-2/3" />
      <div className="h-2.5 bg-gray-100 rounded-full w-full" />
      <div className="h-2.5 bg-gray-100 rounded-full w-4/5" />
    </div>
  </div>
);

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userAuthService.getNotifications();
      setNotifications(response?.data?.results || []);
    } catch (err) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;

    setClearing(true);
    try {
      await userAuthService.clearAllNotifications();
      setNotifications([]);
      toast.success('All notifications cleared', {
        icon: <CheckCircle2 size={18} className="text-green-500" />,
        className: 'font-bold text-sm rounded-xl shadow-lg border border-gray-100 bg-white',
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to clear notifications');
    } finally {
      setClearing(false);
    }
  };

  const handleRemoveSingle = async (id) => {
    try {
      await userAuthService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification removed', {
        className: 'font-bold text-sm rounded-xl shadow-lg border border-gray-100 bg-white',
      });
    } catch (err) {
      toast.error('Failed to remove notification');
    }
  };

  const totalCount = useMemo(() => notifications.length, [notifications.length]);

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto font-sans pb-28 relative">
      {/* Header */}
      <header className="bg-white px-5 pt-8 pb-4 sticky top-0 z-20 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/taxi/user/profile')} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all">
            <ArrowLeft size={20} className="text-gray-900" strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Inbox</p>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">Notifications</h1>
          </div>
          <div className="bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            {totalCount}
          </div>
        </div>
      </header>

      <div className="px-5 pt-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Alerts</p>
          <div className="flex items-center gap-4">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing || loading}
                className="flex items-center gap-1.5 text-xs font-bold uppercase text-red-500 active:scale-95 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} strokeWidth={2.5} />
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={fetchNotifications}
              className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-600 hover:text-gray-900 active:scale-95 transition-all"
            >
              <RefreshCw size={14} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <AlertCircle size={28} className="text-red-500" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-gray-700">{error}</p>
            <button onClick={fetchNotifications}
              className="flex items-center gap-2 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider active:scale-95 transition-all shadow-sm">
              <RefreshCw size={16} strokeWidth={2.5} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Bell size={36} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">You're all caught up</p>
              <p className="text-sm font-medium text-gray-500 mt-1">No new notifications right now</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {!loading && !error && notifications.map((n) => {
            return (
              <motion.div key={n.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative rounded-xl border border-gray-100 bg-white p-4 flex items-start gap-4 transition-all shadow-sm">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-yellow-50">
                  <Megaphone size={18} className="text-yellow-600" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-tight font-bold text-gray-900">{n.title || 'Notification'}</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-gray-400 mt-0.5">
                        {formatNotificationTime(n.sentAt)}
                      </span>
                      <button
                        onClick={() => handleRemoveSingle(n.id)}
                        className="p-1 text-gray-300 hover:bg-gray-100 rounded-full hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-600 mt-1.5 leading-relaxed whitespace-pre-wrap">{n.body || 'No message'}</p>
                  
                  {n.image && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                      <img 
                        src={n.image} 
                        alt="Notification content" 
                        className="w-full h-auto max-h-[180px] object-cover"
                      />
                    </div>
                  )}

                  {n.serviceLocationName && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                      {n.serviceLocationName}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Notifications;
