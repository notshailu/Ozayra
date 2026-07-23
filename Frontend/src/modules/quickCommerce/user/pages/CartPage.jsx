import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  ShoppingBag,
  Timer,
  Trash2,
  Sparkles,
  Zap,
  Tag,
  ShieldCheck,
  ArrowRight,
  Gift,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@core/context/SettingsContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCart } from "../context/CartContext";
import { customerApi } from "../services/customerApi";
import emptyBoxAnimation from "../assets/lottie/Empty box.json";
import {
  getQuickCategoriesPath,
  getQuickCheckoutPath,
} from "../utils/routes";
import { resolveQuickImageUrl } from "../utils/image";
import { useLocation as useAppLocation } from "../context/LocationContext";

const DEFAULT_QUICK_BILLING_SETTINGS = {
  deliveryFee: 25,
  deliveryFeeRanges: [],
  freeDeliveryThreshold: 0,
  platformFee: 0,
  gstRate: 0,
};

const calculateQuickCartPricing = ({
  subtotal = 0,
  cartItems = [],
  feeSettings = DEFAULT_QUICK_BILLING_SETTINGS,
  categoryFeeMap = {},
}) => {
  const safeSubtotal = Number(subtotal || 0);
  const freeThreshold = Number(feeSettings?.freeDeliveryThreshold || 0);
  const ranges = Array.isArray(feeSettings?.deliveryFeeRanges)
    ? [...feeSettings.deliveryFeeRanges].sort((a, b) => Number(a.min) - Number(b.min))
    : [];

  let deliveryFee = 0;
  if (safeSubtotal <= 0) {
    deliveryFee = 0;
  } else if (Number.isFinite(freeThreshold) && freeThreshold > 0 && safeSubtotal >= freeThreshold) {
    deliveryFee = 0;
  } else if (ranges.length) {
    let matchedFee = null;
    for (let i = 0; i < ranges.length; i += 1) {
      const range = ranges[i] || {};
      const min = Number(range.min);
      const max = Number(range.max);
      const fee = Number(range.fee);
      if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(fee)) continue;
      const isLast = i === ranges.length - 1;
      const inRange = isLast
        ? safeSubtotal >= min && safeSubtotal <= max
        : safeSubtotal >= min && safeSubtotal < max;
      if (inRange) {
        matchedFee = fee;
        break;
      }
    }
    deliveryFee = Number.isFinite(matchedFee)
      ? matchedFee
      : Number(feeSettings?.deliveryFee || 0);
  } else {
    deliveryFee = Number(feeSettings?.deliveryFee || 0);
  }

  const handlingFee = cartItems.reduce((maxFee, item) => {
    const candidateIds = [item?.headerId, item?.categoryId, item?.subcategoryId];
    const itemFee = candidateIds.reduce((currentMax, rawId) => {
      const normalizedId =
        rawId && typeof rawId === "object" && rawId._id
          ? String(rawId._id)
          : String(rawId || "").trim();
      return Math.max(currentMax, Number(categoryFeeMap[normalizedId] || 0));
    }, 0);
    return Math.max(maxFee, itemFee);
  }, 0);
  const platformFee = Number(feeSettings?.platformFee || 0);
  const gstRate = Number(feeSettings?.gstRate || 0);
  const gstAmount =
    Number.isFinite(gstRate) && gstRate > 0
      ? Math.round(safeSubtotal * (gstRate / 100))
      : 0;

  return {
    deliveryFee,
    handlingFee,
    platformFee,
    gstAmount,
    grandTotal: Math.max(
      0,
      safeSubtotal + deliveryFee + handlingFee + platformFee + gstAmount,
    ),
  };
};

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart, loading } = useCart();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { currentLocation } = useAppLocation();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [quickBillingSettings, setQuickBillingSettings] = useState(
    DEFAULT_QUICK_BILLING_SETTINGS,
  );
  const [categoryFeeMap, setCategoryFeeMap] = useState({});
  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadBillingSettings = async () => {
      try {
        const [billingResponse, categoriesResponse] = await Promise.all([
          customerApi.getBillingSettings(),
          customerApi.getCategories({ tree: true }),
        ]);
        const feeSettings =
          billingResponse?.data?.data?.feeSettings ||
          billingResponse?.data?.result ||
          null;
        if (!mounted || !feeSettings) return;
        setQuickBillingSettings((prev) => ({
          ...prev,
          ...feeSettings,
          deliveryFeeRanges: Array.isArray(feeSettings.deliveryFeeRanges)
            ? feeSettings.deliveryFeeRanges
            : prev.deliveryFeeRanges,
        }));

        const results =
          categoriesResponse?.data?.results ||
          categoriesResponse?.data?.result ||
          [];
        const nextFeeMap = {};
        const visit = (items = []) => {
          items.forEach((item) => {
            const id = String(item?._id || item?.id || "").trim();
            if (id) nextFeeMap[id] = Number(item?.handlingFees || 0);
            if (Array.isArray(item?.children) && item.children.length > 0) {
              visit(item.children);
            }
          });
        };
        if (Array.isArray(results)) {
          visit(results);
          if (mounted) {
            setCategoriesList(results.slice(0, 8));
          }
        }
        if (mounted) {
          setCategoryFeeMap(nextFeeMap);
        }
      } catch (error) {
        console.error("Failed to load quick cart billing settings:", error);
      }
    };

    void loadBillingSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const handleClearAll = async () => {
    setShowClearConfirm(false);
    await clearCart();
    showToast("Cart cleared", "info");
  };

  const categoriesPath = getQuickCategoriesPath();
  const checkoutPath = getQuickCheckoutPath();
  const itemCount = cart.reduce((count, item) => count + Number(item.quantity || 0), 0);
  const { deliveryFee, handlingFee, platformFee, gstAmount, grandTotal } =
    calculateQuickCartPricing({
      subtotal: cartTotal,
      cartItems: cart,
      feeSettings: quickBillingSettings,
      categoryFeeMap,
    });
  const paymentMethods = [
    ...(settings?.onlineEnabled === false
      ? []
      : [
          {
            id: "online",
            label: "Pay Online",
            icon: CreditCard,
            sublabel: "UPI / Cards / NetBanking",
          },
        ]),
    ...(settings?.codEnabled === false
      ? []
      : [
          {
            id: "cash",
            label: "Cash on Delivery",
            icon: Banknote,
            sublabel: "Pay after delivery",
          },
        ]),
  ];
  const [selectedPayment, setSelectedPayment] = useState("cash");

  const handleRemove = (item) => {
    removeFromCart(item.id || item._id);
    showToast(`${item.name} removed from cart`, "info");
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }
    navigate(categoriesPath);
  };

  useEffect(() => {
    if (!paymentMethods.length) return;
    const exists = paymentMethods.some((method) => method.id === selectedPayment);
    if (!exists) {
      setSelectedPayment(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPayment]);

  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPayment) || null;

  const freeThreshold = Number(quickBillingSettings?.freeDeliveryThreshold || 0);
  const neededForFree = freeThreshold > 0 ? Math.max(0, freeThreshold - cartTotal) : 0;
  const freeProgress = freeThreshold > 0 ? Math.min(100, Math.round((cartTotal / freeThreshold) * 100)) : 100;

  // Fallback quick explore chips when cart is empty
  const defaultExploreChips = [
    { name: "Fresh Fruits & Veggies", icon: "🥦" },
    { name: "Milk, Bread & Dairy", icon: "🥛" },
    { name: "Snacks & Munchies", icon: "🍟" },
    { name: "Cold Drinks & Juices", icon: "🥤" },
    { name: "Instant Noodles & Pasta", icon: "🍜" },
    { name: "Chocolates & Ice Cream", icon: "🍫" },
  ];

  if (loading && cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 font-outfit flex items-center justify-center px-4">
        <div className="flex flex-col items-center justify-center text-center max-w-xs">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 animate-ping rounded-full bg-emerald-500/20" />
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-600 dark:border-slate-800 dark:border-t-emerald-500 shadow-sm" />
          </div>
          <h2 className="mt-5 text-base font-bold text-slate-800 dark:text-white">Loading your cart</h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Fetching your saved items & latest offers...</p>
        </div>
      </div>
    );
  }

  // --- REDESIGNED EMPTY CART STATE ---
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50/90 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-outfit pb-16 flex flex-col">
        {/* Sleek Glass Top Bar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100/80 dark:border-slate-800/80 px-4 py-3.5 shadow-sm shadow-slate-900/5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 active:scale-95 transition-all shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Your Cart</h1>
                  <span className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    0 items
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Fast 10-15 min doorstep delivery</p>
              </div>
            </div>
            
            <Link to={categoriesPath}>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors">
                Explore Store <ChevronRight size={14} />
              </span>
            </Link>
          </div>
        </header>

        {/* Empty Cart Hero Content */}
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8 flex items-center justify-center">
            {/* Multi-layered Glowing Ambient Backdrop */}
            <div className="absolute w-56 h-56 bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-amber-400/15 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute w-44 h-44 rounded-full border border-emerald-500/10 dark:border-emerald-500/20 animate-[spin_20s_linear_infinite] pointer-events-none" />
            <div className="absolute w-60 h-60 rounded-full border border-dashed border-slate-200/60 dark:border-slate-800/60 animate-[spin_35s_linear_infinite_reverse] pointer-events-none" />

            {/* Floating Badges Around Animation */}
            <div className="absolute -top-3 -left-6 bg-white dark:bg-slate-800/95 border border-slate-100 dark:border-slate-700/80 shadow-lg rounded-2xl px-3 py-1.5 flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '3s' }}>
              <Zap size={13} className="text-amber-500 fill-amber-500" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">10 Min Delivery</span>
            </div>
            <div className="absolute -bottom-2 -right-6 bg-white dark:bg-slate-800/95 border border-slate-100 dark:border-slate-700/80 shadow-lg rounded-2xl px-3 py-1.5 flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
              <Sparkles size={13} className="text-emerald-500 fill-emerald-500" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Lowest Prices</span>
            </div>

            {/* Main Lottie Container */}
            <div className="relative z-10 w-44 h-44 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 p-4 transition-transform hover:scale-105 duration-500">
              <Lottie animationData={emptyBoxAnimation} loop className="h-36 w-36 opacity-95 drop-shadow-md" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Your cart feels a bit <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">light!</span>
          </h2>
          
          <p className="mt-2.5 text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
            Discover thousands of fresh groceries, snacks, beverages & daily essentials delivered right to your doorstep in minutes.
          </p>

          <Link to={categoriesPath} className="mt-7 w-full sm:w-auto min-w-[240px]">
            <Button className="h-13 w-full sm:w-auto px-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5">
              <ShoppingBag size={18} />
              Start Shopping Now
              <ArrowRight size={16} />
            </Button>
          </Link>

          {/* Quick Categories Section to keep users engaged */}
          <div className="mt-12 w-full pt-8 border-t border-slate-100 dark:border-slate-800/80 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-500" />
                Popular Categories to Explore
              </h3>
              <Link to={categoriesPath} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(categoriesList.length > 0
                ? categoriesList.map((cat) => ({
                    id: cat._id || cat.id,
                    name: cat.name,
                    icon: "🛍️",
                    image: resolveQuickImageUrl(cat.image || cat.icon),
                  }))
                : defaultExploreChips
              ).map((chip, idx) => (
                <Link
                  key={chip.id || idx}
                  to={categoriesPath}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all group"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700/60 group-hover:scale-105 transition-transform">
                    {chip.image ? (
                      <img src={chip.image} alt={chip.name} className="h-8 w-8 object-contain" />
                    ) : (
                      <span className="text-xl">{chip.icon || "🛍️"}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {chip.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- REDESIGNED FILLED CART STATE ---
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 font-outfit pb-[calc(11rem+env(safe-area-inset-bottom))]">
      {/* Sleek Header */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-100/80 dark:border-slate-800/80 px-4 py-3.5 shadow-sm shadow-slate-900/5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 active:scale-95 transition-all shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Your Cart</h1>
                <span className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Review your items before checkout</p>
            </div>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear Cart</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Clear cart confirmation modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setShowClearConfirm(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 mx-auto">
                <Trash2 size={22} className="text-rose-500 dark:text-rose-400" />
              </div>
              <h3 className="text-center text-lg font-black text-slate-800 dark:text-white">Clear your cart?</h3>
              <p className="mt-1.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                All {itemCount} item{itemCount === 1 ? "" : "s"} will be removed from your bag. You can always add them back later.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 py-3 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Keep Items
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 rounded-2xl bg-rose-500 py-3 text-xs font-extrabold text-white hover:bg-rose-600 shadow-lg shadow-rose-500/25 transition-all"
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Superfast Delivery Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 p-5 text-white shadow-xl shadow-emerald-600/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-12 -bottom-10 h-28 w-28 rounded-full bg-teal-400/20 blur-lg pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                <Timer size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black tracking-wide uppercase">
                    Delivery in {currentLocation?.time || "10-15 mins"}
                  </h2>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    ⚡ SUPERFAST
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                  Direct dispatch from your nearest quick hub • Live GPS tracking
                </p>
              </div>
            </div>
          </div>

          {/* Free Delivery Progress Bar */}
          {freeThreshold > 0 && (
            <div className="mt-4 pt-3.5 border-t border-white/15">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Gift size={14} className="text-amber-300" />
                  {neededForFree > 0
                    ? `Add ₹${neededForFree} more to unlock FREE Delivery!`
                    : "🎉 You have unlocked FREE Delivery on this order!"}
                </span>
                <span className="text-[11px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                  {freeProgress}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 via-yellow-300 to-white rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${freeProgress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Cart Items Card */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/90 dark:border-slate-800 overflow-hidden shadow-sm shadow-slate-900/5">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-emerald-600 dark:text-emerald-400" />
              Cart Items ({cart.length})
            </span>
            <Link to={categoriesPath} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              + Add more items
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {cart.map((item) => (
              <article
                key={item.id || item._id}
                className="p-4 sm:p-5 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <div className="flex gap-4 items-center">
                  <div className="flex h-20 w-20 sm:h-22 sm:w-22 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-2 shadow-inner">
                    <img
                      src={resolveQuickImageUrl(item.mainImage || item.image) || item.mainImage || item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop"}
                      alt={item.name}
                      className="h-full w-full object-contain transition-transform hover:scale-108 duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop";
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-bold text-slate-800 dark:text-white leading-snug">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-400">
                          {item.weight || item.unit || "1 unit"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemove(item)}
                        className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {"\u20B9"}{Number(item.price || 0) * Number(item.quantity || 0)}
                          </span>
                          {item.mrp && Number(item.mrp) > Number(item.price) && (
                            <span className="text-xs font-semibold text-slate-400 line-through">
                              {"\u20B9"}{Number(item.mrp) * Number(item.quantity || 0)}
                            </span>
                          )}
                        </div>
                        {item.quantity > 1 && (
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 mt-0.5">
                            {"\u20B9"}{item.price} per unit
                          </p>
                        )}
                      </div>

                      {/* Quantity Stepper Pill */}
                      <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/50 p-1.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id || item._id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all shadow-sm active:scale-90"
                        >
                          <Minus size={13} strokeWidth={2.5} />
                        </button>
                        <span className="min-w-[18px] text-center text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const stock = Number(item.stock ?? Infinity);
                            if (item.quantity >= stock) {
                              showToast(`Only ${stock} in stock`, "error");
                              return;
                            }
                            updateQuantity(item.id || item._id, 1);
                          }}
                          disabled={item.quantity >= Number(item.stock ?? Infinity)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-90"
                        >
                          <Plus size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Bill Breakdown Section */}
        <section className="rounded-3xl border border-slate-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <Tag size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Bill Summary & Breakdown
                </h2>
                <p className="text-[11px] font-medium text-slate-400">All applicable taxes & fees included</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="mt-5 space-y-3.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center justify-between">
              <span>Items Subtotal</span>
              <span className="font-bold text-slate-800 dark:text-white">{"\u20B9"}{cartTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                Delivery charge
                {deliveryFee === 0 && <Check size={14} className="text-emerald-600" />}
              </span>
              <span className="font-bold text-slate-800 dark:text-white">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wide">FREE</span>
                ) : (
                  `\u20B9${deliveryFee}`
                )}
              </span>
            </div>
            {handlingFee > 0 && (
              <div className="flex items-center justify-between">
                <span>Handling fee (store preparation)</span>
                <span className="font-bold text-slate-800 dark:text-white">{"\u20B9"}{handlingFee}</span>
              </div>
            )}
            {platformFee > 0 && (
              <div className="flex items-center justify-between">
                <span>Platform fee</span>
                <span className="font-bold text-slate-800 dark:text-white">{"\u20B9"}{platformFee}</span>
              </div>
            )}
            {gstAmount > 0 && (
              <div className="flex items-center justify-between">
                <span>GST & Govt Taxes</span>
                <span className="font-bold text-slate-800 dark:text-white">{"\u20B9"}{gstAmount}</span>
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <div className="flex items-center justify-between text-base sm:text-lg font-black text-slate-900 dark:text-white">
                <span>Total Payable Amount</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{"\u20B9"}{grandTotal}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods Section */}
        <section className="rounded-3xl border border-slate-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <CreditCard size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Select Payment Mode
              </h2>
              <p className="text-[11px] font-medium text-slate-400">Instant UPI, Cards or Cash on delivery</p>
            </div>
          </div>

          <div className="space-y-3">
            {paymentMethods.length ? (
              paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPayment === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPayment(method.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/40 shadow-sm"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isSelected ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${isSelected ? "text-emerald-900 dark:text-emerald-200" : "text-slate-800 dark:text-white"}`}>
                        {method.label}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">{method.sublabel}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected ? <Check size={13} className="text-white stroke-[3]" /> : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-xs text-slate-500 font-medium leading-relaxed">
                Payment options are currently being updated. You can still review the order and finalize on checkout.
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-500 font-semibold">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>100% Safe & Secure Payments • Instant Refunds</span>
          </div>
        </section>
      </div>

      {/* Sticky Bottom Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[520] border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl px-4 pt-3.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Total Amount
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {"\u20B9"}{grandTotal}
              </span>
            </div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
              {selectedPaymentMethod ? selectedPaymentMethod.label : "All fees included"} • {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>

          <Link
            to={checkoutPath}
            state={{ selectedPayment }}
            className="block shrink-0 flex-1 sm:flex-initial"
          >
            <Button className="h-13 w-full sm:w-auto px-6 sm:px-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-sm font-extrabold tracking-wide text-white transition-all shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 active:scale-[0.98] flex items-center justify-center gap-2.5">
              <ShoppingBag size={18} />
              <span>Proceed to Checkout</span>
              <ArrowRight size={17} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

