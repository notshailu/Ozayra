import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Wallet, Clock, Star, Quote, Award } from 'lucide-react';
import { useSettings } from '../../../../shared/context/SettingsContext';

const DriverHero = '/cabdriver.png';

const DriverWelcome = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings.general?.app_name || 'App';

    const perks = [
        { 
            icon: <Wallet size={20} />, 
            title: 'Weekly Payouts', 
            sub: 'Instant earnings transfer',
            theme: {
                bg: 'bg-amber-50 text-amber-600 border-amber-100/50',
                hover: 'hover:border-amber-200 hover:shadow-amber-100/30'
            }
        },
        { 
            icon: <Clock size={20} />, 
            title: 'Set Your Schedule', 
            sub: 'Ultimate work-life balance',
            theme: {
                bg: 'bg-blue-50 text-blue-600 border-blue-100/50',
                hover: 'hover:border-blue-200 hover:shadow-blue-100/30'
            }
        },
        { 
            icon: <ShieldCheck size={20} />, 
            title: 'Premium Support', 
            sub: '24/7 dedicated assistance',
            theme: {
                bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/50',
                hover: 'hover:border-emerald-200 hover:shadow-emerald-100/30'
            }
        },
        { 
            icon: <Award size={20} />, 
            title: 'Growth Incentives', 
            sub: 'High performance rewards',
            theme: {
                bg: 'bg-violet-50 text-violet-600 border-violet-100/50',
                hover: 'hover:border-violet-200 hover:shadow-violet-100/30'
            }
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F8F9FA] via-[#FFFFFF] to-[#F3F4F6] font-sans select-none overflow-x-hidden pb-10">
            {/* Clear-Cut Full Image Container (using 1:1 aspect ratio to show entire graphic/text) */}
            <div className="px-5 pt-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-lg border border-slate-200/60 bg-slate-900"
                >
                    <img 
                        src={DriverHero} 
                        alt="300+ Drivers already earning more" 
                        className="w-full h-full object-contain"
                    />
                </motion.div>
            </div>

            {/* Title Greeting Section */}
            <div className="px-5 pt-6 space-y-1">
                <h1 className="text-2xl font-display font-black leading-tight tracking-tight text-slate-900">
                    Partner with <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{appName}</span>
                </h1>
                <p className="text-[13px] font-semibold text-slate-500">
                    The smartest way to drive, manage, and earn.
                </p>
            </div>

            {/* Content Section */}
            <main className="px-5 pt-6 pb-32">
                <div className="space-y-6">
                    {/* Why Choose Header */}
                    <div className="flex items-center justify-between px-1">
                        <div className="space-y-0.5">
                            <h3 className="text-[12px] font-black text-slate-400 tracking-widest uppercase">
                                Why Choose {appName}?
                            </h3>
                            <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Onboarding live in your area
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2.5">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                         <img src={`https://i.pravatar.cc/100?img=${i+42}`} alt="driver" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                <div className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-primary to-primary/80 text-[8px] flex items-center justify-center text-white font-black shadow-sm">
                                    +10k
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Perks List */}
                    <div className="grid grid-cols-1 gap-4">
                        {perks.map((perk, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 * index }}
                                whileHover={{ scale: 1.015, y: -2 }}
                                whileTap={{ scale: 0.99 }}
                                className={`flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all duration-300 ${perk.theme.hover}`}
                            >
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${perk.theme.bg}`}>
                                    {perk.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-display font-bold text-slate-800 leading-tight">{perk.title}</h4>
                                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">{perk.sub}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-300" />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Premium Testimonial Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-8 bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/15 rounded-2xl p-5 border border-slate-100 relative shadow-sm"
                >
                    <div className="absolute top-4 right-4 text-indigo-500/5 pointer-events-none">
                       <Quote size={56} fill="currentColor" />
                    </div>
                    <div className="flex items-center gap-3.5 mb-3.5">
                        <div className="w-11 h-11 rounded-full bg-slate-200 border-2 border-white shadow-md overflow-hidden">
                            <img src="https://i.pravatar.cc/100?img=12" alt="Rahul" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h5 className="text-[13px] font-display font-black text-slate-800">Rahul Shinde</h5>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                    Active Partner
                                </span>
                            </div>
                            <div className="flex gap-0.5 text-amber-400 mt-0.5">
                                {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
                            </div>
                        </div>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-500 italic leading-relaxed">
                        "Joining {appName} was the best decision for my family. The payouts are always on time and the support team is incredible."
                    </p>
                </motion.div>
            </main>

            {/* Sticky Floating Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white/95 to-transparent z-50">
                <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/taxi/driver/lang-select')}
                    className="w-full bg-gradient-to-r from-primary via-primary/95 to-primary h-14 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-display font-black text-white shadow-[0_8px_24px_rgba(239,68,68,0.2)] active:scale-95 transition-all"
                    style={{
                        boxShadow: `0 8px 24px rgba(var(--primary-rgb, 239, 68, 68), 0.25)`
                    }}
                >
                    Get Started Now <ChevronRight size={16} className="mt-0.5" />
                </motion.button>
            </div>
        </div>
    );
};

export default DriverWelcome;
