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
    const [rememberMe, setRememberMe] = useState(true);
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

        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
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
                try {
                    const regResponse = await sendDriverOtp({ phone, role });
                    const regSession = regResponse?.data?.session || {};
                    const nextState = saveDriverRegistrationSession({
                        phone,
                        role,
                        registrationId: regSession.registrationId || '',
                        debugOtp: regSession.debugOtp || '',
                        loginMode: false,
                    });
                    navigate('/taxi/driver/otp-verify', {
                        state: nextState,
                    });
                } catch (regErr) {
                    setError(regErr?.message || 'Unable to start registration');
                }
            } else {
                setError(errMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen font-sans flex flex-col items-center justify-between p-6 relative overflow-hidden bg-white"
        >
            <div className="w-full max-w-sm flex-1 flex flex-col pt-12 relative z-10">
                
                {/* Logo & Badge Area */}
                <div className="flex flex-col items-center mb-10">
                    <h1 className="text-[46px] font-black text-black tracking-tighter leading-none mb-4">
                        Ozayra
                    </h1>
                    <div className="bg-black text-white text-sm font-black px-6 py-2 rounded-md uppercase tracking-widest shadow-md">
                        RIDER
                    </div>
                </div>

                {/* Headings */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-black mb-2">
                        Sign in to your account
                    </h2>
                    <p className="text-[15px] text-slate-800 font-medium">
                        Login or create an account
                    </p>
                </div>

                {/* Input Section */}
                <div className="mb-6">
                    <div className="flex gap-2 mb-2">
                        {/* Country Code Dropdown */}
                        <div className="flex items-center gap-1.5 px-3 py-3 border border-slate-300 rounded-lg bg-white">
                            <span className="text-[11px] font-bold text-slate-700 uppercase">IN</span>
                            <span className="text-sm font-semibold text-black">+91</span>
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>

                        {/* Phone Input */}
                        <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:border-black transition-colors">
                            <input
                                type="tel"
                                maxLength={10}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                placeholder="Enter mobile number"
                                className="w-full h-full px-4 py-3 text-sm font-medium text-black placeholder:text-slate-400 focus:outline-none"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-800 font-medium ml-1">
                        Enter a valid 10 digit mobile number
                    </p>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-3 ml-1 mb-8">
                    <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`w-[18px] h-[18px] rounded flex items-center justify-center transition-all ${
                            rememberMe ? 'bg-black border-black text-white' : 'border border-slate-300 bg-white'
                        }`}
                    >
                        {rememberMe && <Check size={12} strokeWidth={4} />}
                    </button>
                    <label 
                        onClick={() => setRememberMe(!rememberMe)} 
                        className="text-[13px] text-slate-700 font-medium cursor-pointer select-none"
                    >
                        Remember my login for faster sign-in
                    </label>
                </div>

                {/* Error Handling */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-xs font-semibold text-red-500 text-center mb-4"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

            </div>

            {/* Bottom Actions Area */}
            <div className="w-full max-w-sm pb-4 relative z-10">
                <button 
                    onClick={handleSendOTP}
                    disabled={loading || phone.length !== 10}
                    className={`w-full h-[50px] rounded-xl flex items-center justify-center text-[15px] font-bold transition-all mb-5 ${
                        phone.length === 10 
                            ? 'bg-black text-white hover:bg-slate-900 active:scale-[0.99] shadow-md' 
                            : 'bg-slate-200/80 text-slate-500 pointer-events-none'
                    }`}
                >
                    {loading ? 'Sending OTP...' : 'Continue'}  
                </button>

                <p className="text-center text-[11px] font-medium text-slate-800">
                    By continuing, you agree to our{' '}
                    <span className="text-blue-800 font-semibold cursor-pointer hover:underline">
                        Terms and Conditions
                    </span>
                </p>
            </div>
        </div>
    );
};

export default PhoneRegistration;
