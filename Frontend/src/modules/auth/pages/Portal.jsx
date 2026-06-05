import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { useLocation, useNavigate } from "react-router-dom"
import { UtensilsCrossed, ShoppingBasket, Car, Bed, ShieldCheck, User } from "lucide-react"
import { hasLocalUserToken } from "../../taxi/modules/user/services/authService"
import { cn } from "@food/utils/utils"

const SERVICES = [
  {
    id: "grocery",
    name: "Quick Commerce",
    description: "20-Min Essentials",
    image: "/super-app/grocery_color.png",
    path: "/quick",
    icon: ShoppingBasket,
    color: "from-[#4CAF50] to-[#2DAB52]",
    badge: "Instant",
    badgeIcon: "⏱️"
  },
  {
    id: "taxi",
    name: "Taxi",
    description: "Safe city rides",
    image: "/super-app/taxi_color.png",
    path: "/taxi/user",
    icon: Car,
    color: "from-[#333333] to-[#000000]",
    badge: "Safe",
    badgeIcon: "🛡️"
  }
]

export default function SuperAppPortal() {
  const location = useLocation()
  const navigate = useNavigate()
  const redirectTo = typeof location.state?.redirectTo === "string" && location.state.redirectTo.trim()
    ? location.state.redirectTo.trim()
    : ""
  const isNativeLikeShell = typeof window !== "undefined" && (
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.ReactNativeWebView) ||
    String(window.location?.protocol || "").toLowerCase() === "file:" ||
    String(window.navigator?.userAgent || "").toLowerCase().includes(" wv") ||
    String(window.navigator?.userAgent || "").toLowerCase().includes("; wv") ||
    String(window.navigator?.userAgent || "").toLowerCase().includes("flutterwebview")
  )
  const particlePositions = useMemo(
    () => Array.from({ length: 6 }, (_, index) => ({
      id: index,
      left: `${12 + index * 14}%`,
      top: `${10 + (index % 3) * 24}%`,
    })),
    [],
  )

  const [enabledModules, setEnabledModules] = React.useState({
    food: false,
    taxi: true,
    quickCommerce: true,
    hotel: false
  })

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getCachedSettings, loadBusinessSettings } = await import("../../common/utils/businessSettings")
        let settings = getCachedSettings()
        if (!settings) {
          settings = await loadBusinessSettings()
        }
        if (settings?.modules) {
          setEnabledModules(settings.modules)
        }
      } catch (err) {
        console.error("Failed to load settings in Portal:", err)
      }
    }
    loadSettings()
  }, [])

  const filteredServices = useMemo(() => {
    return SERVICES.filter(service => {
      const moduleKey = service.id === 'grocery' ? 'quickCommerce' : service.id
      return enabledModules[moduleKey] !== false
    })
  }, [enabledModules])

  const handleServiceClick = (service) => {
    if (service.id === "taxi" && !hasLocalUserToken()) {
      navigate("/user/auth/login", {
        state: { redirectTo: redirectTo || service.path },
      })
      return
    }

    navigate(service.path)
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">

      {/* Lining Effect & Pattern Background */}
      {!isNativeLikeShell && (
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
            backgroundSize: `40px 40px`
          }} />
          <div className="absolute inset-0 animate-scanline" style={{ 
            backgroundImage: `linear-gradient(transparent 0%, #000 50%, transparent 100%)`,
            backgroundSize: `100% 200px`,
            opacity: 0.5
          }} />
      </div>
      )}

      {/* Dynamic Background Particles */}
      {!isNativeLikeShell && (
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {particlePositions.map((particle, i) => (
             <motion.div
               key={particle.id}
               animate={{
                 y: [0, -100, 0],
                 x: [0, 50, 0],
                 scale: [1, 1.2, 1],
                 opacity: [0.1, 0.2, 0.1]
               }}
               transition={{
                 duration: 10 + i * 2,
                 repeat: Infinity,
                 ease: "linear"
               }}
               className="absolute w-64 h-64 bg-[#CB202D]/5 rounded-full blur-3xl"
               style={{
                 left: particle.left,
                 top: particle.top,
               }}
             />
          ))}
      </div>
      )}

      {/* Top Header Section */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center pb-2 min-h-0">

        {/* Minimal Flex Col Layout */}
        <div className="w-full max-w-sm mx-auto mt-2 flex flex-col gap-4 relative z-10 px-4 pb-4 flex-1 min-h-0">
          {filteredServices.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={isNativeLikeShell ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isNativeLikeShell ? { duration: 0.15 } : { delay: 0.1 * idx }}
              whileHover={isNativeLikeShell ? undefined : { scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleServiceClick(service)}
              className="group cursor-pointer flex flex-col flex-1 min-h-0 bg-white rounded-[32px] shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 overflow-hidden"
            >
              <div className="w-full flex-1 min-h-0 bg-white relative flex items-center justify-center overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {!isNativeLikeShell && <style dangerouslySetInnerHTML={{ __html: `
        .perspective {
          perspective: 1000px;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        @keyframes line-shine {
          0% { left: -100%; transition: none; }
          100% { left: 200%; transition: all 0.8s ease-in-out; }
        }
        .animate-line-shine {
          animation: line-shine 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}} />}

      {/* Trust Badge at bottom */}
      <div className="mt-4 hidden sm:flex flex-col items-center gap-3 opacity-50">
         <div className="flex items-center gap-1.5 grayscale">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure by Ishsys</span>
         </div>
      </div>
    </div>
  )
}
