import React, { useEffect, useState } from 'react';
import { ArrowLeft, Phone, ArrowRight, ShieldCheck, Check } from 'lucide-react';
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
            setError(err?.message || 'Unable to send OTP right now');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-6 pt-10 select-none flex flex-col relative overflow-hidden justify-between text-slate-900">
            {/* Elegant Background Gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

            <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between relative z-10">
                
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-11 h-11 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-700 border border-slate-100 hover:bg-slate-50 hover:border-slate-200 active:scale-95 transition-all shadow-sm"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        {role === 'owner' ? 'Owner Portal' : 'Driver Portal'}
                    </span>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-2 mb-8 text-center"
                    >
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                            {isLoginPage ? 'Welcome back' : `Join ${appName}`}
                        </h1>
                        <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
                            {isLoginPage ? 'Enter your registered mobile number to receive an OTP and securely login.' : "Let's verify your mobile number to get started on your journey."}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Premium Input Design */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Mobile Number
                            </label>
                            <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-3.5 transition-all duration-300 hover:border-slate-300 focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/5 shadow-sm">
                                <span className="text-base font-bold text-slate-400 mr-3 border-r border-slate-100 pr-3">+91</span>
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

                        {/* Custom Animated Checkbox */}
                        <div className="flex items-start gap-3 px-1">
                            <button
                                type="button"
                                onClick={() => setAgreed(!agreed)}
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    agreed ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                            >
                                {agreed && <Check size={12} strokeWidth={3} />}
                            </button>
                            <label onClick={() => setAgreed(!agreed)} className="text-xs font-semibold text-slate-500 leading-relaxed cursor-pointer select-none">
                                I agree to the <span className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 transition-all font-bold">Terms</span> and <span className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-900 transition-all font-bold">Privacy Policy</span>.
                            </label>
                        </div>

                        {/* Animated Error Box */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Continue Button */}
                        <button 
                            onClick={handleSendOTP}
                            disabled={loading || !agreed || phone.length !== 10}
                            className={`w-full h-13 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all relative ${
                                agreed && phone.length === 10 
                                    ? 'bg-slate-900 text-white hover:bg-slate-950 active:scale-[0.99] shadow-lg shadow-slate-900/10' 
                                    : 'bg-slate-200 text-slate-400 pointer-events-none'
                            }`}
                        >
                            {loading ? 'Sending OTP...' : 'Continue'}  
                            {!loading && <ArrowRight size={16} strokeWidth={2.5} />}
                        </button>
                    </motion.div>
                </div>

                {/* Footer Switch Options */}
                <footer className="mt-8 space-y-6">
                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200/60"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-3 bg-slate-50 text-slate-400 font-medium">or</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                        <button 
                            onClick={() => setRole(role === 'driver' ? 'owner' : 'driver')}
                            className="w-full h-12 rounded-xl flex items-center justify-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
                        >
                            {isLoginPage ? (
                                <>Switch to <span className="text-indigo-600 ml-1">{role === 'driver' ? 'Owner Portal' : 'Driver Portal'}</span></>
                            ) : (
                                <>Register as <span className="text-indigo-600 ml-1">{role === 'driver' ? 'Owner' : 'Driver'}</span></>
                            )}
                        </button>

                        {!isLoginPage && (
                            <button
                                onClick={() => navigate('/taxi/driver/login')}
                                className="w-full h-12 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-all"
                            >
                                Already have an account? <span className="text-slate-900 font-bold ml-1">Login Here</span>
                            </button>
                        )}

                        {isLoginPage && (
                            <button
                                onClick={() => navigate('/taxi/driver/welcome')}
                                className="w-full h-12 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-all"
                            >
                                New here? <span className="text-slate-900 font-bold ml-1">Create an Account</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-slate-400/80 pt-2">
                        <ShieldCheck size={14} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">End-to-End Encrypted</span>
                    </div>
                </footer>

            </div>
        </div>
    );
};

export default PhoneRegistration;
