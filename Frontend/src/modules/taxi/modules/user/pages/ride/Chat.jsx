import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Phone, Smile, Headset } from 'lucide-react';
import SupportChatPanel from '../../../shared/components/SupportChatPanel';
import api from '../../../../shared/api/axiosInstance';
import { socketService } from '../../../../shared/api/socket';

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isAdminChat = searchParams.get('admin') === 'true';
  const routeRole = searchParams.get('role');
  const supportRole = routeRole === 'driver' ? 'driver' : 'user';
  const hasLiveToken = Boolean(
    supportRole === 'driver'
      ? localStorage.getItem('driverToken') || localStorage.getItem('auth_driver') || localStorage.getItem('token')
      : localStorage.getItem('userToken') || localStorage.getItem('auth_user') || localStorage.getItem('token'),
  );
  const bottomRef = useRef(null);

  const [activeRide, setActiveRide] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(!isAdminChat);

  useEffect(() => {
    if (isAdminChat) return;

    socketService.connect({ role: supportRole });

    const fetchActiveRide = async () => {
      try {
        const token = supportRole === 'driver' 
          ? localStorage.getItem('driverToken') || localStorage.getItem('auth_driver') || localStorage.getItem('token') 
          : localStorage.getItem('userToken') || localStorage.getItem('auth_user') || localStorage.getItem('token');
          
        if (!token) {
          setIsLoading(false);
          return;
        }
        const response = await api.get('/rides/active/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = response.data?.data || response.data;
        if (payload?.rideId) {
            setActiveRide(payload);
            const loadedMessages = (payload.messages || []).map(m => ({
                id: m.id || m._id,
                sender: String(m.senderRole).toLowerCase() === supportRole ? 'user' : 'other',
                text: m.message,
                time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
            }));
            setMessages(loadedMessages);
            
            socketService.emit('joinRide', { rideId: payload.rideId });
        }
      } catch(err) {
        console.error('Error fetching active ride for chat', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActiveRide();
  }, [isAdminChat, supportRole]);

  useEffect(() => {
    if (isAdminChat || !activeRide) return;

    const handleNewMessage = (msg) => {
        if (String(msg.rideId) !== String(activeRide.rideId)) return;
        
        const isMe = String(msg.senderRole).toLowerCase() === supportRole;
        if (!isMe) {
            setMessages(prev => [...prev, {
                id: msg.id || Date.now(),
                sender: 'other',
                text: msg.message,
                time: new Date(msg.sentAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
            }]);
        }
    };

    socketService.on('ride:message:new', handleNewMessage);
    return () => socketService.off('ride:message:new', handleNewMessage);
  }, [activeRide, supportRole, isAdminChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isAdminChat && hasLiveToken) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-lg mx-auto flex flex-col font-sans relative">
        <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-slate-100">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all text-slate-900 hover:bg-slate-50 rounded-full">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Support</p>
            <h1 className="text-[16px] font-semibold text-slate-900">
              {supportRole === 'driver' ? 'Driver Chat' : 'User Chat'}
            </h1>
          </div>
        </header>
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 p-2">
          <SupportChatPanel
            mode="participant"
            title={supportRole === 'driver' ? 'Driver Support' : 'User Support'}
            subtitle="Connected to support desk"
            preferredRole={supportRole}
            className="flex-1 flex flex-col min-h-0 border-none shadow-none bg-transparent"
          />
        </div>
      </div>
    );
  }

  const quickReplies = isAdminChat
    ? ['Payment Issue', 'Ride Cancelled', 'Lost Item', 'Safety']
    : ['Wait for me', "I'm coming", 'Where exactly?', 'Okay'];

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    
    const newMsg = { 
        id: Date.now(), 
        sender: 'user', 
        text: msg, 
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) 
    };
    
    setMessages((prev) => [...prev, newMsg]);

    if (!isAdminChat && activeRide) {
        socketService.emit('ride:message:send', {
            rideId: activeRide.rideId,
            message: msg
        });
    } else if (isAdminChat) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'other', text: 'Thanks for reaching out! Our team will assist you shortly.', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) },
        ]);
      }, 1200);
    }
  };

  const otherName = isAdminChat ? 'Rydon24 Support' : (supportRole === 'driver' ? (activeRide?.user?.name || 'Passenger') : (activeRide?.driver?.name || 'Driver'));
  const otherSub = isAdminChat ? 'Active now' : (supportRole === 'driver' ? 'Passenger · Active now' : 'Driver · Active now');
  const otherPhone = isAdminChat ? null : (supportRole === 'driver' ? activeRide?.user?.phone : activeRide?.driver?.phone);
  const otherImage = isAdminChat ? null : (supportRole === 'driver' ? (activeRide?.user?.profileImage || activeRide?.user?.avatar) : (activeRide?.driver?.profileImage || activeRide?.driver?.avatar));

  return (
    <div className="h-[100dvh] bg-slate-50 max-w-lg mx-auto flex flex-col font-sans relative overflow-hidden">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white px-4 py-4 flex items-center gap-3 border-b border-slate-100 sticky top-0 z-20">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all text-slate-900 hover:bg-slate-50 rounded-full shrink-0">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </motion.button>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-slate-100 ${isAdminChat ? 'bg-orange-50' : 'bg-slate-100'}`}>
            {isAdminChat ? (
              <Headset size={18} className="text-orange-500" strokeWidth={2} />
            ) : (
              <img src={otherImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=f1f5f9&color=0f172a`} alt="Avatar" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 leading-tight">{isLoading ? 'Connecting...' : otherName}</p>
          <p className="text-[11px] font-medium text-emerald-500 uppercase tracking-wider">{otherSub}</p>
        </div>

        {!isAdminChat && otherPhone && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { console.log('Calling:', otherPhone); window.location.href = `tel:${otherPhone}`; }} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Phone size={15} className="text-slate-700" strokeWidth={2.5} />
          </motion.button>
        )}
      </motion.header>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, x: isUser ? 12 : -12 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.22 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                    isUser ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="text-[14px] font-medium leading-relaxed">{m.text}</p>
                  <span className={`text-[10px] font-medium mt-1 block uppercase tracking-wider ${isUser ? 'text-white/50' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-100 px-4 pt-3 pb-6 space-y-3">
        {/* Quick replies */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickReplies.map((r) => (
            <motion.button key={r} whileTap={{ scale: 0.95 }} onClick={() => send(r)} className="shrink-0 px-4 py-2 rounded-full border border-slate-100 bg-white text-[12px] font-medium text-slate-600 active:bg-slate-50 transition-all shadow-sm">
              {r}
            </motion.button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2.5 border border-slate-100">
          <Smile size={18} className="text-slate-400 shrink-0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            className="flex-1 bg-transparent border-none text-[14px] font-medium text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => send()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
              input.trim() ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <Send size={14} className={input.trim() ? 'text-white' : 'text-slate-400'} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
