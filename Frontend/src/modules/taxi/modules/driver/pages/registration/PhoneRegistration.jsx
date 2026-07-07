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
        <div className="min-h-screen bg-slate-50 font-sans p-6 pt-12 select-none flex flex-col justify-between text-slate-900 relative overflow-hidden">
            {/* Soft background ambient glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-slate-200/40 blur-[80px] pointer-events-none" />

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
                    
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center block mb-3">
                        {role === 'owner' ? 'Owner Portal' : 'Driver Portal'}
                    </span>

                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            {isLoginPage ? 'Welcome back' : `Join ${appName}`}
                        </h1>
                        <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                Mobile Number
                            </label>
                            <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3.5 focus-within:border-slate-800 transition-all duration-200 shadow-sm">
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
                                    agreed ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 hover:border-slate-450 bg-white'
                                }`}
                            >
                                {agreed && <Check size={11} strokeWidth={3} />}
                            </button>
                            <label onClick={() => setAgreed(!agreed)} className="text-xs font-semibold text-slate-400 leading-relaxed cursor-pointer select-none">
                                I agree to the <span className="text-slate-700 underline font-bold">Terms</span> and <span className="text-slate-700 underline font-bold">Privacy Policy</span>.
                            </label>
                        </div>

                        {/* Error Handling */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Primary Button */}
                        <button 
                            onClick={handleSendOTP}
                            disabled={loading || !agreed || phone.length !== 10}
                            className={`w-full h-13 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                                agreed && phone.length === 10 
                                    ? 'bg-slate-900 text-white hover:bg-slate-950 active:scale-[0.99] shadow-md shadow-slate-950/5' 
                                    : 'bg-slate-200/70 text-slate-400 pointer-events-none'
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
                        <button 
                            onClick={() => setRole(role === 'driver' ? 'owner' : 'driver')}
                            className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-all"
                        >
                            {isLoginPage ? (
                                <>Switch to <span className="text-indigo-600 font-extrabold">{role === 'driver' ? 'Owner Portal' : 'Driver Portal'}</span></>
                            ) : (
                                <>Register as <span className="text-indigo-600 font-extrabold">{role === 'driver' ? 'Owner' : 'Driver'}</span></>
                            )}
                        </button>

                        {!isLoginPage && (
                            <button
                                onClick={() => navigate('/taxi/driver/login')}
                                className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-all"
                            >
                                Already have an account? <span className="text-slate-900 font-extrabold ml-1">Login Here</span>
                            </button>
                        )}

                        {isLoginPage && (
                            <button
                                onClick={() => navigate('/taxi/driver/welcome')}
                                className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-all"
                            >
                                New here? <span className="text-slate-900 font-extrabold ml-1">Create an Account</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-slate-400/60 pt-4 border-t border-slate-200/40">
                        <ShieldCheck size={13} strokeWidth={2.5} />
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">End-to-End Encrypted</span>
                    </div>
                </footer>

            </div>
        </div>
    );
};

export default PhoneRegistration;
