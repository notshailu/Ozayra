import React, { useEffect, useState } from 'react';
import { ArrowLeft, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans p-5 pt-8 select-none flex flex-col relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-50 blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-50 blur-3xl opacity-50 pointer-events-none"></div>

            <header className="mb-8 relative z-10">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:shadow active:scale-95 transition-all"
                >
                    <ArrowLeft size={20} strokeWidth={2} />
                </button>
            </header>

            <main className="flex-1 flex flex-col max-w-sm mx-auto w-full relative z-10">
                <div className="space-y-3 mb-10">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        {isLoginPage ? 'Welcome back' : `Join ${appName}`}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        {isLoginPage ? 'Enter your registered mobile number to receive an OTP and securely login.' : "Let's verify your mobile number to get started on your journey."}
                    </p>
                    {/* Show Role Badge */}
                    <div className="inline-block mt-3 px-3 py-1 bg-white border border-slate-200 shadow-sm text-slate-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        {role === 'owner' ? 'Owner Portal' : 'Driver Portal'}
                    </div>
                </div>

                <div className="space-y-6 flex-1">
                    {/* Input Group */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mobile Number</label>
                        <div className="group flex items-center bg-white border-2 border-slate-100 rounded-2xl p-2 transition-all focus-within:border-blue-500 focus-within:shadow-md focus-within:shadow-blue-500/10">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-focus-within:text-blue-500 group-focus-within:bg-blue-50 transition-colors">
                                <Phone size={20} strokeWidth={2} />
                            </div>
                            <div className="flex items-center flex-1 ml-3">
                                <span className="text-base font-semibold text-slate-500 mr-2">+91</span>
                                <input 
                                    type="tel" 
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="90000 00000"
                                    className="bg-transparent border-none p-0 text-lg font-bold text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-300 w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 px-1">
                        <div className="relative flex items-start pt-0.5">
                            <input 
                                type="checkbox" 
                                id="terms"
                                checked={agreed}
                                onChange={() => setAgreed(!agreed)}
                                className="peer sr-only"
                            />
                            <div className="w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors flex items-center justify-center cursor-pointer" onClick={() => setAgreed(!agreed)}>
                                <svg className={`w-3 h-3 text-white pointer-events-none transition-transform ${agreed ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                        <label htmlFor="terms" className="text-xs font-medium text-slate-500 leading-relaxed cursor-pointer select-none">
                            I agree to the <span className="text-blue-600 hover:text-blue-700 font-bold underline decoration-blue-600/30 underline-offset-2">Terms</span> and <span className="text-blue-600 hover:text-blue-700 font-bold underline decoration-blue-600/30 underline-offset-2">Privacy Policy</span>.
                        </label>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="pt-4 space-y-5">
                        <button 
                            onClick={handleSendOTP}
                            disabled={loading || !agreed || phone.length !== 10}
                            className={`relative overflow-hidden w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                                agreed && phone.length === 10 ? 'bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0' : 'bg-slate-200 text-slate-400 pointer-events-none'
                            }`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? 'Sending OTP...' : 'Continue'}  <ArrowRight size={18} strokeWidth={2.5} />
                            </span>
                            {loading && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                        </button>

                        <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-slate-50 text-slate-400 font-medium">or</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={() => setRole(role === 'driver' ? 'owner' : 'driver')}
                                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                            >
                                {isLoginPage ? (
                                    <>Switch to <span className="text-blue-600">{role === 'driver' ? 'Owner Portal' : 'Driver Portal'}</span></>
                                ) : (
                                    <>Register as <span className="text-blue-600">{role === 'driver' ? 'Owner' : 'Driver'}</span></>
                                )}
                            </button>

                            {!isLoginPage && (
                                <button
                                    onClick={() => navigate('/taxi/driver/login')}
                                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Already have an account? <span className="text-slate-900">Login Here</span>
                                </button>
                            )}

                            {isLoginPage && (
                                <button
                                    onClick={() => navigate('/taxi/driver/welcome')}
                                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    New here? <span className="text-slate-900">Create an Account</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 mb-4 flex items-center justify-center gap-2 text-slate-400">
                    <ShieldCheck size={16} strokeWidth={2} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encrypted</p>
                </div>
            </main>
        </div>
    );
};

export default PhoneRegistration;
