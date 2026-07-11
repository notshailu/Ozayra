import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    clearDriverRegistrationSession,
    saveDriverRegistrationSession,
    sendDriverLoginOtp,
    sendDriverOtp,
} from '../../services/registrationService';

import { useSettings } from '../../../../shared/context/SettingsContext';

const PhoneRegistration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { settings } = useSettings();
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('driver');
    const [agreed, setAgreed] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isLoginPage = location.pathname === '/taxi/driver/login';
    const appName = settings.general?.app_name || 'App';

    useEffect(() => {
        clearDriverRegistrationSession();
    }, []);

    const handleSendOTP = async () => {
        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (!agreed) {
            setError('Please accept the terms before continuing');
            return;
        }

        setLoading(true);
        setError('');

        try {
            clearDriverRegistrationSession();
            const response = isLoginPage
                ? await sendDriverLoginOtp({ phone })
                : await sendDriverOtp({ phone, role });
            const session = response?.data?.session || {};
            const nextState = saveDriverRegistrationSession({
                phone,
                role,
                registrationId: session.registrationId || '',
                debugOtp: session.debugOtp || '',
                loginMode: isLoginPage,
            });

            navigate('/taxi/driver/otp-verify', {
                state: nextState,
            });
        } catch (err) {
            const errMsg = err?.message || 'Unable to send OTP right now';
            if (isLoginPage && String(errMsg).toLowerCase().includes('not found')) {
                setError('Driver account not found. Redirecting to registration...');
                setTimeout(() => {
                    navigate('/taxi/driver/welcome');
                }, 1800);
            } else {
                setError(errMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen font-sans p-6 pt-12 select-none flex flex-col justify-between relative overflow-hidden"
            style={{
                backgroundImage: 'url(/image.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-between relative z-10">
                
                {/* Header back button */}
                <header className="mb-6">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-600 border border-slate-200/60 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-sm"
                    >
                        <ArrowLeft size={16} strokeWidth={2.5} />
                    </button>
                </header>

                {/* Content Box */}
                <div className="flex-1 flex flex-col justify-center py-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center block mb-3 drop-shadow-sm">
                        Driver Portal
                    </span>

                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950 drop-shadow-md">
                            {isLoginPage ? 'Welcome back' : `Join ${appName}`}
                        </h1>
                        <p className="text-sm font-bold text-slate-700 mt-2 max-w-xs mx-auto leading-relaxed drop-shadow-sm">
                            {isLoginPage ? 'Enter your registered mobile number to receive an OTP and securely login.' : "Let's verify your mobile number to get started on your journey."}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="space-y-5"
                    >
                        {/* Elegant Minimal Input Field */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest ml-1 drop-shadow-sm">
                                Mobile Number
                            </label>
                            <div className="flex items-center bg-white/90 backdrop-blur-md border border-slate-200/50 rounded-2xl px-4 py-3.5 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all duration-200 shadow-xl">
                                <span className="text-base font-bold text-slate-400 mr-3 pr-3 border-r border-slate-100">+91</span>
                                <input 
                                    type="tel" 
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="90000 00000"
                                    className="bg-transparent border-none p-0 text-base font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300 w-full tracking-wider"
                                />
                            </div>
                        </div>

                        {/* Minimal Agreement Checkbox */}
                        <div className="flex items-start gap-3 px-1">
                            <button
                                type="button"
                                onClick={() => setAgreed(!agreed)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    agreed ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'border-slate-400 hover:border-slate-600 bg-white/80'
                                }`}
                            >
                                {agreed && <Check size={11} strokeWidth={3} />}
                            </button>
                            <label onClick={() => setAgreed(!agreed)} className="text-xs font-bold text-slate-800 leading-relaxed cursor-pointer select-none drop-shadow-sm">
                                I agree to the <span className="text-slate-950 underline font-black">Terms</span> and <span className="text-slate-950 underline font-black">Privacy Policy</span>.
                            </label>
                        </div>

                        {/* Error Handling */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs font-semibold text-slate-500 text-center py-1"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* Primary Button */}
                        <button 
                            onClick={handleSendOTP}
                            disabled={loading || !agreed || phone.length !== 10}
                            className={`w-full h-13 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                                agreed && phone.length === 10 
                                    ? 'bg-slate-900 text-white hover:bg-slate-950 active:scale-[0.99] shadow-xl shadow-slate-900/20' 
                                    : 'bg-white/60 text-slate-400 border border-slate-200/50 backdrop-blur-sm pointer-events-none'
                            }`}
                        >
                            {loading ? 'Sending OTP...' : 'Continue'}  
                            {!loading && <ArrowRight size={16} strokeWidth={2.5} />}
                        </button>
                    </motion.div>
                </div>

                {/* Footer Switch Options */}
                <footer className="mt-6 space-y-4">
                    <div className="flex flex-col items-center gap-3">

                        {!isLoginPage && (
                            <button
                                onClick={() => navigate('/taxi/driver/login')}
                                className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-all"
                            >
                                Already have an account? <span className="text-slate-950 font-black ml-1">Login Here</span>
                            </button>
                        )}

                        {isLoginPage && (
                            <button
                                onClick={() => navigate('/taxi/driver/welcome')}
                                className="text-xs font-bold text-slate-700 hover:text-slate-950 transition-all drop-shadow-sm"
                            >
                                New here? <span className="text-slate-950 font-black ml-1">Create an Account</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-slate-700 pt-4 border-t border-slate-400/30">
                        <ShieldCheck size={13} strokeWidth={2.5} />
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">End-to-End Encrypted</span>
                    </div>
                </footer>

            </div>
        </div>
    );
};

export default PhoneRegistration;
