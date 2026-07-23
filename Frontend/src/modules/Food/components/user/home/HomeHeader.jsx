import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  ChevronDown,
  Search,
  Mic,
  Bookmark,
  Wallet,
  Bell,
  BellOff,
  X,
  ShoppingCart,
  Pizza,
  Beef,
  ChefHat,
  Soup,
  Coffee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@food/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@food/components/ui/popover";
import { Badge } from "@food/components/ui/badge";
import foodPattern from "@food/assets/food_pattern_background.webp";
import useNotificationInbox from "@food/hooks/useNotificationInbox";

const tabs = [
  {
    id: "food",
    name: "Food",
    icon: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
  },
  {
    id: "quick",
    name: "Instamart",
    icon: "https://cdn-icons-png.flaticon.com/512/3724/3724720.png",
    badge: "15 mins",
  },
  {
    id: "taxi",
    name: "Dineout",
    icon: "https://cdn-icons-png.flaticon.com/512/2515/2515183.png",
  },
  {
    id: "hotel",
    name: "Explore",
    icon: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    route: "/user/auth/portal",
  },
];

const normalizeHex = (hex, fallback = "#8e24aa") => {
  const value = String(hex || "").trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
};

const withAlpha = (hex, alpha) => {
  const value = normalizeHex(hex).slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const shiftHex = (hex, amount) => {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return hex;

  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  const value = normalized.slice(1);
  if (value.length !== 6) return hex;

  const clamp = (num) => Math.max(0, Math.min(255, num + amount));
  const r = clamp(parseInt(value.slice(0, 2), 16));
  const g = clamp(parseInt(value.slice(2, 4), 16));
  const b = clamp(parseInt(value.slice(4, 6), 16));

  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};

const quickTheme = (baseColor) => {
  const base = normalizeHex(baseColor, "#0c831f");
  const isWhite = base.toLowerCase() === "#ffffff" || base.toLowerCase() === "#fff";
  
  return {
    topBg: isWhite ? "#ffffff" : `linear-gradient(180deg, ${shiftHex(base, -20)} 0%, ${shiftHex(base, 0)} 100%)`,
    accent: base,
    text: "#ffffff",
    activeBg: base,
    activeText: "#ffffff",
    inactiveBg: isWhite ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.3)",
    inactiveBorder: isWhite ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)",
  };
};

const foodTheme = (vegMode) => {
  const base = vegMode ? "#2f7a46" : "#F6881F";
  return {
    topBg: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%), ${base}`,
    accent: base,
    text: "#ffffff",
    activeBg: base,
    activeText: "#ffffff",
    inactiveBg: "rgba(0,0,0,0.25)",
    inactiveBorder: "rgba(255,255,255,0.08)",
  };
};

const isMeaningfulLocationValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(
    normalized &&
      normalized !== "select location" &&
      normalized !== "current location"
  );
};

const buildLocationDisplay = (savedAddressText, location) => {
  if (isMeaningfulLocationValue(savedAddressText)) {
    const parts = String(savedAddressText)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 3) {
      return {
        title: parts.slice(0, 2).join(", "),
        subtitle: parts.slice(2).join(", "),
      };
    }

    if (parts.length === 2) {
      return {
        title: parts.join(", "),
        subtitle: "Tap to choose delivery location",
      };
    }

    return {
      title: String(savedAddressText).trim(),
      subtitle: "Tap to choose delivery location",
    };
  }

  const fallbackTitle =
    location?.area || location?.city || "Select Location";
  const fallbackSubtitle =
    location?.address || location?.city || "Tap to choose delivery location";

  return {
    title: fallbackTitle,
    subtitle: fallbackSubtitle,
  };
};

export default function HomeHeader({
  activeTab,
  setActiveTab,
  location,
  savedAddressText,
  handleLocationClick,
  handleSearchFocus,
  placeholderIndex,
  placeholders,
  vegMode = false,
  onVegModeChange,
  headerVideoUrl,
  quickThemeColor,
  onQuickTabIntent,
  bannerComponent,
}) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const routerLocation = useRouterLocation();
  const videoRef = useRef(null);
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("food_user_notifications");
    return saved ? JSON.parse(saved) : [];
  });
  const {
    items: broadcastNotifications,
    unreadCount: broadcastUnreadCount,
    dismiss: dismissBroadcastNotification,
  } = useNotificationInbox("user", { limit: 20 });

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("food_user_notifications");
      setNotifications(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener("notificationsUpdated", sync);
    return () => window.removeEventListener("notificationsUpdated", sync);
  }, []);

  const theme = activeTab === "quick" ? quickTheme(quickThemeColor) : foodTheme(vegMode);
  const isFood = activeTab === "food";
  const walletPath = isFood ? "/food/user/wallet" : "/quick/wallet";
  const { title: locationTitle, subtitle: locationSubtitle } = useMemo(
    () => buildLocationDisplay(savedAddressText, location),
    [savedAddressText, location],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isFood) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
      return;
    }

    video.pause();
  }, [isFood]);

  const mergedNotifications = useMemo(() => {
    const localItems = Array.isArray(notifications)
      ? notifications.map((item) => ({ ...item, source: "local" }))
      : [];
    const remoteItems = (broadcastNotifications || []).map((item) => ({
      ...item,
      id: item.id || item._id,
      source: "broadcast",
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "Just now",
    }));
    return [...remoteItems, ...localItems].sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() -
        new Date(a.createdAt || a.timestamp || 0).getTime(),
    );
  }, [broadcastNotifications, notifications]);

  const unreadCount =
    notifications.filter((item) => !item.read).length + broadcastUnreadCount;

  const removeNotification = (id, source) => {
    if (source === "broadcast") {
      dismissBroadcastNotification(id);
      return;
    }
    setNotifications((prev) => {
      const next = prev.filter((item) => item.id !== id);
      localStorage.setItem("food_user_notifications", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
      return next;
    });
  };

  const handleVoiceSearch = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        if (activeTab === "quick") {
          navigate("/quick/search", { state: { query: transcript } });
        } else {
          // For food search, we might need to trigger the overlay or redirect to a dedicated search page
          // Based on Home.jsx, it opens an overlay. But we can redirect to the search page if available.
          navigate("/food/user/search", { state: { query: transcript } });
        }
      }
    };
    recognition.start();
  };

  return (
    <motion.div
      className={`relative transition-all duration-400 ${
        isFood
          ? "min-h-[280px] overflow-hidden"
          : "min-h-[60px] overflow-visible"
      }`}
      style={{ background: theme.topBg, color: theme.text, fontFamily: !isFood ? "'Okra', 'Outfit', sans-serif" : undefined }}
    >
      {headerVideoUrl && (
        <div className="absolute inset-0 z-0 flex justify-center overflow-hidden">
            {/* Video temporarily removed to improve loading time
            <video
              ref={videoRef}
              src={headerVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              className={`h-full w-full object-cover object-center transition-opacity duration-200 ${
                isFood ? "opacity-100" : "opacity-0"
              }`}
            />
            */}
          <div 
            className="absolute inset-0 transition-colors duration-700" 
            style={{ 
              background: `linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%), ${theme.accent}` 
            }} 
          />
          <div 
            className="absolute inset-0 transition-colors duration-700 opacity-30"
            style={{
              background: `radial-gradient(circle at 20% 30%, ${withAlpha(theme.accent, 0.4)}, transparent 70%)`
            }}
          />
        </div>
      )}

      {isFood && (
        <div
          className="absolute inset-0 z-[1] opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage: `url(${foodPattern})`,
            backgroundSize: "200px",
            backgroundRepeat: "repeat",
            mixBlendMode: "overlay",
          }}
        />
      )}

      {isFood && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Pizza className="absolute top-10 right-[15%] opacity-[0.10]" style={{ color: theme.accent }} size={64} />
          <Beef className="absolute top-40 left-[10%] opacity-[0.08]" style={{ color: theme.accent }} size={80} />
          <ChefHat className="absolute bottom-[20%] right-[20%] opacity-[0.08]" style={{ color: theme.accent }} size={56} />
          <Coffee className="absolute top-20 left-[30%] opacity-[0.08]" style={{ color: theme.accent }} size={48} />
          <Soup className="absolute bottom-[40%] left-[5%] opacity-[0.05]" style={{ color: theme.accent }} size={72} />
        </div>
      )}

      {!isFood && activeTab === "quick" && (
        <>
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full">
              <circle cx="10" cy="10" r="20" fill="white" />
              <circle cx="90" cy="20" r="15" fill="white" />
              <circle cx="50" cy="80" r="25" fill="white" />
              <path d="M 0 50 Q 25 30 50 50 T 100 50" stroke="white" strokeWidth="0.5" fill="none" />
              <path d="M 0 70 Q 25 50 50 70 T 100 70" stroke="white" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
          <div
            className="absolute top-0 left-1/4 h-24 w-24 rounded-full blur-[48px] pointer-events-none"
            style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
          />
        </>
      )}

      <div className="flex items-center justify-between px-5 pt-4 mb-2 relative z-10">
        <button
          type="button"
          className="flex items-start gap-2 cursor-pointer flex-1 min-w-0 bg-transparent border-0 p-0 text-left outline-none"
          onClick={handleLocationClick}
        >
          {isFood ? (
            <>
              <Navigation
                className="h-[14px] w-[14px] rotate-[15deg] mt-[5px] shrink-0"
                style={{ color: theme.accent, fill: theme.accent }}
                strokeWidth={2.5}
              />
              <div className="flex min-w-0 max-w-[190px] flex-col">
                <div className="flex items-center gap-[3px]">
                  <span className="truncate text-[16px] font-extrabold tracking-[-0.3px]">
                    {locationTitle}
                  </span>
                  <ChevronDown className="h-[14px] w-[14px] shrink-0 opacity-80" strokeWidth={3} />
                </div>
                <span className="max-w-[190px] truncate text-[11px] font-medium text-white/75">
                  {locationSubtitle}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col pt-0.5">
              {/* Small "Blinkit in" text */}
              <span className="text-[11px] font-extrabold text-slate-900 mb-[2px] tracking-tight">
                Blinkit in
              </span>
              
              {/* Large "12 minutes" + Pill */}
              <div className="flex items-end gap-2 mb-1.5">
                <span className="text-[28px] font-black text-slate-900 tracking-tighter leading-none -mt-1 block">
                  12 minutes
                </span>
                
                {/* Distance Pill */}
                <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[#087878] mb-0.5 shadow-sm border border-white/20">
                  <ShoppingCart className="h-[11px] w-[11px]" strokeWidth={2.5} />
                  <span className="text-[9px] font-extrabold tracking-tight">990 m away</span>
                </div>
              </div>

              {/* Location row */}
              <div className="flex items-center gap-0.5 text-slate-800 cursor-pointer group active:scale-95 transition-transform border-0 bg-transparent p-0 text-left">
                <div className="text-[12px] font-medium leading-tight max-w-[250px] truncate flex items-center gap-1">
                  <span className="font-extrabold uppercase tracking-wide text-slate-900">
                    {location?.type || "HOME"}
                  </span> 
                  <span className="opacity-90 text-[11px]">- {locationTitle}{locationSubtitle && locationSubtitle !== "Tap to choose delivery location" ? `, ${locationSubtitle}` : ""}</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-80 mt-px" />
              </div>
            </div>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0 pl-1">
          {isFood ? (
            <>
              <Link
                to={walletPath}
                className="h-[38px] w-[38px] rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                aria-label="Open wallet"
              >
                <Wallet className="h-[19px] w-[19px] text-[#282c3f]" strokeWidth={2} />
              </Link>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative h-[38px] w-[38px] rounded-full bg-white/95 border border-white/60 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  >
                    <Bell className="h-[18px] w-[18px] text-[#282c3f]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-yellow-400 border border-white" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl mt-2" align="end">
                  <div className="bg-white">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        Notifications
                        {unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none text-[10px] h-4">
                            {unreadCount} New
                          </Badge>
                        )}
                      </h3>
                      <Link to="/food/user/notifications" className="text-xs font-bold text-orange-600">
                        {mergedNotifications.length > 0 ? "View All" : ""}
                      </Link>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {mergedNotifications.length > 0 ? (
                        mergedNotifications.slice(0, 5).map((item, index) => (
                          <div key={item.id || `notif-${index}`} className="p-4 flex items-start gap-3 border-b border-gray-50 last:border-0">
                            <div className="mt-1 p-2 rounded-full bg-orange-100/50 text-orange-600">
                              <Bell className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-sm font-bold text-gray-900 truncate">{item.title}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{item.time}</span>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      removeNotification(item.id, item.source);
                                    }}
                                    className="rounded-full p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.message}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center flex flex-col items-center gap-2">
                          <BellOff className="h-10 w-10 text-gray-200" />
                          <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Link
                to="/food/user/cart"
                className="h-[38px] w-[38px] rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                aria-label="Open cart"
              >
                <ShoppingCart className="h-[20px] w-[20px] text-[#282c3f]" strokeWidth={2} />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {/* Wallet Icon (₹0) */}
              <div onClick={() => navigate(walletPath)} className="flex flex-col items-center justify-center bg-white rounded-[14px] shadow-sm min-w-[38px] h-[38px] cursor-pointer active:scale-95 transition-transform">
                <Wallet className="h-[17px] w-[17px] text-[#b48c1e] mt-[2px]" strokeWidth={2.5} />
                <span className="text-[9px] font-black mt-[1px] leading-none text-slate-900">₹0</span>
              </div>
              
              {/* Profile Icon */}
              <div onClick={() => navigate("/quick/profile")} className="flex items-center justify-center bg-white rounded-[14px] shadow-sm w-[38px] h-[38px] cursor-pointer active:scale-95 transition-transform">
                <div className="bg-slate-900 rounded-full w-[22px] h-[22px] flex items-center justify-center overflow-hidden">
                  <svg className="w-[19px] h-[19px] text-white mt-[4px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs (Food, Instamart, Dineout, Explore) removed per user request */}

      <div className="relative z-10 pt-0 pb-0 px-3 -mt-[1px] overflow-visible">
        {isFood ? (
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex-1 rounded-[12px] h-[46px] flex items-center px-3 cursor-pointer relative overflow-hidden bg-white shadow-[0_6px_18px_rgba(15,23,42,0.10)] border-0 text-left"
              onClick={handleSearchFocus}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-l-[12px] bg-gradient-to-b from-[#F6881F] to-[#FF5E3A]" />
              <Search className="h-[16px] w-[16px] ml-1.5 mr-2 flex-shrink-0 text-[#F6881F]" strokeWidth={2.3} />
              <div className="flex-1 overflow-hidden relative h-[20px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 whitespace-nowrap leading-[22px] text-[12.5px] font-medium text-gray-400"
                  >
                    {placeholders?.[placeholderIndex] || "Search for food..."}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-[1px] h-[16px] bg-orange-200" />
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={cn(
                    "h-[28px] w-[28px] rounded-full flex items-center justify-center transition-all",
                    isListening ? "bg-orange-500 scale-110 animate-pulse" : "bg-orange-50 hover:bg-orange-100"
                  )}
                >
                  <Mic className={cn("h-[14px] w-[14px]", isListening ? "text-white" : "text-[#F6881F]")} strokeWidth={2.3} />
                </button>
              </div>
            </div>

            <div className="px-2 flex flex-col items-center justify-center min-w-[64px]">
              <div className="flex flex-col items-center mb-1">
                <span className="text-[9px] font-black tracking-[0.5px] text-black dark:text-white leading-none">VEG</span>
                <span className="text-[7px] font-black tracking-[0.5px] text-black/60 dark:text-white/60 leading-none mt-0.5">MODE</span>
              </div>
              <div className="scale-[0.80]">
                <Switch
                  checked={vegMode}
                  onCheckedChange={(checked) => onVegModeChange?.(checked)}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pb-2 pt-1 px-1">
            <div
              className="flex-1 rounded-[12px] h-[46px] flex items-center px-4 cursor-pointer bg-white shadow-md shadow-black/5 border border-slate-100 text-left transition-all active:scale-[0.98]"
              onClick={handleSearchFocus}
            >
              <Search className="h-[18px] w-[18px] mr-2 text-slate-500" strokeWidth={2} />
              <div className="flex-1 overflow-hidden relative h-[20px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 whitespace-nowrap leading-[22px] text-[13.5px] font-semibold text-slate-400 tracking-tight"
                  >
                    {placeholders?.[placeholderIndex] || 'Search "birthday gift"'}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 border-l border-slate-200 pl-3 ml-2">
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    isListening ? "text-green-600 scale-110 animate-pulse" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Mic className="h-[20px] w-[20px]" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isFood && bannerComponent && (
        <div className="relative z-10 w-full pb-5 pt-1">
          {bannerComponent}
        </div>
      )}
    </motion.div>
  );
}
