import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Phone, HelpCircle, AlertCircle, XCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import BottomNavbar from '../../components/BottomNavbar';

const Support = () => {
  const navigate = useNavigate();

  const helpTopics = [
    { title: "Driver didn't arrive", Icon: XCircle, iconClass: 'text-rose-500', ringClass: 'bg-rose-50' },
    { title: 'Safety concern', Icon: ShieldCheck, iconClass: 'text-blue-500', ringClass: 'bg-blue-50' },
    { title: 'I lost an item', Icon: HelpCircle, iconClass: 'text-orange-500', ringClass: 'bg-orange-50' },
    { title: 'Payment failure', Icon: AlertCircle, iconClass: 'text-slate-600', ringClass: 'bg-slate-100' },
  ];

  const handleCall = () => {
    window.open('tel:+919876543210', '_self');
  };

  const handleChat = () => {
    navigate('/taxi/user/ride/chat?admin=true&role=user');
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto flex flex-col font-sans relative pb-24 overflow-hidden">
      <header className="bg-white sticky top-0 z-20 border-b border-slate-100">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all text-slate-900 hover:bg-slate-50 rounded-full">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Support</p>
            <h1 className="text-[16px] font-semibold text-slate-900 leading-tight">Help & Support</h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-5 flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleChat}
            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:bg-slate-50 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <MessageCircle size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900 leading-tight">Live chat</div>
              <div className="mt-0.5 text-[12px] text-slate-500 truncate">Get quick help</div>
            </div>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleCall}
            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:bg-slate-50 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
              <Phone size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900 leading-tight">Call support</div>
              <div className="mt-0.5 text-[12px] text-slate-500 truncate">Talk to us</div>
            </div>
          </motion.button>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3 ml-1">
            Choose a topic
          </h3>
          <div className="space-y-3">
            {helpTopics.map((topic) => (
              <motion.button
                key={topic.title}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate('/taxi/user/support/tickets')}
                className="w-full text-left bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3 transition-all active:bg-slate-50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-full ${topic.ringClass} flex items-center justify-center`}>
                    <topic.Icon size={20} strokeWidth={2} className={topic.iconClass} />
                  </div>
                  <span className="text-[15px] font-medium text-slate-900 tracking-tight truncate">{topic.title}</span>
                </div>
                <ChevronRight size={20} className="text-slate-300 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Support;
