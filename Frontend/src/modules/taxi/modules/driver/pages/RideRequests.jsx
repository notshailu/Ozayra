import React, { useState, useEffect } from 'react';
import api from '../../../shared/api/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    ChevronRight, 
    MapPin, 
    Clock, 
    CreditCard, 
    Bike, 
    CheckCircle2, 
    Filter,
    Search,
    TrendingUp,
    IndianRupee,
    Package
} from 'lucide-react';
import DriverBottomNav from '../../shared/components/DriverBottomNav';

const RideRequests = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/rides');
                const results = res.data?.results || [];
                const formatted = results.map(r => {
                    const fare = Number(r.fare || 0);
                    const commissionAmount = Number(r.commissionAmount || 0);
                    // Use backend-settled driverEarnings when available and greater than 0
                    // Fall back to fare - commission for unsettled/defaulted rides
                    const driverEarnings = (r.driverEarnings != null && Number(r.driverEarnings) > 0)
                        ? Number(r.driverEarnings)
                        : Math.max(fare - commissionAmount, 0);
                    return {
                        id: r.rideId || r.id,
                        type: String(r.serviceType || 'ride').toLowerCase(),
                        title: `Ride with ${r.user?.name || r.driver?.name || 'Customer'}`,
                        date: new Date(r.createdAt || Date.now()).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }),
                        fare,
                        commissionAmount,
                        driverEarnings,
                        price: `₹${driverEarnings.toFixed(2)}`,
                        from: r.pickupAddress || 'Pickup Location',
                        to: r.dropAddress || 'Drop Location',
                        status: r.status
                    };
                });
                setHistory(formatted);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredHistory = activeTab === 'all' 
        ? history 
        : history.filter(item => item.type === activeTab);
        
    const completedRides = history.filter(h => h.status === 'completed');
    const totalEarned = completedRides.reduce((acc, curr) => acc + curr.driverEarnings, 0);
    const successRate = history.length > 0 ? Math.round((completedRides.length / history.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#f8f9fb] font-sans select-none overflow-x-hidden p-5 pb-32">
            <header className="flex items-center justify-between mb-6 pt-2">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
                <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">History</h1>
                <button className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-95 transition-transform">
                    <Filter size={16} />
                </button>
            </header>

            {/* Premium Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                 {['all', 'ride', 'parcel'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                            activeTab === tab ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500'
                        }`}
                    >
                        {tab === 'all' ? 'All' : tab === 'ride' ? 'Rides' : 'Deliveries'}
                    </button>
                 ))}
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-white p-4 rounded-2xl border border-slate-100/60 space-y-2">
                     <p className="text-[12px] font-medium text-slate-500 leading-none">Success Rate</p>
                     <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                             <TrendingUp size={14} strokeWidth={2.5} />
                         </div>
                         <h3 className="text-xl font-semibold text-slate-900 leading-none">{successRate}%</h3>
                     </div>
                 </div>
                 <div className="bg-white p-4 rounded-2xl border border-slate-100/60 space-y-2">
                     <p className="text-[12px] font-medium text-slate-500 leading-none">Total Earned</p>
                     <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                             <IndianRupee size={14} strokeWidth={2.5} />
                         </div>
                         <h3 className="text-xl font-semibold text-slate-900 leading-none">₹{totalEarned.toFixed(2)}</h3>
                     </div>
                 </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">Activity Log</h4>
                 
                 {isLoading ? (
                     <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                         <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                         <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Loading history...</p>
                     </div>
                 ) : filteredHistory.length === 0 ? (
                     <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                         <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                             <Clock size={24} />
                         </div>
                         <div>
                             <p className="text-sm font-black text-slate-900 uppercase tracking-tight">No Activity Yet</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Your recent history will appear here</p>
                         </div>
                     </div>
                 ) : (
                     <AnimatePresence mode="popLayout">
                        {filteredHistory.map((item, idx) => (
                            <motion.div 
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-4 rounded-2xl border border-slate-100/60 active:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/taxi/driver/ride/detail/${item.id}`)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'parcel' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-700'}`}>
                                        {item.type === 'parcel' ? <Package size={18} strokeWidth={2} /> : <Bike size={18} strokeWidth={2} />}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4 className="text-[14px] font-medium text-slate-900 truncate pr-2 capitalize">{item.title.toLowerCase()}</h4>
                                            <span className="text-[14px] font-semibold text-emerald-600 shrink-0">{item.price}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mb-2">{item.date}</p>
                                        
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                            <span className="truncate max-w-[42%]">{item.from}</span>
                                            <span className="text-slate-300 shrink-0">→</span>
                                            <span className="truncate max-w-[42%]">{item.to}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                     </AnimatePresence>
                 )}
            </div>
            
            <DriverBottomNav />
        </div>
    );
};

export default RideRequests;
