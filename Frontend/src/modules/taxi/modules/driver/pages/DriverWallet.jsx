import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    CheckCircle2,
    History,
    RefreshCw,
    ShieldAlert,
    Wallet,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DriverBottomNav from '../../shared/components/DriverBottomNav';
import api from '../../../shared/api/axiosInstance';
import { socketService } from '../../../shared/api/socket';

const formatMoney = (value) => {
    const amount = Number(value || 0);
    const sign = amount < 0 ? '-' : '';
    return `${sign}Rs ${Math.abs(amount).toFixed(2)}`;
};

const toNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const isEnabled = (value, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const formatTransactionType = (type = '') => {
    const labels = {
        ride_earning: 'Ride earning',
        commission_deduction: 'Cash ride commission',
        top_up: 'Wallet top-up',
        adjustment: 'Wallet adjustment',
        withdrawal_request: 'Withdrawal request',
        payout: 'Payout transfer',
    };

    return labels[type] || String(type || 'Wallet activity').replace(/_/g, ' ');
};

const formatDateTime = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Just now';

    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const normalizeWalletResponse = (payload) => {
    const data = payload?.data || payload || {};
    return {
        wallet: data.wallet || { balance: 0, cashLimit: 0, minimumBalanceForOrders: 0, availableForOrders: 0, isBlocked: false },
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        withdrawals: Array.isArray(data.withdrawals) ? data.withdrawals : [],
        settings: data.settings || {},
    };
};

const RuleCard = ({ label, value, help }) => (
    <div className="rounded-2xl border border-slate-100/60 bg-white p-4">
        <p className="text-[12px] font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-[16px] font-semibold text-slate-900">{value}</p>
        {help && <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">{help}</p>}
    </div>
);

const DriverWallet = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('Weekly');
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('500');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [wallet, setWallet] = useState({ balance: 0, cashLimit: 0, minimumBalanceForOrders: 0, availableForOrders: 0, isBlocked: false });
    const [transactions, setTransactions] = useState([]);
    const [walletError, setWalletError] = useState('');
    const [walletSettings, setWalletSettings] = useState({});
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('500');
    const [withdrawMethod, setWithdrawMethod] = useState('UPI');
    const [upiId, setUpiId] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [withdrawError, setWithdrawError] = useState('');
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [withdrawals, setWithdrawals] = useState([]);

    const loadWallet = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) setIsRefreshing(true);
        setWalletError('');

        try {
            const response = await api.get('/drivers/wallet');
            const next = normalizeWalletResponse(response);
            setWallet(next.wallet);
            setTransactions(next.transactions);
            if (next.withdrawals) setWithdrawals(next.withdrawals);
            setWalletSettings(next.settings);
        } catch (error) {
            setWalletError(error?.message || 'Could not load wallet.');
        } finally {
            if (!quiet) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadWallet({ quiet: true });

        const socket = socketService.connect({ role: 'driver' });
        const onWalletUpdated = (payload) => {
            if (payload?.wallet) {
                setWallet(payload.wallet);
            }
            if (payload?.transaction) {
                setTransactions((prev) => [payload.transaction, ...prev.filter((tx) => tx._id !== payload.transaction._id)].slice(0, 50));
            }
            if (payload?.withdrawal) {
                setWithdrawals((prev) => [payload.withdrawal, ...prev.filter((w) => w._id !== payload.withdrawal._id)]);
            }
        };

        if (socket) {
            socketService.on('driver:wallet:updated', onWalletUpdated);
        }

        return () => {
            socketService.off('driver:wallet:updated', onWalletUpdated);
        };
    }, [loadWallet]);

    const walletRules = useMemo(() => {
        const minimumBalanceForOrders = toNumber(
            wallet.minimumBalanceForOrders,
            toNumber(walletSettings.driver_wallet_minimum_amount_to_get_an_order, 0),
        );
        const availableForOrders = toNumber(wallet.availableForOrders, toNumber(wallet.balance) - minimumBalanceForOrders);
        const minimumTopUpAmount = toNumber(wallet.minimumTopUpAmount, toNumber(walletSettings.minimum_amount_added_to_wallet, 0));
        const minimumTransferAmount = toNumber(wallet.minimumTransferAmount, toNumber(walletSettings.minimum_wallet_amount_for_transfer, 0));
        const walletEnabled = wallet.isWalletEnabled ?? isEnabled(walletSettings.show_wallet_feature_for_driver, true);
        const transferEnabled = wallet.isTransferEnabled ?? isEnabled(walletSettings.enable_wallet_transfer_driver, true);
        const canReceiveOrders = walletEnabled && !wallet.isBlocked && availableForOrders >= 0;

        return {
            minimumBalanceForOrders,
            availableForOrders,
            minimumTopUpAmount,
            minimumTransferAmount,
            walletEnabled,
            transferEnabled,
            canReceiveOrders,
        };
    }, [wallet, walletSettings]);

    const filteredTransactions = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (period === 'Weekly' ? 7 : 30));

        return transactions.filter((tx) => {
            if (tx.type === 'commission_deduction') return false;
            const createdAt = tx.createdAt ? new Date(tx.createdAt) : null;
            return !createdAt || Number.isNaN(createdAt.getTime()) || createdAt >= cutoff;
        });
    }, [period, transactions]);

    const quickAmounts = useMemo(() => {
        const minimum = Math.max(walletRules.minimumTopUpAmount, 100);
        return [minimum, minimum * 2, minimum * 5].map((amount) => String(Math.round(amount)));
    }, [walletRules.minimumTopUpAmount]);

    const loadRazorpaySDK = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleTopUp = async () => {
        const amount = Number(topUpAmount);
        if (!walletRules.walletEnabled) {
            setWalletError('Wallet is disabled by admin.');
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setWalletError('Enter a valid top-up amount.');
            return;
        }
        if (walletRules.minimumTopUpAmount > 0 && amount < walletRules.minimumTopUpAmount) {
            setWalletError(`Minimum top-up amount is ${formatMoney(walletRules.minimumTopUpAmount)}.`);
            return;
        }

        setIsProcessing(true);
        setWalletError('');

        try {
            const isSdkLoaded = await loadRazorpaySDK();
            if (!isSdkLoaded) {
                throw new Error('Could not load payment gateway. Please check your connection.');
            }

            const response = await api.post('/drivers/wallet/razorpay/order', { amount });
            const { keyId, orderId, currency, amount: orderAmount } = response?.data || response;

            if (!orderId || !keyId) {
                throw new Error('Failed to initialize payment.');
            }

            const options = {
                key: keyId,
                amount: orderAmount,
                currency: currency || 'INR',
                name: 'Wallet Top-up',
                description: 'Driver Wallet',
                order_id: orderId,
                handler: async (verifyResponse) => {
                    try {
                        const verifyRes = await api.post('/drivers/wallet/razorpay/verify', verifyResponse);
                        const data = verifyRes?.data || verifyRes || {};
                        if (data.wallet) setWallet(data.wallet);
                        if (data.transaction) {
                            setTransactions((prev) => [data.transaction, ...prev.filter((tx) => tx._id !== data.transaction._id)].slice(0, 50));
                        }
                        setIsSuccess(true);
                        setTimeout(() => {
                            setIsSuccess(false);
                            setShowTopUp(false);
                            setIsProcessing(false);
                        }, 1400);
                    } catch (verifyError) {
                        setWalletError(verifyError?.message || 'Payment verification failed.');
                        setIsProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                    }
                },
                theme: {
                    color: '#059669' // emerald-600
                }
            };

            const razorpayInstance = new window.Razorpay(options);
            razorpayInstance.on('payment.failed', (res) => {
                setWalletError(res?.error?.description || 'Payment failed.');
                setIsProcessing(false);
            });
            razorpayInstance.open();

        } catch (error) {
            setWalletError(error?.message || 'Top-up failed.');
            setIsProcessing(false);
        }
    };

    const handleWithdraw = async () => {
        const amount = Number(withdrawAmount);
        if (!walletRules.transferEnabled) {
            setWithdrawError('Transfer/Withdrawal is disabled by admin.');
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setWithdrawError('Enter a valid withdrawal amount.');
            return;
        }
        if (walletRules.minimumTransferAmount > 0 && amount < walletRules.minimumTransferAmount) {
            setWithdrawError(`Minimum withdrawal amount is ${formatMoney(walletRules.minimumTransferAmount)}.`);
            return;
        }
        if (amount > Number(wallet.balance || 0)) {
            setWithdrawError(`Insufficient balance. Maximum available is ${formatMoney(wallet.balance)}.`);
            return;
        }
        if (withdrawMethod === 'UPI' && !upiId.trim()) {
            setWithdrawError('Please enter your UPI ID.');
            return;
        }
        if (withdrawMethod === 'Bank Transfer' && (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim())) {
            setWithdrawError('Please fill all required bank details.');
            return;
        }

        setIsProcessing(true);
        setWithdrawError('');

        try {
            const response = await api.post('/drivers/wallet/withdraw', {
                amount,
                paymentMethod: withdrawMethod,
                upiId: upiId.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim(),
                bankName: bankName.trim(),
                accountHolderName: accountHolderName.trim(),
            });
            const next = normalizeWalletResponse(response);
            if (next.wallet) setWallet(next.wallet);
            if (response?.data?.withdrawal) {
                setWithdrawals((prev) => [response.data.withdrawal, ...prev]);
            }
            setIsProcessing(false);
            setWithdrawSuccess(true);
            setTimeout(() => {
                setShowWithdraw(false);
                setWithdrawSuccess(false);
                setWithdrawAmount('500');
            }, 1800);
            loadWallet({ quiet: true });
        } catch (error) {
            setWithdrawError(error?.message || 'Withdrawal request failed.');
            setIsProcessing(false);
        }
    };

    const statusText = walletRules.walletEnabled
        ? walletRules.canReceiveOrders
            ? 'Ready for orders'
            : 'Top up to receive orders'
        : 'Wallet disabled by admin';

    return (
        <div className="min-h-screen bg-[#F6F4EF] px-4 pb-28 pt-5 font-sans text-slate-950">
            <AnimatePresence>
                {showTopUp && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full rounded-t-[2rem] bg-white p-5 pb-8 shadow-2xl"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-950">Top up wallet</h3>
                                    <p className="text-xs font-bold text-slate-500">Minimum: {formatMoney(walletRules.minimumTopUpAmount)}</p>
                                </div>
                                <button onClick={() => setShowTopUp(false)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>

                            {isSuccess ? (
                                <div className="grid place-items-center py-10 text-center">
                                    <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={38} strokeWidth={3} />
                                    </div>
                                    <p className="mt-4 text-lg font-black">Wallet updated</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">Your order eligibility refreshed instantly.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</p>
                                        <input
                                            type="number"
                                            min="1"
                                            value={topUpAmount}
                                            onChange={(event) => setTopUpAmount(event.target.value)}
                                            className="mt-2 w-full bg-transparent text-center text-4xl font-black text-slate-950 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {quickAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setTopUpAmount(amount)}
                                                className="rounded-2xl border border-slate-100 bg-white py-3 text-sm font-black text-slate-700 shadow-sm"
                                            >
                                                {formatMoney(amount)}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleTopUp}
                                        disabled={isProcessing || !walletRules.walletEnabled}
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white disabled:bg-slate-200 disabled:text-slate-400"
                                    >
                                        {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : 'Add money'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {showWithdraw && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full max-h-[90vh] overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-8 shadow-2xl"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-950">Withdraw money</h3>
                                    <p className="text-xs font-bold text-slate-500">Available: {formatMoney(wallet.balance)} (Min: {formatMoney(walletRules.minimumTransferAmount)})</p>
                                </div>
                                <button onClick={() => setShowWithdraw(false)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>

                            {withdrawSuccess ? (
                                <div className="grid place-items-center py-10 text-center">
                                    <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={38} strokeWidth={3} />
                                    </div>
                                    <p className="mt-4 text-lg font-black">Withdrawal Requested</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">Your payout request has been sent to admin for transfer.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {withdrawError && (
                                        <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-center text-xs font-bold text-rose-600">
                                            {withdrawError}
                                        </p>
                                    )}

                                    <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                                        {['UPI', 'Bank Transfer'].map((method) => (
                                            <button
                                                key={method}
                                                onClick={() => {
                                                    setWithdrawMethod(method);
                                                    setWithdrawError('');
                                                }}
                                                className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all ${withdrawMethod === method ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>

                                    {withdrawMethod === 'UPI' ? (
                                        <div>
                                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">UPI ID / VPA</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. driver@oksbi"
                                                value={upiId}
                                                onChange={(e) => setUpiId(e.target.value)}
                                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Account Holder Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Full Name as on bank account"
                                                    value={accountHolderName}
                                                    onChange={(e) => setAccountHolderName(e.target.value)}
                                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Account Number</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Account No."
                                                        value={accountNumber}
                                                        onChange={(e) => setAccountNumber(e.target.value)}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">IFSC Code</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. SBIN0001234"
                                                        value={ifscCode}
                                                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white uppercase"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Bank Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. State Bank of India"
                                                    value={bankName}
                                                    onChange={(e) => setBankName(e.target.value)}
                                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Withdraw Amount</p>
                                        <input
                                            type="number"
                                            min="1"
                                            max={wallet.balance || 0}
                                            value={withdrawAmount}
                                            onChange={(event) => setWithdrawAmount(event.target.value)}
                                            className="mt-1 w-full bg-transparent text-center text-3xl font-black text-slate-950 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[100, 500, 1000, Math.floor(Number(wallet.balance || 0))].filter((val, idx, arr) => val > 0 && arr.indexOf(val) === idx).map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setWithdrawAmount(String(amount))}
                                                className="rounded-xl border border-slate-100 bg-white py-2.5 text-xs font-black text-slate-700 shadow-sm"
                                            >
                                                {amount === Math.floor(Number(wallet.balance || 0)) ? 'Max' : formatMoney(amount)}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleWithdraw}
                                        disabled={isProcessing}
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white disabled:bg-slate-200 disabled:text-slate-400"
                                    >
                                        {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : 'Submit Payout Request'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <header className="mb-5 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <ArrowLeft size={19} strokeWidth={2.5} />
                </button>
                <div className="text-center">
                    <h1 className="text-[17px] font-semibold tracking-tight text-slate-900">Wallet</h1>
                    <p className="text-[11px] font-medium text-slate-400">Admin controlled</p>
                </div>
                <button onClick={() => loadWallet()} disabled={isRefreshing} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
                </button>
            </header>

            <main className="space-y-4">
                <section className="overflow-hidden rounded-[2rem] bg-white p-5 text-slate-900 border border-slate-100/60">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[12px] font-medium text-slate-500">Current balance</p>
                            <h2 className="mt-1 text-[36px] font-semibold tracking-tight text-slate-900">{formatMoney(wallet.balance)}</h2>
                            <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${walletRules.canReceiveOrders ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {statusText}
                            </p>
                        </div>
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                            <Wallet size={24} strokeWidth={2} />
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-medium text-slate-500">Need for orders</p>
                            <p className="mt-0.5 text-base font-semibold text-slate-900">{formatMoney(walletRules.minimumBalanceForOrders)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-medium text-slate-500">Above minimum</p>
                            <p className={`mt-0.5 text-base font-semibold ${walletRules.availableForOrders >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {formatMoney(walletRules.availableForOrders)}
                            </p>
                        </div>
                    </div>
                </section>

                {walletError && (
                    <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-xs font-black text-rose-600">
                        {walletError}
                    </p>
                )}

                <section className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowTopUp(true)}
                        disabled={!walletRules.walletEnabled}
                        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[14px] font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        Top up <ArrowUpRight size={17} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => {
                            setWithdrawError('');
                            setWithdrawSuccess(false);
                            setShowWithdraw(true);
                        }}
                        disabled={!walletRules.transferEnabled}
                        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14px] font-semibold text-white shadow-md disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        Withdraw <ArrowDownLeft size={17} strokeWidth={2.5} />
                    </button>
                </section>

                <section className="grid grid-cols-2 gap-3">
                    <RuleCard
                        label="Minimum top-up"
                        value={formatMoney(walletRules.minimumTopUpAmount)}
                        help="Set from admin wallet settings."
                    />
                    <RuleCard
                        label="Transfer minimum"
                        value={formatMoney(walletRules.minimumTransferAmount)}
                        help={walletRules.transferEnabled ? 'Withdrawal is enabled by admin.' : 'Withdrawal is disabled by admin.'}
                    />
                </section>

                <section className="rounded-3xl border border-slate-100/60 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${walletRules.canReceiveOrders ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                            <ShieldAlert size={20} strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-[14px] font-medium text-slate-900">How this wallet is controlled</p>
                            <p className="mt-0.5 text-[12px] font-normal leading-relaxed text-slate-500">
                                Admin settings decide wallet visibility, minimum balance for orders, top-up minimum, and transfer availability.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-semibold text-slate-900">Transactions</h3>
                        <div className="flex rounded-xl bg-slate-100/80 p-1">
                            {['Weekly', 'Monthly', 'Withdrawals'].map((nextPeriod) => (
                                <button
                                    key={nextPeriod}
                                    onClick={() => setPeriod(nextPeriod)}
                                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${period === nextPeriod ? 'bg-white text-slate-900 shadow-sm border border-slate-100/60' : 'text-slate-500'}`}
                                >
                                    {nextPeriod}
                                </button>
                            ))}
                        </div>
                    </div>

                    {period === 'Withdrawals' ? (
                        withdrawals.length === 0 ? (
                            <div className="rounded-3xl border border-slate-100/60 bg-white p-8 text-center">
                                <Wallet size={24} className="mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
                                <p className="text-[12px] font-medium text-slate-400">No withdrawal requests yet</p>
                            </div>
                        ) : (
                            withdrawals.map((w, index) => {
                                const statusColors = {
                                    pending: 'bg-amber-50 text-amber-600 border-amber-200',
                                    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                                    rejected: 'bg-rose-50 text-rose-600 border-rose-200',
                                    cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
                                };
                                const badgeColor = statusColors[w.status] || statusColors.pending;
                                return (
                                    <motion.div
                                        key={w._id || w.id || index}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100/60 bg-white p-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                                                <ArrowDownLeft size={16} strokeWidth={2} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-[14px] font-medium text-slate-900">{w.payment_method || 'Withdrawal'}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(w.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-[14px] font-semibold text-slate-900">{formatMoney(w.amount)}</p>
                                            <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                                {w.status || 'pending'}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )
                    ) : filteredTransactions.length === 0 ? (
                        <div className="rounded-3xl border border-slate-100/60 bg-white p-8 text-center">
                            <History size={24} className="mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
                            <p className="text-[12px] font-medium text-slate-400">No wallet transactions yet</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx, index) => {
                            const isDebit = Number(tx.amount || 0) < 0;
                            return (
                                <motion.div
                                    key={tx._id || tx.id || index}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100/60 bg-white p-4"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isDebit ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                            {isDebit ? <ArrowDownLeft size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-[14px] font-medium text-slate-900 capitalize">{formatTransactionType(tx.type).toLowerCase()}</p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[14px] font-semibold ${isDebit ? 'text-slate-900' : 'text-emerald-600'}`}>{formatMoney(tx.amount)}</p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">Bal {formatMoney(tx.balanceAfter)}</p>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </section>
            </main>

            <DriverBottomNav />
        </div>
    );
};

export default DriverWallet;
