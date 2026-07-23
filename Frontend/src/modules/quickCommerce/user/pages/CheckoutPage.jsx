import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "@core/context/AuthContext";
import { useProfile } from "@food/context/ProfileContext";
import { useWishlist } from "../context/WishlistContext";
import { customerApi } from "../services/customerApi";
import { useLocation as useAppLocation } from "../context/LocationContext";
import {
  MapPin,
  Clock,
  CreditCard,
  Banknote,
  ChevronRight,
  ChevronLeft,
  Share2,
  Gift,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Heart,
  Truck,
  Tag,
  Sparkles,
  Plus,
  Minus,
  Search,
  X,
  Clipboard,
  Check,
  Contact2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@shared/components/ui/Toast";
import { useSettings } from "@core/context/SettingsContext";
import SlideToPay from "../components/shared/SlideToPay";
import { initRazorpayPayment } from "@food/utils/razorpay";
import { getCachedGeocode, setCachedGeocode } from "@/core/utils/geocodeCache";
import {
  getOrderSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderStatusUpdate,
} from "@/core/services/orderSocket";
import ProductCard from "../components/shared/ProductCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import emptyBoxAnimation from "../assets/lottie/Empty box.json";
import {
  getQuickCategoriesPath,
  getQuickOrderDetailPath,
  getQuickOrdersPath,
} from "../utils/routes";

const CHECKOUT_STORAGE_KEY = "quick_commerce_checkout_state_v1";
const RECIPIENT_STORAGE_KEY = "ozayra_checkout_recipient_v1";

const DEFAULT_CURRENT_ADDRESS = {
  type: "Home",
  name: "",
  address: "",
  landmark: "",
  city: "",
  phone: "",
};

const DEFAULT_RECIPIENT_DATA = {
  completeAddress: "",
  landmark: "",
  pincode: "",
  name: "",
  phone: "",
};

const DEFAULT_QUICK_BILLING_SETTINGS = {
  deliveryFee: 25,
  deliveryFeeRanges: [],
  freeDeliveryThreshold: 0,
  platformFee: 0,
  gstRate: 0,
};

const calculateQuickCheckoutPricing = ({
  subtotal = 0,
  discountAmount = 0,
  selectedTip = 0,
  feeSettings = DEFAULT_QUICK_BILLING_SETTINGS,
  cartItems = [],
  categoryFeeMap = {},
}) => {
  const safeSubtotal = Number(subtotal || 0);
  const safeDiscount = Math.max(0, Number(discountAmount || 0));
  const safeTip = Math.max(0, Number(selectedTip || 0));
  const freeThreshold = Number(feeSettings?.freeDeliveryThreshold || 0);
  const ranges = Array.isArray(feeSettings?.deliveryFeeRanges)
    ? [...feeSettings.deliveryFeeRanges].sort((a, b) => Number(a.min) - Number(b.min))
    : [];

  let deliveryFeeCharged = 0;
  if (Number.isFinite(freeThreshold) && freeThreshold > 0 && safeSubtotal >= freeThreshold) {
    deliveryFeeCharged = 0;
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
    deliveryFeeCharged = Number.isFinite(matchedFee)
      ? matchedFee
      : Number(feeSettings?.deliveryFee || 0);
  } else {
    deliveryFeeCharged = Number(feeSettings?.deliveryFee || 0);
  }

  const handlingFeeCharged = cartItems.reduce((maxFee, item) => {
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
  const platformFeeCharged = Number(feeSettings?.platformFee || 0);
  const gstRate = Number(feeSettings?.gstRate || 0);
  const gstAmount =
    Number.isFinite(gstRate) && gstRate > 0
      ? Math.round(safeSubtotal * (gstRate / 100))
      : 0;

  return {
    deliveryFeeCharged,
    handlingFeeCharged,
    platformFeeCharged,
    gstAmount,
    grandTotal: Math.max(
      0,
      safeSubtotal +
        deliveryFeeCharged +
        handlingFeeCharged +
        platformFeeCharged +
        gstAmount -
        safeDiscount +
        safeTip,
    ),
    snapshots: {
      feeSettings,
      deliverySettings: {
        pricingMode: "order_value_range",
      },
    },
  };
};

const isLegacyStaticCheckoutValue = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;

  return [
    "harshvardhan panchal",
    "6268423925",
    "pipliyahana",
    "rajshri palace",
    "indore - 452018",
    "214, rajshri palace colony",
  ].some((token) => normalized.includes(token));
};

const sanitizeCheckoutAddress = (address = {}) => {
  if (!address || typeof address !== "object") {
    return { ...DEFAULT_CURRENT_ADDRESS };
  }

  const next = { ...DEFAULT_CURRENT_ADDRESS, ...address };

  if (isLegacyStaticCheckoutValue(next.name)) next.name = "";
  if (isLegacyStaticCheckoutValue(next.phone)) next.phone = "";
  if (isLegacyStaticCheckoutValue(next.address)) next.address = "";
  if (isLegacyStaticCheckoutValue(next.city)) next.city = "";

  return next;
};

const parseAddressLineParts = (value = "") =>
  String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const buildNormalizedQuickOrderAddress = ({
  label = "Other",
  name = "",
  phone = "",
  street = "",
  additionalDetails = "",
  city = "",
  state = "",
  zipCode = "",
  completeAddress = "",
  location,
  placeId,
}) => {
  const normalizedLabel = ["Home", "Office", "Other"].includes(label)
    ? label
    : "Other";
  const resolvedStreet =
    String(street || "").trim() || String(completeAddress || "").trim();
  const resolvedCity = String(city || "").trim() || "NA";
  const resolvedState = String(state || "").trim() || resolvedCity || "NA";
  const resolvedZipCode = String(zipCode || "").trim();
  const resolvedAdditionalDetails = String(additionalDetails || "").trim();

  return {
    type: normalizedLabel,
    label: normalizedLabel,
    name: String(name || "").trim(),
    phone: String(phone || "").trim(),
    street: resolvedStreet,
    address: resolvedStreet,
    additionalDetails: resolvedAdditionalDetails,
    landmark: resolvedAdditionalDetails,
    city: resolvedCity,
    state: resolvedState,
    zipCode: resolvedZipCode,
    ...(placeId ? { placeId } : {}),
    ...(location ? { location } : {}),
  };
};

const readStoredCheckoutState = () => {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return {
      ...parsed,
      currentAddress: sanitizeCheckoutAddress(parsed.currentAddress),
    };
  } catch {
    return {};
  }
};

const CheckoutPage = () => {
  const {
    cart,
    addToCart,
    cartTotal,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    loading,
  } = useCart();
  const { wishlist, addToWishlist, fetchFullWishlist, isFullDataFetched } =
    useWishlist();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { userProfile } = useProfile();
  const { settings } = useSettings();
  const routerLocation = useRouterLocation();

  // Fetch full wishlist data if not already fetched
  useEffect(() => {
    if (isAuthenticated && !isFullDataFetched) {
      fetchFullWishlist();
    }
  }, [isAuthenticated, isFullDataFetched, fetchFullWishlist]);

  const appName = settings?.appName || "App";
  const {
    savedAddresses: locationSavedAddresses,
    currentLocation,
    refreshLocation,
    isFetchingLocation,
    updateLocation,
  } = useAppLocation();
  const navigate = useNavigate();
  const categoriesPath = getQuickCategoriesPath();
  const ordersPath = getQuickOrdersPath();
  const storedCheckoutState = readStoredCheckoutState();

  // State management
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(
    storedCheckoutState.selectedTimeSlot || "now",
  );
  const [selectedPayment, setSelectedPayment] = useState(
    routerLocation.state?.selectedPayment ||
      storedCheckoutState.selectedPayment ||
      "cash",
  );
  const [selectedTip, setSelectedTip] = useState(
    Number(storedCheckoutState.selectedTip || 0),
  );
  const [showAllCartItems, setShowAllCartItems] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(
    storedCheckoutState.selectedCoupon || null,
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isResolvingAddressCoords, setIsResolvingAddressCoords] = useState(false);
  const [showAddNewAddressForm, setShowAddNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({ label: "Home", name: "", phone: "", address: "", landmark: "", city: "", zipCode: "" });
  const [newAddressErrors, setNewAddressErrors] = useState({});
  const [isSavingNewAddress, setIsSavingNewAddress] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [quickBillingSettings, setQuickBillingSettings] = useState(
    DEFAULT_QUICK_BILLING_SETTINGS,
  );
  const [categoryFeeMap, setCategoryFeeMap] = useState({});
  const postOrderNavigateRef = useRef(null);
  const [currentAddress, setCurrentAddress] = useState(
    storedCheckoutState.currentAddress || DEFAULT_CURRENT_ADDRESS,
  );
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState({
    ...(storedCheckoutState.currentAddress || DEFAULT_CURRENT_ADDRESS),
  });
  const [showRecipientForm, setShowRecipientForm] = useState(
    Boolean(storedCheckoutState.showRecipientForm),
  );
  const [recipientData, setRecipientData] = useState(DEFAULT_RECIPIENT_DATA);
  const [savedRecipient, setSavedRecipient] = useState(null);
  const [recipientErrors, setRecipientErrors] = useState({});
  const sharedProfileName = String(
    userProfile?.name || user?.name || "",
  ).trim();
  const sharedProfilePhone = String(
    userProfile?.phone || user?.phone || "",
  ).trim();
  // Dynamic state for recommendations
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  const [coupons, setCoupons] = useState([]);
  const [manualCode, setManualCode] = useState(
    storedCheckoutState.manualCode || "",
  );
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadBillingSettings = async () => {
      try {
        const [response, categoriesResponse] = await Promise.all([
          customerApi.getBillingSettings(),
          customerApi.getCategories({ tree: true }),
        ]);
        const settings =
          response?.data?.data?.feeSettings ||
          response?.data?.result ||
          null;
        if (!mounted || !settings) return;

        setQuickBillingSettings((prev) => ({
          ...prev,
          ...settings,
          deliveryFeeRanges: Array.isArray(settings.deliveryFeeRanges)
            ? settings.deliveryFeeRanges
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
        }
        if (mounted) {
          setCategoryFeeMap(nextFeeMap);
        }
      } catch (error) {
        console.error("Failed to load quick billing settings:", error);
      }
    };

    void loadBillingSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const timeSlots = [
    { id: "now", label: "Now", sublabel: currentLocation?.time || "10-15 min" },
    { id: "30min", label: "30 min", sublabel: "Standard" },
    { id: "1hour", label: "1 hour", sublabel: "Scheduled" },
    { id: "2hours", label: "2 hours", sublabel: "Scheduled" },
  ];

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

  const tipAmounts = [
    { value: 0, label: "No Tip" },
    { value: 10, label: "₹10" },
    { value: 20, label: "₹20" },
    { value: 30, label: "₹30" },
  ];
  const [customTip, setCustomTip] = useState("");

  const deliveryFee = pricingPreview?.deliveryFeeCharged || 0;
  const handlingFee = pricingPreview?.handlingFeeCharged || 0;
  const platformFee = pricingPreview?.platformFeeCharged || 0;
  const gstAmount = pricingPreview?.gstAmount || 0;
  const discountAmount = selectedCoupon
    ? selectedCoupon.discountAmount || selectedCoupon.discount || 0
    : 0;
  const discountedItemsTotal = cart.reduce((sum, item) => {
    const unitPrice = Number(item.salePrice || item.price || 0);
    return sum + unitPrice * Number(item.quantity || 0);
  }, 0);
  const originalItemsTotal = cart.reduce((sum, item) => {
    const originalUnitPrice = Number(
      item.originalPrice || item.mrp || item.price || item.salePrice || 0,
    );
    return sum + originalUnitPrice * Number(item.quantity || 0);
  }, 0);
  const totalAmount = pricingPreview?.grandTotal || 0;

  const displayCartItems = showAllCartItems ? cart : cart;
  const getCheckoutProductId = (item) =>
    String(item?.productId || item?.itemId || item?.id || item?._id || "").split("::")[0];
  const getCheckoutCartItemsForSync = () =>
    cart
      .map((item) => ({
        productId: getCheckoutProductId(item),
        quantity: Math.max(1, Number(item.quantity || 1)),
      }))
      .filter((item) => item.productId);

  const syncVisibleCartToBackend = async () => {
    const cartItemsForSync = getCheckoutCartItemsForSync();

    if (!cartItemsForSync.length) {
      throw new Error("Cart is empty");
    }

    await customerApi.clearCart();
    for (const item of cartItemsForSync) {
      await customerApi.addToCart(item);
    }
  };

  const getCheckoutErrorMessage = (error) =>
    String(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "",
    ).trim();

  // Derived display values for primary delivery card
  const displayName =
    savedRecipient?.name ||
    sharedProfileName ||
    currentAddress.name ||
    "Customer";
  const displayPhone =
    savedRecipient?.phone || currentAddress.phone || sharedProfilePhone || "";
  const displayAddress = savedRecipient
    ? `${savedRecipient.completeAddress}${savedRecipient.landmark ? `, ${savedRecipient.landmark}` : ""}${savedRecipient.pincode ? ` - ${savedRecipient.pincode}` : ""}`
    : [currentAddress.address, currentAddress.landmark, currentAddress.city]
        .filter(Boolean)
        .join(", ");

  useEffect(() => {
    if (!paymentMethods.length) return;
    const exists = paymentMethods.some((method) => method.id === selectedPayment);
    if (!exists) {
      setSelectedPayment(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPayment]);

  useEffect(() => {
    if (!sharedProfileName && !sharedProfilePhone) return;

    setCurrentAddress((prev) => {
      const nextName = prev.name || sharedProfileName;
      const nextPhone = prev.phone || sharedProfilePhone;
      if (nextName === prev.name && nextPhone === prev.phone) return prev;
      return {
        ...prev,
        name: nextName,
        phone: nextPhone,
      };
    });

    setEditAddressForm((prev) => {
      const nextName = prev.name || sharedProfileName;
      const nextPhone = prev.phone || sharedProfilePhone;
      if (nextName === prev.name && nextPhone === prev.phone) return prev;
      return {
        ...prev,
        name: nextName,
        phone: nextPhone,
      };
    });
    // Note: recipientData is intentionally NOT pre-filled from profile —
    // the receiver is a different person, so the user must enter their details manually.
  }, [sharedProfileName, sharedProfilePhone]);

  useEffect(() => {
    const hasUsableAddress = [currentAddress.address, currentAddress.city, currentAddress.landmark]
      .some((value) => String(value || "").trim());

    if (hasUsableAddress || !locationSavedAddresses.length) {
      return;
    }

    const primaryAddress =
      locationSavedAddresses.find((addr) => addr?.isDefault || addr?.isCurrent) ||
      locationSavedAddresses[0];
    if (!primaryAddress?.address) {
      return;
    }

    setCurrentAddress((prev) => ({
      ...prev,
      type: primaryAddress.label || prev.type || "Home",
      name: primaryAddress.name || sharedProfileName || "",
      address: primaryAddress.address || "",
      city: primaryAddress.city || "",
      phone: primaryAddress.phone || sharedProfilePhone || "",
      landmark: "",
      ...(primaryAddress.placeId ? { placeId: primaryAddress.placeId } : {}),
      ...(primaryAddress.location ? { location: primaryAddress.location } : {}),
      ...(primaryAddress.id ? { id: primaryAddress.id } : {}),
    }));
  }, [
    currentAddress.address,
    currentAddress.city,
    currentAddress.landmark,
    locationSavedAddresses,
    sharedProfileName,
    sharedProfilePhone,
  ]);

  const buildAddressForOrder = () => {
    if (savedRecipient) {
      const recipientAddressParts = parseAddressLineParts(
        savedRecipient.completeAddress,
      );
      return buildNormalizedQuickOrderAddress({
        label: "Other",
        name: savedRecipient.name,
        phone: savedRecipient.phone,
        street: recipientAddressParts[0] || savedRecipient.completeAddress,
        additionalDetails:
          savedRecipient.landmark || recipientAddressParts.slice(1, -1).join(", "),
        city: currentAddress.city || recipientAddressParts.at(-1) || "NA",
        state: currentAddress.state || currentLocation?.state || "NA",
        zipCode: savedRecipient.pincode || currentAddress.pincode || "",
        completeAddress: savedRecipient.completeAddress,
        location:
          currentLocation?.latitude && currentLocation?.longitude
            ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
            : undefined,
      });
    }

    const addrLoc = currentAddress?.location;
    const hasAddrLoc =
      addrLoc &&
      typeof addrLoc.lat === "number" &&
      typeof addrLoc.lng === "number" &&
      Number.isFinite(addrLoc.lat) &&
      Number.isFinite(addrLoc.lng);
    const currentAddressParts = parseAddressLineParts(currentAddress.address);

    return buildNormalizedQuickOrderAddress({
      label: currentAddress.type || "Home",
      name: currentAddress.name || user?.name || "",
      phone: currentAddress.phone || "",
      street: currentAddressParts[0] || currentAddress.address,
      additionalDetails:
        currentAddress.landmark || currentAddressParts.slice(1, -1).join(", "),
      city:
        currentAddress.city ||
        currentAddressParts.at(-1) ||
        currentLocation?.city ||
        "NA",
      state: currentAddress.state || currentLocation?.state || "NA",
      zipCode:
        currentAddress.zipCode ||
        currentAddress.pincode ||
        currentLocation?.pincode ||
        "",
      completeAddress: currentAddress.address,
      placeId: currentAddress.placeId,
      location:
        // Important: delivery fee must be based on the selected delivery address,
        // not the device's last detected location (which can be stale).
        hasAddrLoc ? { lat: addrLoc.lat, lng: addrLoc.lng } : undefined,
    });
  };

  const handleSaveRecipient = () => {
    const errors = {};

    if (!recipientData.completeAddress?.trim()) {
      errors.completeAddress = "Complete address is required";
    } else if (recipientData.completeAddress.trim().length < 5) {
      errors.completeAddress = "Address is too short, please enter a valid address";
    }

    if (!recipientData.name?.trim()) {
      errors.name = "Receiver's name is required";
    } else if (recipientData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!recipientData.phone) {
      errors.phone = "Phone number is required";
    } else if (recipientData.phone.length !== 10) {
      errors.phone = `Phone number must be exactly 10 digits (entered ${recipientData.phone.length})`;
    } else if (!/^[6-9]\d{9}$/.test(recipientData.phone)) {
      errors.phone = "Enter a valid Indian mobile number starting with 6, 7, 8 or 9";
    }

    if (recipientData.pincode && recipientData.pincode.length !== 6) {
      errors.pincode = "Pin code must be exactly 6 digits";
    }

    if (Object.keys(errors).length > 0) {
      // Show the first error as a toast
      const firstError = Object.values(errors)[0];
      showToast(firstError, "error");
      setRecipientErrors(errors);
      return;
    }

    setRecipientErrors({});
    setSavedRecipient(recipientData);
    setShowRecipientForm(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          RECIPIENT_STORAGE_KEY,
          JSON.stringify(recipientData),
        );
      }
    } catch {
      // ignore storage errors
    }
    showToast("Recipient details saved!", "success");
  };

  const handleMoveToWishlist = (item) => {
    // Normalize the cart item into a proper product object for the wishlist
    const productId = String(item?.productId || item?.itemId || item?.id || item?._id || "").split("::")[0];
    if (!productId) {
      showToast("Could not move item to wishlist", "error");
      return;
    }
    const productForWishlist = {
      ...item,
      id: productId,
      _id: productId,
      productId,
      mainImage: item.mainImage || item.image || "",
      image: item.image || item.mainImage || "",
    };
    addToWishlist(productForWishlist);
    removeFromCart(productId);
    showToast(`${item.name} moved to wishlist`, "success");
  };

  const handleOpenEditAddress = () => {
    setEditAddressForm({
      ...currentAddress,
      name: currentAddress.name || sharedProfileName || "",
      phone: currentAddress.phone || sharedProfilePhone || "",
    });
    setIsEditAddressOpen(true);
  };

  const isValidLatLng = (loc) =>
    loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng);

  const resolveAddressCoords = async (addressText) => {
    const q = String(addressText || "").trim();
    if (!q) return null;

    // Prefer placeId resolution if the current address has one (more reliable than text geocode).
    // Note: This helper is called with raw address text; placeId resolution happens in caller when available.
    const cacheKey = `addr:${q}`;
    const cached = getCachedGeocode(cacheKey);
    if (cached?.location?.lat && cached?.location?.lng) {
      return cached.location;
    }

    // Prefer backend geocoding (server key) so billing is controlled centrally.
    try {
      const resp = await customerApi.geocodeAddress(q);
      const loc = resp.data?.result?.location;
      if (isValidLatLng(loc)) {
        setCachedGeocode(cacheKey, { location: { lat: loc.lat, lng: loc.lng } });
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (e) {
      const serverMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error?.message ||
        e?.message ||
        null;
      // Bubble up a helpful message for UI.
      const err = new Error(serverMsg || "Could not geocode address");
      err.__serverMsg = serverMsg;
      throw err;
    }

    return null;
  };

  const handleSelectSavedAddress = async (addr) => {
    const rawText = addr?.address || "";
    const addrLoc = addr?.location;
    const hasLoc = isValidLatLng(addrLoc);
    const pid = typeof addr?.placeId === "string" ? addr.placeId.trim() : "";

    setIsResolvingAddressCoords(true);
    try {
      let resolvedLoc = null;
      try {
        if (hasLoc) {
          resolvedLoc = addrLoc;
        } else if (pid) {
          const cacheKey = `pid:${pid}`;
          const cached = getCachedGeocode(cacheKey);
          if (cached?.location?.lat && cached?.location?.lng) {
            resolvedLoc = cached.location;
          } else {
            const resp = await customerApi.geocodePlaceId(pid);
            const loc = resp.data?.result?.location;
            if (isValidLatLng(loc)) {
              resolvedLoc = { lat: loc.lat, lng: loc.lng };
              setCachedGeocode(cacheKey, { location: resolvedLoc });
            }
          }
        } else {
          resolvedLoc = await resolveAddressCoords(rawText);
        }
      } catch (e) {
        showToast(
          e?.__serverMsg ||
            e?.message ||
            "Could not fetch coordinates for this address. Delivery charges may not update.",
          "error",
        );
      }

      // Don't proceed with a stale location; keep the modal open so the user can pick/edit again.
      if (!resolvedLoc) {
        showToast(
          "Could not fetch coordinates for this address. Please edit the address or choose a different one.",
          "error",
        );
        return;
      }

      setCurrentAddress({
        id: addr.id,
        type: addr.label,
        name: addr.name || user?.name || "",
        address: rawText,
        city: addr.city || "",
        phone: addr.phone || currentAddress.phone,
        landmark: "", // already baked into addr.address if present
        ...(pid ? { placeId: pid } : {}),
        ...(resolvedLoc ? { location: resolvedLoc } : {}),
      });

      if (resolvedLoc) {
        updateLocation(
          {
            name: rawText,
            time: currentLocation?.time || "12-15 mins",
            city: currentLocation?.city,
            state: currentLocation?.state,
            pincode: currentLocation?.pincode,
            latitude: resolvedLoc.lat,
            longitude: resolvedLoc.lng,
          },
          { persist: true, updateSavedHome: false },
        );
      }

      setIsAddressModalOpen(false);
    } finally {
      setIsResolvingAddressCoords(false);
    }
  };

  const handleSaveNewAddress = async () => {
    const errors = {};
    if (!newAddressForm.name.trim()) errors.name = "Name is required";
    if (!newAddressForm.phone || newAddressForm.phone.length !== 10) errors.phone = "Valid 10-digit phone number is required";
    if (!newAddressForm.address.trim()) errors.address = "Address is required";
    if (!newAddressForm.city.trim()) errors.city = "City is required";
    if (newAddressForm.zipCode && newAddressForm.zipCode.length > 0 && newAddressForm.zipCode.length !== 6) errors.zipCode = "Pincode must be exactly 6 digits";

    if (Object.keys(errors).length > 0) {
      setNewAddressErrors(errors);
      showToast(Object.values(errors)[0], "error");
      return;
    }

    setNewAddressErrors({});
    setIsSavingNewAddress(true);
    try {
      // Geocode the address for coordinates
      const query = [newAddressForm.address, newAddressForm.landmark, newAddressForm.city, newAddressForm.zipCode].filter(Boolean).join(", ");
      let resolvedLoc = null;
      try {
        const resp = await customerApi.geocodeAddress(query);
        const loc = resp.data?.result?.location;
        if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
          resolvedLoc = { lat: loc.lat, lng: loc.lng };
        }
      } catch { /* geocoding optional */ }

      // Save via location context
      const newAddr = {
        label: newAddressForm.label,
        name: newAddressForm.name.trim(),
        phone: newAddressForm.phone,
        address: newAddressForm.address.trim(),
        landmark: newAddressForm.landmark.trim(),
        city: newAddressForm.city.trim(),
        zipCode: newAddressForm.zipCode,
        ...(resolvedLoc ? { location: resolvedLoc } : {}),
      };

      // Set as current address
      setCurrentAddress({
        type: newAddr.label,
        name: newAddr.name,
        phone: newAddr.phone,
        address: newAddr.address,
        landmark: newAddr.landmark,
        city: newAddr.city,
        zipCode: newAddr.zipCode,
        ...(resolvedLoc ? { location: resolvedLoc } : {}),
      });

      if (resolvedLoc) {
        updateLocation(
          { name: query, time: currentLocation?.time || "12-15 mins", latitude: resolvedLoc.lat, longitude: resolvedLoc.lng },
          { persist: true, updateSavedHome: false },
        );
      }

      showToast("Address saved!", "success");
      setShowAddNewAddressForm(false);
      setNewAddressForm({ label: "Home", name: "", phone: "", address: "", landmark: "", city: "", zipCode: "" });
      setIsAddressModalOpen(false);
    } catch (e) {
      showToast(e?.message || "Failed to save address", "error");
    } finally {
      setIsSavingNewAddress(false);
    }
  };

  const handleSaveEditedAddress = async () => {
    if (!editAddressForm.address.trim()) {
      showToast("Please enter your address", "error");
      return;
    }
    if (!editAddressForm.city.trim()) {
      showToast("Please enter your city", "error");
      return;
    }
    if (editAddressForm.zipCode && editAddressForm.zipCode.length > 0 && editAddressForm.zipCode.length !== 6) {
      showToast("Pincode must be exactly 6 digits", "error");
      return;
    }

    // Best-effort forward geocode so delivery pricing uses the edited address (not stale device coords).
    let location = null;
    let placeId = null;
    let formattedAddress = null;
    try {
      const query = [
        editAddressForm.address,
        editAddressForm.landmark,
        editAddressForm.city,
      ]
        .filter(Boolean)
        .join(", ");
      const resp = await customerApi.geocodeAddress(query);
      const loc = resp.data?.result?.location;
      if (
        loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
      ) {
        location = { lat: loc.lat, lng: loc.lng };
        placeId = resp.data?.result?.placeId || null;
        formattedAddress = resp.data?.result?.formattedAddress || null;
        updateLocation(
          {
            name: resp.data?.result?.formattedAddress || query,
            time: currentLocation?.time || "12-15 mins",
            city: currentLocation?.city,
            state: currentLocation?.state,
            pincode: currentLocation?.pincode,
            latitude: loc.lat,
            longitude: loc.lng,
          },
          { persist: true, updateSavedHome: false },
        );
      }
    } catch (e) {
      // If geocoding fails, keep the edited address but warn: distance-based pricing may be inaccurate.
      showToast(
        e.response?.data?.message ||
          "Could not fetch coordinates for this address. Delivery charges may be inaccurate.",
        "error",
      );
    }

    setCurrentAddress({
      ...editAddressForm,
      name: editAddressForm.name || currentAddress.name || user?.name || "",
      ...(location ? { location } : {}),
      ...(placeId ? { placeId } : {}),
      ...(formattedAddress ? { formattedAddress } : {}),
    });
    setIsEditAddressOpen(false);
    showToast("Delivery address updated", "success");
  };

  const handleUseCurrentLiveLocation = async () => {
    const result = await refreshLocation();

    if (result?.ok && result.location) {
      const liveLocation = result.location;
      setCurrentAddress((prev) => ({
        ...prev,
        address: liveLocation.name,
        landmark: "",
        city: [liveLocation.city, liveLocation.state, liveLocation.pincode]
          .filter(Boolean)
          .join(", "),
        ...(typeof liveLocation.latitude === "number" &&
        typeof liveLocation.longitude === "number"
          ? { location: { lat: liveLocation.latitude, lng: liveLocation.longitude } }
          : {}),
      }));
      showToast("Using your current live location", "success");
      return;
    }

    if (currentLocation?.name) {
      setCurrentAddress((prev) => ({
        ...prev,
        address: currentLocation.name,
        landmark: "",
        city: [currentLocation.city, currentLocation.state, currentLocation.pincode]
          .filter(Boolean)
          .join(", "),
        ...(typeof currentLocation.latitude === "number" &&
        typeof currentLocation.longitude === "number"
          ? { location: { lat: currentLocation.latitude, lng: currentLocation.longitude } }
          : {}),
      }));
      showToast("Using your last detected location", "success");
      return;
    }

    showToast(result?.error || "Unable to detect current location", "error");
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareText = `Hey! Check out ${appName} for quick grocery delivery in minutes! 🛒`;
    const shareData = { title: `${appName} - Quick Delivery`, text: shareText, url: shareUrl };

    // Try native share sheet first (works on mobile/PWA)
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return; // user cancelled — do nothing
        // Other error — fall through to modal
      }
    }

    // Desktop fallback: show share options modal
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    const shareUrl = window.location.origin;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard!", "success");
    } catch {
      showToast(shareUrl, "info");
    }
    setShowShareModal(false);
  };

  const handleApplyCoupon = async (coupon) => {
    try {
      const payload = {
        code: coupon.code,
        cartTotal,
        items: cart,
        customerId: user?._id,
      };
      const res = await customerApi.validateCoupon(payload);
      if (res.data.success) {
        const data = res.data.result;
        setSelectedCoupon({
          ...coupon,
          ...data,
        });
        setIsCouponModalOpen(false);
        showToast(`Coupon ${coupon.code} applied!`, "success");
      } else {
        showToast(res.data.message || "Unable to apply coupon", "error");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to apply coupon",
        "error",
      );
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast(`${product.name} added to cart!`, "success");
  };

  const getCartItem = (productId) => cart.find((item) => item.id === productId);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const hasValidLocation =
          Number.isFinite(currentLocation?.latitude) &&
          Number.isFinite(currentLocation?.longitude);

        const params = { limit: 10 };
        if (hasValidLocation) {
          params.lat = currentLocation.latitude;
          params.lng = currentLocation.longitude;
        }

        const res = await customerApi.getProducts(params);
        if (res.data.success) {
          const rawResult = res.data.result;
          const dbProds = Array.isArray(res.data.results)
            ? res.data.results
            : Array.isArray(rawResult?.items)
              ? rawResult.items
              : Array.isArray(rawResult)
                ? rawResult
                : [];
          const formatted = dbProds.map((p) => ({
            ...p,
            id: p._id,
            image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2",
            price: p.salePrice || p.price,
            originalPrice: p.price,
            weight: p.weight || "1 unit",
            deliveryTime: "8-15 mins"
          }));
          setRecommendedProducts(formatted);
        }
      } catch (error) {
        console.error("Failed to fetch recommended products:", error);
      }
    };
    fetchRecommendations();
  }, [currentLocation]);

  useEffect(() => {
    // Recipient data is intentionally not restored from localStorage —
    // the receiver is a different person and should be entered fresh each time.

    const fetchCoupons = async () => {
      try {
        const res = await customerApi.getActiveCoupons();
        if (res.data.success) {
          const list = res.data.result || res.data.results || [];
          setCoupons(list);
        }
      } catch {
        // silently ignore
      }
    };
    fetchCoupons();
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        CHECKOUT_STORAGE_KEY,
        JSON.stringify({
          selectedTimeSlot,
          selectedPayment,
          selectedTip,
          selectedCoupon,
          manualCode,
          currentAddress,
          recipientData,
          savedRecipient,
          showRecipientForm,
        }),
      );
    } catch {
      // ignore storage errors
    }
  }, [
    currentAddress,
    manualCode,
    recipientData,
    savedRecipient,
    selectedCoupon,
    selectedPayment,
    selectedTimeSlot,
    selectedTip,
    showRecipientForm,
  ]);

  useEffect(() => {
    if (cart.length === 0) {
      setPricingPreview(null);
      return;
    }

    setIsPreviewLoading(true);
    const subtotal = cart.reduce(
      (sum, item) =>
        sum +
        Number(item.salePrice || item.price || 0) *
          Number(item.quantity || 0),
      0,
    );
    const {
      deliveryFeeCharged,
      handlingFeeCharged,
      taxTotal,
      gstAmount,
      grandTotal,
      snapshots,
    } = calculateQuickCheckoutPricing({
      subtotal,
      discountAmount,
      selectedTip,
      feeSettings: quickBillingSettings,
      cartItems: cart,
      categoryFeeMap,
    });

    setPricingPreview({
      subtotal,
      deliveryFeeCharged,
      handlingFeeCharged,
      taxTotal,
      gstAmount,
      grandTotal,
      snapshots,
    });
    setIsPreviewLoading(false);
  }, [cart, categoryFeeMap, discountAmount, quickBillingSettings, selectedTip]);

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      if (!getCheckoutCartItemsForSync().length) {
        showToast("Cart is empty", "error");
        return;
      }

      const orderData = {
        items: getCheckoutCartItemsForSync(),
        address: buildAddressForOrder(),
        paymentMode: selectedPayment === "online" ? "ONLINE" : "COD",
        discountTotal: discountAmount,
        taxTotal: gstAmount,
        platformFee: platformFee,
        timeSlot: selectedTimeSlot,
      };

      let response;
      try {
        response = await customerApi.createOrder(orderData);
      } catch (error) {
        const errorMessage = getCheckoutErrorMessage(error).toLowerCase();

        if (
          errorMessage.includes("cart is empty") ||
          errorMessage.includes("no valid items found in cart")
        ) {
          await syncVisibleCartToBackend();
          response = await customerApi.createOrder(orderData);
        } else {
          throw error;
        }
      }

      if (response.data.success) {
        const order = response.data.result;
        const placedOrderId =
          order?.orderId || order?.orderNumber || order?.id || order?._id || "";

        const razorpayData = response.data.razorpay;
        if (selectedPayment === "online" && razorpayData) {
          try {
            await initRazorpayPayment({
              key: razorpayData.key,
              amount: razorpayData.amount,
              currency: razorpayData.currency || "INR",
              order_id: razorpayData.orderId,
              name: "Ozayra Quick Commerce",
              description: `Payment for Quick Commerce Order #${placedOrderId}`,
              prefill: {
                name: user?.name || "",
                email: user?.email || "",
                contact: user?.phone || currentAddress?.phone || ""
              },
              handler: async (paymentResponse) => {
                setIsPlacingOrder(true);
                try {
                  const verifyRes = await customerApi.verifyPayment({
                    orderId: placedOrderId,
                    razorpayOrderId: paymentResponse.razorpay_order_id,
                    razorpayPaymentId: paymentResponse.razorpay_payment_id,
                    razorpaySignature: paymentResponse.razorpay_signature
                  });
                  
                  if (verifyRes.data.success) {
                    clearCart();
                    try {
                      if (typeof window !== "undefined") {
                        window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
                        window.localStorage.removeItem(RECIPIENT_STORAGE_KEY);
                      }
                    } catch {}
                    
                    showToast("Payment successful! Order confirmed.", "success");
                    setOrderId(placedOrderId);
                    setShowSuccess(true);
                    
                    if (postOrderNavigateRef.current) {
                      clearTimeout(postOrderNavigateRef.current);
                    }
                    postOrderNavigateRef.current = setTimeout(() => {
                      postOrderNavigateRef.current = null;
                      navigate(getQuickOrderDetailPath(placedOrderId || order?._id || order?.id));
                    }, 1200);
                  } else {
                    showToast("Payment verification failed. Please try again.", "error");
                  }
                } catch (verifyErr) {
                  showToast(verifyErr?.response?.data?.message || verifyErr?.message || "Failed to verify payment", "error");
                } finally {
                  setIsPlacingOrder(false);
                }
              },
              onError: (err) => {
                showToast(err?.description || "Payment failed or cancelled", "error");
                setIsPlacingOrder(false);
              },
              onClose: () => {
                showToast("Payment window closed", "info");
                setIsPlacingOrder(false);
              }
            });
            return;
          } catch (razorpayErr) {
            showToast("Failed to initialize payment gateway", "error");
            setIsPlacingOrder(false);
            return;
          }
        }

        clearCart();
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
            window.localStorage.removeItem(RECIPIENT_STORAGE_KEY);
          }
        } catch {
          // ignore storage errors
        }

        showToast(`Order placed — waiting for seller to accept.`, "success");
        setOrderId(placedOrderId);
        setShowSuccess(true);

        if (postOrderNavigateRef.current) {
          clearTimeout(postOrderNavigateRef.current);
        }
        postOrderNavigateRef.current = setTimeout(() => {
          postOrderNavigateRef.current = null;
          navigate(getQuickOrderDetailPath(placedOrderId || order?._id || order?.id));
        }, 1200);
      }
    } catch (error) {
      console.error("Failed to place order:", error);
      showToast(
        getCheckoutErrorMessage(error) ||
          "Failed to place order. Please try again.",
        "error",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // After place order: listen for seller timeout / rejection (customer room + order room) and poll as fallback
  useEffect(() => {
    if (!orderId || !showSuccess) return undefined;

    const getToken = () => localStorage.getItem("auth_customer");
    getOrderSocket(getToken);
    joinOrderRoom(orderId, getToken);

    let pollId = null;

    const applyCancelled = (o) => {
      if (o.workflowStatus === "CANCELLED" || o.status === "cancelled") {
        if (postOrderNavigateRef.current) {
          clearTimeout(postOrderNavigateRef.current);
          postOrderNavigateRef.current = null;
        }
        if (pollId != null) clearInterval(pollId);
        setShowSuccess(false);
        showToast(
          "Order cancelled — seller did not accept in time.",
          "error",
        );
        navigate(ordersPath, { replace: true });
        return true;
      }
      return false;
    };

    const tick = () => {
      customerApi
        .getOrderDetails(orderId)
        .then((r) => {
          if (r.data?.result) applyCancelled(r.data.result);
        })
        .catch(() => {});
    };

    const off = onOrderStatusUpdate(getToken, tick);

    tick();
    pollId = setInterval(tick, 4000);

    return () => {
      off();
      if (pollId != null) clearInterval(pollId);
      leaveOrderRoom(orderId, getToken);
    };
  }, [orderId, showSuccess, navigate, ordersPath, showToast]);

  // Map-based precise location has been removed; manual addresses are used instead.

  if (loading && cart.length === 0 && !showSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-background flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#0c831f]" />
        <h2 className="mt-5 text-2xl font-black text-slate-800">Loading checkout</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Restoring your cart before checkout...
        </p>
      </div>
    );
  }

  if (cart.length === 0 && !showSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-500">
        {/* Artistic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-green-50/50 via-transparent to-transparent pointer-events-none" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -right-20 w-80 h-80 bg-green-100/30 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, -45, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 -left-20 w-60 h-60 bg-yellow-100/40 rounded-full blur-3xl pointer-events-none"
        />

        <motion.div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
          {/* Empty Cart Illustration */}
          <div className="relative w-56 h-56 md:w-64 md:h-64 mb-8 flex items-center justify-center">
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 rounded-[2rem] bg-white/90 dark:bg-card/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-emerald-100 dark:border-white/5 transition-colors">
              <Lottie
                animationData={emptyBoxAnimation}
                loop
                className="h-36 w-36 md:h-44 md:w-44"
              />
            </motion.div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full"
            />
          </div>

          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
            Your Cart is Empty
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">
            It feels lighter than air! <br />
            Explore our aisles and fill it with goodies.
          </p>

          <Link
            to={categoriesPath}
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#0c831f] to-[#10b981] text-white font-bold rounded-2xl overflow-hidden shadow-xl shadow-green-600/20 transition-all hover:scale-[1.02] active:scale-95 w-full sm:w-auto">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2 text-lg">
              Start Shopping <ChevronRight size={20} />
            </span>
          </Link>

          <div className="mt-8 flex gap-6 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-50 dark:bg-card rounded-2xl">
                <Clock size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Fast Delivery
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <Tag size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Daily Deals
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <Sparkles size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Fresh Items
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] pb-32 font-sans font-outfit relative overflow-hidden">
      {/* Decorative blurred blobs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-200/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 -left-20 w-[300px] h-[300px] bg-amber-200/10 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-emerald-100/10 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Google Outfit Typography */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
          .font-outfit {
            font-family: 'Outfit', sans-serif !important;
          }
        `
      }} />

      {/* Redesigned Minimal Sticky Header */}
      <header className="sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md shadow-sm shadow-slate-100/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-50 text-slate-650 rounded-full transition-colors active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Checkout
            </span>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight mt-0.5">
              {cartCount} {cartCount === 1 ? "Item" : "Items"} in Cart
            </h1>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="p-1.5 hover:bg-slate-50 text-slate-650 rounded-full transition-colors active:scale-95"
        >
          <Share2 size={18} />
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 relative z-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left Column: Delivery & Items */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* Delivery Time Banner (Glassmorphism & Pulse glow) */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-green-50/40 to-emerald-50/20 border border-emerald-100/80 rounded-3xl p-5 shadow-sm shadow-emerald-100/10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/20 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="h-11 w-11 rounded-2xl bg-[#0c831f] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20 relative">
                  <Clock size={20} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 border-2 border-white rounded-full animate-ping" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
                    Superfast Delivery in <span className="text-emerald-600 font-black">{currentLocation?.time || "12-15 mins"}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Shipment of {cartCount} {cartCount === 1 ? "item" : "items"} via Ozayra Quick partner
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 relative overflow-hidden transition-all hover:shadow-md">
              <div className="absolute top-0 left-0 w-[4px] h-full bg-[#0c831f]" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Delivery Address
                </h3>
                <button
                  onClick={() => setShowRecipientForm(!showRecipientForm)}
                  className="text-[#0c831f] text-xs font-bold hover:underline"
                >
                  {showRecipientForm
                    ? "Close"
                    : savedRecipient
                      ? "Change details"
                      : "Order for someone else?"}
                </button>
              </div>

              {savedRecipient && !showRecipientForm && (
                <div className="mb-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#0c831f] flex-shrink-0">
                      <Contact2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {savedRecipient.name}
                      </p>
                      <p className="text-xs text-[#0c831f] font-bold mb-1">
                        {savedRecipient.phone}
                      </p>
                      <p className="text-xs text-slate-500 leading-tight">
                        {savedRecipient.completeAddress}
                        {savedRecipient.landmark && `, ${savedRecipient.landmark}`}
                        {savedRecipient.pincode && ` - ${savedRecipient.pincode}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSavedRecipient(null);
                      try {
                        if (typeof window !== "undefined") {
                          window.localStorage.removeItem(RECIPIENT_STORAGE_KEY);
                        }
                      } catch {}
                    }}
                    className="text-red-505 text-xs font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <AnimatePresence>
                {showRecipientForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="bg-[#f8f9fb] rounded-2xl p-4 border border-slate-100 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3">
                          Enter delivery address details
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <Input
                              placeholder="Enter complete address*"
                              value={recipientData.completeAddress}
                              onChange={(e) => {
                                setRecipientData({ ...recipientData, completeAddress: e.target.value });
                                if (recipientErrors.completeAddress) setRecipientErrors((prev) => ({ ...prev, completeAddress: "" }));
                              }}
                              className={`h-11 rounded-xl text-sm ${recipientErrors.completeAddress ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                            />
                            {recipientErrors.completeAddress && (
                              <p className="text-xs text-rose-500 mt-1 ml-1">{recipientErrors.completeAddress}</p>
                            )}
                          </div>
                          <Input
                            placeholder="Find landmark (optional)"
                            value={recipientData.landmark}
                            onChange={(e) => setRecipientData({ ...recipientData, landmark: e.target.value })}
                            className="h-11 rounded-xl border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f] text-sm"
                          />
                          <div>
                            <Input
                              placeholder="Enter pin code (optional)"
                              value={recipientData.pincode}
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                setRecipientData({ ...recipientData, pincode: val });
                                if (recipientErrors.pincode) setRecipientErrors((prev) => ({ ...prev, pincode: "" }));
                              }}
                              className={`h-11 rounded-xl text-sm ${recipientErrors.pincode ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                            />
                            {recipientErrors.pincode && (
                              <p className="text-xs text-rose-500 mt-1 ml-1">{recipientErrors.pincode}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          Enter receiver details
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-3 font-medium">
                          We'll contact receiver to get the exact delivery address
                        </p>
                        <div className="space-y-3">
                          <div>
                            <Input
                              placeholder="Receiver's name*"
                              value={recipientData.name}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s]/g, "");
                                setRecipientData({ ...recipientData, name: val });
                                if (recipientErrors.name) setRecipientErrors((prev) => ({ ...prev, name: "" }));
                              }}
                              className={`h-11 rounded-xl text-sm ${recipientErrors.name ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                            />
                            {recipientErrors.name && (
                              <p className="text-xs text-rose-500 mt-1 ml-1">{recipientErrors.name}</p>
                            )}
                          </div>
                          <div>
                            <div className="relative">
                              <Input
                                placeholder="Receiver's phone number*"
                                value={recipientData.phone}
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                  setRecipientData({ ...recipientData, phone: val });
                                  if (recipientErrors.phone) setRecipientErrors((prev) => ({ ...prev, phone: "" }));
                                }}
                                className={`h-11 rounded-xl text-sm pr-10 ${recipientErrors.phone ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                              />
                              <button
                                type="button"
                                title="Pick from contacts"
                                onClick={async () => {
                                  if ("contacts" in navigator && "ContactsManager" in window) {
                                    try {
                                      const contacts = await navigator.contacts.select(["tel"], { multiple: false });
                                      if (contacts?.length && contacts[0]?.tel?.length) {
                                        const raw = contacts[0].tel[0].replace(/\D/g, "").slice(-10);
                                        setRecipientData((prev) => ({ ...prev, phone: raw }));
                                        if (recipientErrors.phone) setRecipientErrors((prev) => ({ ...prev, phone: "" }));
                                      }
                                    } catch {}
                                  } else {
                                    document.querySelector("input[placeholder=\"Receiver's phone number*\"]")?.focus();
                                  }
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0c831f] transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                              >
                                <Contact2 size={18} />
                              </button>
                            </div>
                            {recipientErrors.phone && (
                              <p className="text-xs text-rose-500 mt-1 ml-1">{recipientErrors.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveRecipient}
                        className="w-full h-11 bg-[#2d8618] hover:bg-[#236b11] text-white font-bold rounded-xl"
                      >
                        Save Address
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Selected Address Box */}
              <div className="bg-[#f8fafc] rounded-2xl p-4.5 border border-slate-100/90 flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="p-2 h-9.5 w-9.5 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-extrabold uppercase tracking-widest bg-emerald-100 text-[#0c831f] px-1.5 py-0.5 rounded-md">
                        {currentAddress.type || "Home"}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm truncate">
                        {displayName}
                      </h4>
                    </div>
                    {displayPhone && (
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {displayPhone}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">
                      {displayAddress}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenEditAddress}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold shrink-0 self-start mt-1"
                >
                  Edit
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-350 transition-colors text-center"
                >
                  Change Address
                </button>
                <button
                  onClick={handleUseCurrentLiveLocation}
                  disabled={isFetchingLocation}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-350 transition-colors text-center"
                >
                  {isFetchingLocation ? "Detecting..." : "Use Live Location"}
                </button>
              </div>
            </div>

            {/* Cart Items (Redesigned matching Cart list style) */}
            <div className="bg-white rounded-3xl border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-5">
                Items in Shipment
              </h3>
              <div className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                    <div className="h-16 w-16 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-bold text-slate-850 text-sm leading-tight truncate">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          {item.weight || "1 unit"}
                        </p>
                      </div>
                      <div>
                        <button
                          onClick={() => handleMoveToWishlist(item)}
                          className="text-[10px] text-slate-400 hover:text-[#0c831f] underline font-medium"
                        >
                          Move to wishlist
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between py-0.5">
                      <div className="flex items-center border border-slate-200 rounded-full h-8 overflow-hidden bg-slate-50/50 p-0.5 shadow-inner">
                        <button
                          onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 transition-all active:scale-90"
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="px-2 text-xs font-extrabold text-slate-800 min-w-[18px] text-center select-none font-outfit">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 transition-all active:scale-90"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                      <p className="text-sm font-extrabold text-slate-850 font-outfit mt-1">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wishlist Carousel */}
            {wishlist.filter((item) => item.name).length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 transition-colors">
                <h3 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider mb-4">
                  From Your Wishlist
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
                  {wishlist
                    .filter((item) => item.name)
                    .map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-[140px] snap-start">
                        <ProductCard product={item} compact={true} />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recommendations Carousel */}
            {recommendedProducts.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 transition-colors">
                <h3 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider mb-4">
                  You Might Also Like
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
                  {recommendedProducts.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-[140px] snap-start">
                      <ProductCard product={product} compact={true} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary & Coupons */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-[80px] pb-8">
            
            {/* Coupons Section (Ticket design) */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[4px] h-full bg-[#0c831f]" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-[#0c831f]">
                    <Tag size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Coupons
                  </h3>
                </div>
                <button
                  onClick={() => setIsCouponModalOpen(true)}
                  className="text-[#0c831f] text-xs font-bold hover:underline"
                >
                  See All
                </button>
              </div>

              {selectedCoupon ? (
                <div className="relative overflow-hidden flex items-center justify-between p-3.5 bg-emerald-50/50 border border-dashed border-emerald-250 rounded-xl">
                  {/* Ticket punches */}
                  <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-slate-50 border border-slate-100 rounded-full" />
                  <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-slate-50 border border-slate-100 rounded-full" />
                  
                  <div className="min-w-0 flex-1 px-2">
                    <p className="font-bold text-emerald-800 text-xs uppercase tracking-widest">
                      {selectedCoupon.code} Applied
                    </p>
                    <p className="text-[10px] text-emerald-705 mt-0.5 truncate font-medium">
                      Saved ₹{discountAmount} on this order
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCoupon(null)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 z-10 px-2"
                  >
                    Remove
                  </button>
                </div>
              ) : coupons.length > 0 ? (
                <div 
                  className="relative overflow-hidden flex items-center justify-between p-3.5 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer" 
                  onClick={() => setIsCouponModalOpen(true)}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-slate-50 border border-slate-100 rounded-full" />
                  <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-slate-50 border border-slate-100 rounded-full" />
                  
                  <span className="text-xs text-slate-500 font-medium pl-2">Apply coupon to save money</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              ) : (
                <p className="text-xs text-slate-400">No coupons available for this order.</p>
              )}
            </div>

            {/* Tip for Partner */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[4px] h-full bg-rose-500" />
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500">
                  <Heart size={16} className="fill-rose-500" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Tip your partner
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                100% of the tip goes to your delivery partner
              </p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {tipAmounts.map((tip) => (
                  <button
                    key={tip.value}
                    onClick={() => {
                      setSelectedTip(tip.value);
                      setCustomTip("");
                    }}
                    className={`py-2 rounded-xl border transition-all font-bold text-xs ${
                      selectedTip === tip.value && !customTip
                        ? "border-rose-500 bg-rose-50/30 text-rose-600 shadow-sm"
                        : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tip.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  placeholder="Enter custom tip amount (₹)"
                  value={customTip}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setCustomTip(val);
                    setSelectedTip(val ? Number(val) : 0);
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-rose-350 transition-colors"
                />
                {customTip && (
                  <button
                    onClick={() => { setCustomTip(""); setSelectedTip(0); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[4px] h-full bg-[#0c831f]" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4">
                Payment Method
              </h3>
              <div className="space-y-2.5">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPayment === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`w-full p-3.5 rounded-xl border transition-all flex items-center gap-3.5 text-left ${
                        isSelected
                          ? "border-[#0c831f] bg-green-50/10 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isSelected ? "bg-green-100 text-[#0c831f]" : "bg-slate-50 text-slate-500"}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-xs ${isSelected ? "text-green-800" : "text-slate-700"}`}>
                          {method.label}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {method.sublabel}
                        </p>
                      </div>
                      <div className={`h-[18px] w-[18px] rounded-full border flex items-center justify-center ${isSelected ? "border-[#0c831f] bg-[#0c831f]" : "border-slate-300"}`}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Summary & Pricing Details */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/90 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[4px] h-full bg-slate-800" />
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg bg-slate-50 text-slate-700">
                  <Clipboard size={16} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Bill Details
                </h3>
              </div>
              <div className="space-y-3.5 text-xs text-slate-500 font-medium">
                <div className="flex items-center justify-between">
                  <span>Items Total</span>
                  <div className="flex items-baseline gap-2">
                    {originalItemsTotal > discountedItemsTotal && (
                      <span className="text-[10px] text-slate-400 line-through">₹{originalItemsTotal}</span>
                    )}
                    <span className="font-bold text-slate-800">₹{discountedItemsTotal}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-slate-800">
                    {deliveryFee === 0 ? <span className="text-emerald-600 font-extrabold uppercase tracking-wide text-[10px]">Free</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Handling Charge</span>
                  <span className="font-bold text-slate-800">₹{handlingFee}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform Fee</span>
                  <span className="font-bold text-slate-800">₹{platformFee}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>GST & Taxes</span>
                  <span className="font-bold text-slate-800">₹{gstAmount}</span>
                </div>

                {selectedCoupon && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold bg-emerald-50/50 p-2.5 rounded-xl border border-dashed border-emerald-200">
                    <span>Coupon Discount</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}

                {selectedTip > 0 && (
                  <div className="flex justify-between items-center text-rose-500 font-bold bg-rose-50/50 p-2.5 rounded-xl border border-dashed border-rose-200">
                    <span>Rider Tip</span>
                    <span>+₹{selectedTip}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-5 mt-3">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                    <span className="font-extrabold uppercase tracking-wide">To Pay</span>
                    <span className="text-xl text-slate-900 font-black font-outfit">₹{totalAmount}</span>
                  </div>
                </div>

                {/* Desktop Action Button / SlideToPay */}
                <div className="hidden lg:block pt-5 border-t border-slate-50 mt-4">
                  {selectedPayment === "cash" ? (
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isPlacingOrder || isPreviewLoading || !pricingPreview}
                      className="w-full py-4 rounded-xl bg-[#0c831f] hover:bg-[#0b721b] text-white font-extrabold text-sm tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isPlacingOrder ? "Placing Order..." : `Place Order | ₹${totalAmount}`}
                    </button>
                  ) : (
                    <SlideToPay
                      amount={totalAmount}
                      onSuccess={handlePlaceOrder}
                      isLoading={isPlacingOrder || isPreviewLoading || !pricingPreview}
                      text="Slide to Pay"
                    />
                  )}
                  <p className="text-center text-[9px] text-slate-400 font-bold mt-4 uppercase tracking-widest">
                    🔒 Secure 256-bit SSL checkout
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sticky Mobile Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-150 px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-50 rounded-t-3xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To Pay</p>
            <span className="text-2xl font-extrabold text-slate-900 leading-none font-outfit">
              ₹{totalAmount}
            </span>
          </div>
          <div className="flex-1 max-w-[240px]">
            {selectedPayment === "cash" ? (
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || isPreviewLoading || !pricingPreview}
                className="w-full py-3 h-12 flex items-center justify-center rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm tracking-wide transition-colors"
              >
                {isPlacingOrder ? "Placing..." : `Place Order`}
              </button>
            ) : (
              <SlideToPay
                amount={totalAmount}
                onSuccess={handlePlaceOrder}
                isLoading={isPlacingOrder || isPreviewLoading || !pricingPreview}
                text="Slide to Pay"
              />
            )}
          </div>
        </div>
      </div>

      {/* Address Selection Modal */}
      {/* Select Delivery Address Modal */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setIsAddressModalOpen(false); setShowAddNewAddressForm(false); setNewAddressErrors({}); }}
            />
            {/* Modal */}
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Select Delivery Address</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Choose where you want your order delivered</p>
                </div>
                <button
                  onClick={() => { setIsAddressModalOpen(false); setShowAddNewAddressForm(false); setNewAddressErrors({}); }}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Address List */}
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
                {locationSavedAddresses.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-6">No saved addresses yet.</p>
                )}
                {locationSavedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleSelectSavedAddress(addr)}
                    disabled={isResolvingAddressCoords}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                      currentAddress.id === addr.id
                        ? "border-[#0c831f] bg-green-50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-full ${currentAddress.id === addr.id ? "bg-[#0c831f] text-white" : "bg-slate-100 text-slate-500"}`}>
                        <MapPin size={16} />
                      </div>
                      <span className="font-black text-slate-800 uppercase tracking-widest text-[10px]">
                        {addr.label}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {addr.name || user?.name || currentAddress.name || "Customer"}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-1">{addr.address}</p>
                    {addr.phone && (
                      <p className="text-[11px] text-slate-400 font-medium">Phone: {addr.phone}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex-shrink-0">
                {!showAddNewAddressForm ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-[#0c831f] text-[#0c831f] hover:bg-green-50 rounded-2xl font-bold"
                    onClick={() => setShowAddNewAddressForm(true)}
                  >
                    <Plus size={16} className="mr-2" /> Add New Address
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-slate-800">New Address</h3>
                      <button
                        onClick={() => { setShowAddNewAddressForm(false); setNewAddressErrors({}); }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >Cancel</button>
                    </div>

                    {/* Label selector */}
                    <div className="flex gap-2">
                      {["Home", "Office", "Other"].map((lbl) => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setNewAddressForm((p) => ({ ...p, label: lbl }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${newAddressForm.label === lbl ? "border-[#0c831f] bg-green-50 text-[#0c831f]" : "border-slate-200 text-slate-500"}`}
                        >{lbl}</button>
                      ))}
                    </div>

                    {/* Name */}
                    <div>
                      <Input
                        placeholder="Full name*"
                        value={newAddressForm.name}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s]/g, "");
                          setNewAddressForm((p) => ({ ...p, name: val }));
                          if (newAddressErrors.name) setNewAddressErrors((p) => ({ ...p, name: "" }));
                        }}
                        className={`h-10 rounded-xl text-sm ${newAddressErrors.name ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                      />
                      {newAddressErrors.name && <p className="text-xs text-rose-500 mt-0.5 ml-1">{newAddressErrors.name}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <Input
                        placeholder="Phone number*"
                        value={newAddressForm.phone}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setNewAddressForm((p) => ({ ...p, phone: val }));
                          if (newAddressErrors.phone) setNewAddressErrors((p) => ({ ...p, phone: "" }));
                        }}
                        className={`h-10 rounded-xl text-sm ${newAddressErrors.phone ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                      />
                      {newAddressErrors.phone && <p className="text-xs text-rose-500 mt-0.5 ml-1">{newAddressErrors.phone}</p>}
                    </div>

                    {/* Address */}
                    <div>
                      <Input
                        placeholder="House, street, area*"
                        value={newAddressForm.address}
                        onChange={(e) => {
                          setNewAddressForm((p) => ({ ...p, address: e.target.value }));
                          if (newAddressErrors.address) setNewAddressErrors((p) => ({ ...p, address: "" }));
                        }}
                        className={`h-10 rounded-xl text-sm ${newAddressErrors.address ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                      />
                      {newAddressErrors.address && <p className="text-xs text-rose-500 mt-0.5 ml-1">{newAddressErrors.address}</p>}
                    </div>

                    {/* Landmark */}
                    <Input
                      placeholder="Landmark (optional)"
                      value={newAddressForm.landmark}
                      onChange={(e) => setNewAddressForm((p) => ({ ...p, landmark: e.target.value }))}
                      className="h-10 rounded-xl border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f] text-sm"
                    />

                    {/* City + Pincode */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          placeholder="City*"
                          value={newAddressForm.city}
                          onChange={(e) => {
                            setNewAddressForm((p) => ({ ...p, city: e.target.value }));
                            if (newAddressErrors.city) setNewAddressErrors((p) => ({ ...p, city: "" }));
                          }}
                          className={`h-10 rounded-xl text-sm ${newAddressErrors.city ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                        />
                        {newAddressErrors.city && <p className="text-xs text-rose-500 mt-0.5 ml-1">{newAddressErrors.city}</p>}
                      </div>
                      <div>
                        <Input
                          placeholder="Pincode"
                          value={newAddressForm.zipCode}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setNewAddressForm((p) => ({ ...p, zipCode: val }));
                            if (newAddressErrors.zipCode) setNewAddressErrors((p) => ({ ...p, zipCode: "" }));
                          }}
                          className={`h-10 rounded-xl text-sm ${newAddressErrors.zipCode ? "border-rose-400" : "border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"}`}
                        />
                        {newAddressErrors.zipCode && <p className="text-xs text-rose-500 mt-0.5 ml-1">{newAddressErrors.zipCode}</p>}
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveNewAddress}
                      disabled={isSavingNewAddress}
                      className="w-full h-11 rounded-2xl bg-[#0c831f] hover:bg-[#0b721b] text-white font-bold"
                    >
                      {isSavingNewAddress ? "Saving..." : "Save Address"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Current Address Modal */}
      <AnimatePresence>
        {isEditAddressOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditAddressOpen(false)}
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit Delivery Address</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Update your current delivery address</p>
                </div>
                <button
                  onClick={() => setIsEditAddressOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <div className="px-5 py-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-address" className="text-xs font-semibold text-slate-700">Address</Label>
                  <Input
                    id="edit-address"
                    value={editAddressForm.address}
                    onChange={(e) => setEditAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"
                    placeholder="House, street, area"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-landmark" className="text-xs font-semibold text-slate-700">Nearest Landmark (optional)</Label>
                  <Input
                    id="edit-landmark"
                    value={editAddressForm.landmark || ""}
                    onChange={(e) => setEditAddressForm((prev) => ({ ...prev, landmark: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"
                    placeholder="e.g. Near City Mall, Opp. Temple"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-city" className="text-xs font-semibold text-slate-700">City</Label>
                    <Input
                      id="edit-city"
                      value={editAddressForm.city || ""}
                      onChange={(e) => setEditAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                      className="h-11 rounded-xl border-slate-200 focus:ring-[#0c831f] focus:border-[#0c831f]"
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-pincode" className="text-xs font-semibold text-slate-700">Pincode</Label>
                    <Input
                      id="edit-pincode"
                      value={editAddressForm.zipCode || ""}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setEditAddressForm((prev) => ({ ...prev, zipCode: val }));
                      }}
                      className={`h-11 rounded-xl focus:ring-[#0c831f] focus:border-[#0c831f] ${
                        editAddressForm.zipCode && editAddressForm.zipCode.length > 0 && editAddressForm.zipCode.length !== 6
                          ? "border-rose-400"
                          : "border-slate-200"
                      }`}
                      placeholder="6-digit code"
                    />
                    {editAddressForm.zipCode && editAddressForm.zipCode.length > 0 && editAddressForm.zipCode.length !== 6 && (
                      <p className="text-xs text-rose-500 mt-1">Must be 6 digits</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-6 pt-2 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsEditAddressOpen(false)}
                  className="flex-1 h-11 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditedAddress}
                  className="flex-1 h-11 rounded-2xl bg-[#0c831f] hover:bg-[#0b721b] text-white font-bold"
                >
                  Save changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupon Selection Modal */}
      <AnimatePresence>
        {isCouponModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsCouponModalOpen(false)}
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-md bg-white rounded-[28px] shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Apply Coupon</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Browse available offers and save more.</p>
                </div>
                <button
                  onClick={() => setIsCouponModalOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Coupon List */}
              <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1">
                {coupons.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-6">No coupons available right now.</p>
                )}
                {coupons.map((coupon) => (
                  <div
                    key={coupon.code}
                    className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                      selectedCoupon?.code === coupon.code
                        ? "border-[#0c831f] bg-green-50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}>
                    {selectedCoupon?.code === coupon.code && (
                      <div className="absolute top-0 right-0 p-1.5 bg-[#0c831f] text-white rounded-bl-xl">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-2xl flex-shrink-0 ${selectedCoupon?.code === coupon.code ? "bg-[#0c831f]/10 text-[#0c831f]" : "bg-orange-50 text-orange-500"}`}>
                        <Tag size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800 tracking-wider mb-1">{coupon.code}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{coupon.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyCoupon(coupon)}
                      disabled={selectedCoupon?.code === coupon.code}
                      className={`w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        selectedCoupon?.code === coupon.code
                          ? "bg-white text-[#0c831f] border-2 border-[#0c831f] cursor-default"
                          : "bg-[#0c831f] text-white hover:bg-[#0b721b]"
                      }`}>
                      {selectedCoupon?.code === coupon.code ? "Applied ✓" : "Apply Now"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Manual code input */}
              <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    placeholder="Enter coupon code manually"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="pl-10 h-12 rounded-xl focus-visible:ring-[#0c831f]"
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0c831f] font-bold text-xs"
                    onClick={async () => {
                      if (!manualCode.trim()) {
                        showToast("Please enter a coupon code", "error");
                        return;
                      }
                      try {
                        const res = await customerApi.validateCoupon({
                          code: manualCode.trim(),
                          cartTotal,
                          items: cart,
                          customerId: user?._id,
                        });
                        if (res.data.success) {
                          const data = res.data.result;
                          setSelectedCoupon({
                            code: manualCode.trim(),
                            description: "Applied manually",
                            ...data,
                          });
                          showToast(`Coupon ${manualCode.trim()} applied!`, "success");
                        } else {
                          showToast(res.data.message || "Invalid coupon", "error");
                        }
                      } catch (error) {
                        showToast(error.response?.data?.message || "Invalid coupon", "error");
                      }
                    }}>
                    CHECK
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-[#0c831f] mb-6">
              <Check size={48} strokeWidth={4} />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-slate-800 mb-2">
              Order placed
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 font-medium mb-8">
              #{orderId?.slice(-6)} — waiting for the seller to accept (60s). If
              they don&apos;t, the order will cancel automatically.
              <br />
              Redirecting to order details…
            </motion.p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "linear" }}
              className="w-48 h-1.5 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0c831f]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `,
        }}
      />

      {/* Share Modal — shown on desktop where native share sheet isn't available */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-1">Share {appName}</h3>
              <p className="text-sm text-slate-500 mb-5">Choose how you'd like to share</p>

              <div className="space-y-3">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hey! Check out ${appName} for quick grocery delivery in minutes! ${window.location.origin}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowShareModal(false)}
                  className="flex items-center gap-3 w-full rounded-2xl border-2 border-slate-100 p-3 hover:border-green-200 hover:bg-green-50 transition-all"
                >
                  <div className="h-10 w-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-black text-lg flex-shrink-0">W</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">WhatsApp</p>
                    <p className="text-xs text-slate-500">Share via WhatsApp</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-slate-400" />
                </a>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 w-full rounded-2xl border-2 border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50 transition-all text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Clipboard size={18} className="text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">Copy Link</p>
                    <p className="text-xs text-slate-500 truncate">{window.location.origin}</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-slate-400 flex-shrink-0" />
                </button>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="mt-4 w-full rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckoutPage;
