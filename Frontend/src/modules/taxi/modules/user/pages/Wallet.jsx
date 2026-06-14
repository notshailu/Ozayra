import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Download, History, CreditCard, Gift, Send, QrCode, X } from 'lucide-react';
import { userAuthService } from '../services/authService';

const Wallet = () => {
  const navigate = useNavigate();

  const [showAddMoney, setShowAddMoney] = React.useState(false);
  const [showSend, setShowSend] = React.useState(false);
  const [showReceive, setShowReceive] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [sendAmount, setSendAmount] = React.useState('');
  const [sendPhone, setSendPhone] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isSendSuccess, setIsSendSuccess] = React.useState(false);
  const [walletLoading, setWalletLoading] = React.useState(true);
  const [walletError, setWalletError] = React.useState('');
  const [wallet, setWallet] = React.useState({ balance: 0, currency: 'INR', recentTransactions: [] });

  const basePath = useMemo(() => (window.location.pathname.startsWith('/taxi/user') ? '/taxi/user' : ''), []);

  const formatInr = (value) => {
    const amountValue = Number(value || 0);
    const fixed = Math.round(amountValue * 100) / 100;
    return fixed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const splitMoney = (formatted) => {
    const [whole, decimals = '00'] = String(formatted).split('.');
    return { whole, decimals: (decimals || '00').padEnd(2, '0').slice(0, 2) };
  };

  const balanceText = useMemo(() => splitMoney(formatInr(wallet.balance)), [wallet.balance]);

  const refreshWallet = async () => {
    setWalletError('');
    setWalletLoading(true);
    try {
      const response = await userAuthService.getWallet();
      const data = response?.data || {};
      setWallet({
        balance: Number(data.balance || 0),
        currency: data.currency || 'INR',
        recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
      });
    } catch (err) {
      setWalletError(err?.message || 'Failed to load wallet');
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    refreshWallet();
  }, []);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleAddMoney = async () => {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) return;

    setIsAdding(true);
    setWalletError('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      let order;
      try {
        const orderResponse = await userAuthService.createWalletTopupOrder(amountValue);
        order = orderResponse?.data || {};
      } catch (orderErr) {
        console.warn('Razorpay order creation failed, falling back to direct topup:', orderErr);
        try {
          const directResponse = await userAuthService.topupWallet(amountValue);
          const data = directResponse?.data || {};
          setWallet({
            balance: Number(data.balance || 0),
            currency: data.currency || 'INR',
            recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
          });
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            setShowAddMoney(false);
            setAmount('');
          }, 1400);
          return;
        } catch (directErr) {
          throw new Error(directErr?.message || 'Direct wallet topup failed');
        }
      }

      if (!order.keyId || !order.orderId) {
        throw new Error('Unable to start payment');
      }

      let userInfo = {};
      try {
        userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      } catch {
        userInfo = {};
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Rydon24',
        description: 'Wallet Topup',
        order_id: order.orderId,
        prefill: {
          name: userInfo?.name || '',
          email: userInfo?.email || '',
          contact: userInfo?.phone ? `+91${userInfo.phone}` : '',
        },
        modal: {
          ondismiss: () => {
            setIsAdding(false);
          },
        },
        handler: async (response) => {
          try {
            const verifyResponse = await userAuthService.verifyWalletTopup(response);
            const data = verifyResponse?.data || {};
            setWallet({
              balance: Number(data.balance || 0),
              currency: data.currency || 'INR',
              recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
            });
            setIsSuccess(true);
            setTimeout(() => {
              setIsSuccess(false);
              setShowAddMoney(false);
              setAmount('');
            }, 1400);
          } catch (err) {
            setWalletError(err?.message || 'Payment verification failed');
          } finally {
            setIsAdding(false);
          }
        },
        theme: {
          color: '#E85D04',
        },
      });

      rzp.on('payment.failed', (event) => {
        const message = event?.error?.description || event?.error?.reason || 'Payment failed';
        setWalletError(message);
        setIsAdding(false);
      });

      rzp.open();
    } catch (err) {
      setWalletError(err?.message || 'Topup failed');
      setIsAdding(false);
    }
  };

  const handleSend = () => {
    if (!sendAmount || !sendPhone) return;
    setIsSending(true);
    setWalletError('');
    userAuthService
      .transferWallet(sendPhone, Number(sendAmount))
      .then((response) => {
        const data = response?.data || {};
        setWallet({
          balance: Number(data.balance || 0),
          currency: data.currency || 'INR',
          recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
        });
        setIsSendSuccess(true);
        setTimeout(() => {
          setIsSendSuccess(false);
          setShowSend(false);
          setSendAmount('');
          setSendPhone('');
        }, 1400);
      })
      .catch((err) => {
        setWalletError(err?.message || 'Transfer failed');
      })
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] max-w-lg mx-auto flex flex-col font-sans pb-24 relative overflow-x-hidden">
      {/* ADD MONEY MODAL */}
      <AnimatePresence>
        {showAddMoney && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <Motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-3xl p-6 pb-8 space-y-6 shadow-xl relative"
            >
              <button 
                onClick={() => setShowAddMoney(false)}
                className="absolute top-5 right-5 w-8 h-8 bg-neutral-50 hover:bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 active:scale-95 transition-all"
              >
                <X size={16} />
              </button>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-neutral-900">Add Money</h3>
                <p className="text-xs text-neutral-400">Specify amount to top-up your wallet</p>
              </div>

              {isSuccess ? (
                <Motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-6 gap-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                    <Plus size={24} strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-neutral-900">Refill Successful</p>
                    <p className="text-xs text-neutral-400 mt-1">Your balance has been updated</p>
                  </div>
                </Motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="relative flex items-center justify-center py-4">
                    <span className="text-3xl font-semibold text-neutral-400 mr-1 select-none">₹</span>
                    <input 
                       type="number"
                       value={amount}
                       onChange={(e) => setAmount(e.target.value)}
                       placeholder="0.00"
                       className="w-48 bg-transparent text-center text-4xl font-semibold text-neutral-900 focus:outline-none placeholder:text-neutral-200"
                       autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {['100', '500', '1000'].map(val => (
                      <button 
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`py-2 rounded-xl font-medium text-sm border transition-all ${
                          amount === val 
                            ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' 
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        +₹{val}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleAddMoney}
                    disabled={isAdding || !amount}
                    className={`w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isAdding || !amount
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isAdding ? 'Processing...' : (
                      <>Refill Wallet <Plus size={16} strokeWidth={2.5} /></>
                    )}
                  </button>
                </div>
              )}
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SEND MODAL */}
      <AnimatePresence>
        {showSend && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-3xl p-6 pb-8 space-y-6 shadow-xl relative"
            >
              <button 
                onClick={() => setShowSend(false)} 
                className="absolute top-5 right-5 w-8 h-8 bg-neutral-50 hover:bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 active:scale-95 transition-all"
              >
                <X size={16} />
              </button>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-neutral-900">Send Money</h3>
                <p className="text-xs text-neutral-400">Transfer funds instantly to a phone number</p>
              </div>

              {isSendSuccess ? (
                <Motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-6 gap-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                    <Send size={20} strokeWidth={2} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-neutral-900">Transfer Sent</p>
                    <p className="text-xs text-neutral-400 mt-1">Funds transferred successfully</p>
                  </div>
                </Motion.div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Recipient</label>
                    <input
                      type="tel"
                      value={sendPhone}
                      onChange={(e) => setSendPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-900 transition-all placeholder:text-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Amount</label>
                    <div className="relative flex items-center justify-center py-4">
                      <span className="text-3xl font-semibold text-neutral-400 mr-1 select-none">₹</span>
                      <input 
                         type="number"
                         value={sendAmount}
                         onChange={(e) => setSendAmount(e.target.value)}
                         placeholder="0.00"
                         className="w-48 bg-transparent text-center text-4xl font-semibold text-neutral-900 focus:outline-none placeholder:text-neutral-200"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={isSending || !sendAmount || !sendPhone}
                    className={`w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isSending || !sendAmount || !sendPhone 
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isSending ? 'Sending...' : <><Send size={16} strokeWidth={2} /> Send Money</>}
                  </button>
                </div>
              )}
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIVE MODAL */}
      <AnimatePresence>
        {showReceive && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <Motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-3xl p-6 pb-8 space-y-6 shadow-xl relative"
            >
              <button 
                onClick={() => setShowReceive(false)} 
                className="absolute top-5 right-5 w-8 h-8 bg-neutral-50 hover:bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 active:scale-95 transition-all"
              >
                <X size={16} />
              </button>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-neutral-900">Receive Money</h3>
                <p className="text-xs text-neutral-400">Share your QR code or UPI address</p>
              </div>

              <div className="flex flex-col items-center gap-5">
                <div className="w-44 h-44 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-300 p-2 shadow-sm">
                  <QrCode size={120} strokeWidth={1.5} className="text-neutral-800" />
                </div>
                <div className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-neutral-600 truncate">user@rydon24</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText('user@rydon24')}
                    className="text-xs font-semibold text-neutral-900 hover:text-neutral-600 transition-colors active:scale-95 shrink-0"
                  >
                    Copy UPI ID
                  </button>
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="sticky top-0 z-30">
        <div className="bg-[#F9FAFB]/80 backdrop-blur-md border-b border-neutral-100">
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-800 hover:bg-neutral-100 active:scale-95 transition-all"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Wallet</h1>
            </div>
          </div>
        </div>
      </header>

      {/* BALANCE CARD */}
      <div className="px-6 mt-6">
        <Motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group"
        >
          <div className="relative z-10 flex flex-col gap-6">
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Total Balance</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {walletLoading ? '₹0' : `₹${balanceText.whole}`}
                </span>
                <span className="text-xl font-medium text-neutral-400">
                  {walletLoading ? '.00' : `.${balanceText.decimals}`}
                </span>
              </div>
              {walletError && <p className="text-xs text-red-400 mt-1">{walletError}</p>}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddMoney(true)}
                className="flex-1 bg-white hover:bg-neutral-100 active:scale-[0.98] text-neutral-900 h-11 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus size={16} strokeWidth={2.5} />
                Refill
              </button>
              <button
                onClick={() => navigate(`${basePath}/activity`)}
                className="px-4 bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] text-neutral-200 h-11 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <History size={16} strokeWidth={2} />
                History
              </button>
            </div>
          </div>
        </Motion.div>
      </div>



      {/* PROMO */}
      <div className="px-6 mt-8">
        <div 
          onClick={() => navigate(`${basePath}/referral`)}
          className="bg-white border border-neutral-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.03)] group"
        >
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Gift size={18} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-neutral-900">Refer & Earn ₹50</h4>
            <p className="text-[11px] text-neutral-400 mt-0.5 uppercase tracking-wider font-medium">Invite friends to Rydon24</p>
          </div>
          <ArrowLeft size={16} className="text-neutral-300 rotate-180 group-hover:text-neutral-500 transition-colors" />
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="px-6 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recent Transactions</h3>
          <button 
            onClick={() => navigate(`${basePath}/activity`)} 
            className="text-xs font-medium text-neutral-400 hover:text-neutral-800 transition-colors"
          >
            View All
          </button>
        </div>
        
        <div className="bg-white border border-neutral-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-neutral-50">
          {walletLoading ? (
            <div className="py-8 text-center text-sm text-neutral-400">Loading activity...</div>
          ) : wallet.recentTransactions?.length ? (
            wallet.recentTransactions.map((tx) => {
              const isDebit = tx.kind === 'debit';
              const title = tx.title || (isDebit ? 'Debit' : 'Credit');
              const sign = isDebit ? '-' : '+';
              const amountText = formatInr(tx.amount);
              const whenText = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              }) : '';

              return (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-neutral-50/55 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                        isDebit ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isDebit ? <ArrowLeft size={16} strokeWidth={2.5} className="rotate-45" /> : <Plus size={16} strokeWidth={2.5} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-neutral-800 truncate">{title}</h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{whenText}</p>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-semibold tracking-tight ${isDebit ? 'text-neutral-800' : 'text-emerald-600'}`}>
                      {sign}₹{amountText}
                    </span>
                    <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-wider font-medium">
                      {isDebit ? 'Debit' : 'Credit'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-sm text-neutral-400">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;

