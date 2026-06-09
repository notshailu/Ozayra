import React, { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom"
import { Phone, Lock, ArrowRight, ShieldCheck, Loader2, UserRound } from "lucide-react"
import { toast } from "sonner"
import { authAPI, userAPI } from "@food/api"
import { isModuleAuthenticated, setAuthData } from "@food/utils/auth"

export default function UnifiedOTPFastLogin() {
  const RESEND_COOLDOWN_SECONDS = 60
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [rememberLogin, setRememberLogin] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const referralCode = searchParams.get("ref") || ""
  
  const submitting = useRef(false)
  const redirectTo = typeof location.state?.redirectTo === "string" && location.state.redirectTo.trim()
    ? location.state.redirectTo.trim()
    : "/portal"

  useEffect(() => {
    if (!isModuleAuthenticated("user")) return
    navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo])

  const clearNameFlow = () => {
    setShowNameInput(false)
    setName("")
    setNameError("")
  }

  const normalizedPhone = () => {
    const digits = String(phoneNumber).replace(/\D/g, "").slice(-15)
    return digits.length >= 8 ? digits : ""
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const phone = normalizedPhone()
    if (phone.length < 8) {
      toast.error("Please enter a valid phone number (at least 8 digits)")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      clearNameFlow()
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtpSent(true)
      setOtp("")
      setStep(2)
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP sent! Check your phone.")
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleResendOTP = async () => {
    const phone = normalizedPhone()
    if (phone.length < 8) {
      toast.error("Please enter a valid phone number (at least 8 digits)")
      return
    }
    if (resendTimer > 0 || submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      clearNameFlow()
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setOtpSent(true)
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP resent successfully.")
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleEditNumber = () => {
    setStep(1)
    setOtp("")
    setResendTimer(0)
    clearNameFlow()
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const phone = normalizedPhone()
    const otpDigits = String(otp).replace(/\D/g, "").slice(0, 4)
    if (otpDigits.length !== 4) {
      toast.error("Please enter the 4-digit OTP")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      // Try to get FCM token before verifying OTP
      let fcmToken = null;
      let platform = "web";
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile";
            const handlerNames = ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"];
            for (const handlerName of handlerNames) {
              try {
                const t = await window.flutter_inappwebview.callHandler(handlerName, { module: "user" });
                if (t && typeof t === "string" && t.length > 20) {
                  fcmToken = t.trim();
                  break;
                }
              } catch (e) {}
            }
          } else {
            fcmToken = localStorage.getItem("fcm_web_registered_token_user") || null;
          }
        }
      } catch (e) {
        console.warn("Failed to get FCM token during login", e);
      }

      const response = await authAPI.verifyOTP(
        phoneNumber, 
        otpDigits, 
        "login", 
        null, 
        null, 
        "user", 
        null, 
        referralCode, 
        fcmToken, 
        platform
      )
      const data = response?.data?.data || response?.data || {}
      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }

      const hasName =
        user.name &&
        String(user.name).trim().length > 0 &&
        String(user.name).toLowerCase() !== "null"
      const needsName = data.isNewUser === true || !hasName

      if (needsName) {
        setAuthData("user", accessToken, user, refreshToken)
        window.dispatchEvent(new Event("userAuthChanged"))
        setShowNameInput(true)
        setLoading(false)
        submitting.current = false
        return
      }

      setAuthData("user", accessToken, user, refreshToken)
      window.dispatchEvent(new Event("userAuthChanged"))
      toast.success("Login successful!")
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const status = err?.response?.status
      let msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Invalid OTP. Please try again."
      if (status === 401) {
        if (/deactivat(ed|e)/i.test(String(msg))) {
          msg = "Your account is deactivated. Please contact support."
        } else {
          msg = "Invalid or expired code, or account not active."
        }
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleSubmitName = async (e) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError("Please enter your name")
      return
    }

    if (trimmedName.length < 2) {
      setNameError("Name must be at least 2 characters")
      return
    }

    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    setNameError("")

    try {
      const response = await userAPI.updateProfile({ name: trimmedName })
      const updatedUser =
        response?.data?.data?.user ||
        response?.data?.user ||
        response?.data?.data ||
        response?.data
      const storedToken = localStorage.getItem("user_accessToken") || localStorage.getItem("accessToken")
      const storedRefreshToken = localStorage.getItem("user_refreshToken") || null

      if (!storedToken || !updatedUser) {
        throw new Error("Invalid response from server")
      }

      setAuthData("user", storedToken, updatedUser, storedRefreshToken)
      window.dispatchEvent(new Event("userAuthChanged"))
      clearNameFlow()
      toast.success("Profile saved successfully!")
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const status = err?.response?.status
      let msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save your name."
      if (status === 401) {
        msg = "Invalid or expired code, or account not active."
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  useEffect(() => {
    if (step !== 2 || resendTimer <= 0) return
    const intervalId = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [step, resendTimer])

  const formatResendTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Service images (served from public folder)
  const foodIcon = "/super-app/food.png"
  const taxiIcon = "/super-app/taxi.png"
  const groceryIcon = "/super-app/grocery.png"
  const hotelIcon = "/super-app/hotel.png"

  const services = [
    { id: 'food', name: 'Food Delivery', icon: foodIcon, label: 'Zomato', color: 'bg-red-500', shadow: 'shadow-red-200' },
    { id: 'taxi', name: 'Taxi', icon: taxiIcon, label: 'Taxi', color: 'bg-yellow-400', shadow: 'shadow-yellow-200' },
    { id: 'grocery', name: 'Quick Commerce', icon: groceryIcon, label: 'Blinkit', color: 'bg-green-500', shadow: 'shadow-green-200' },
    { id: 'hotels', name: 'Hotels', icon: hotelIcon, label: 'Hotels', color: 'bg-blue-500', shadow: 'shadow-blue-200' },
  ]

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Top Banner section - Green */}
      <div className="w-full bg-[#249b57] dark:bg-[#1d854a] rounded-b-[3.5rem] py-6 px-6 text-center text-white relative overflow-hidden shadow-sm flex flex-col items-center justify-center h-[45vh] flex-shrink-0">
        <div className="absolute inset-0 bg-white/5 opacity-50 blur-3xl rounded-full -top-1/2 -left-1/4 animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-3 shadow-md"
          >
             <svg className="w-14 h-14 text-[#249b57]" viewBox="0 0 100 100" fill="currentColor">
               <path d="M50 15 C33.4 15 20 28.4 20 45 C20 68 50 85 50 85 C50 85 80 68 80 45 C80 28.4 66.6 15 50 15 Z" />
               <circle cx="50" cy="45" r="16" className="fill-white" />
               <circle cx="50" cy="45" r="9" stroke="#249b57" strokeWidth="4.5" fill="none" />
             </svg>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4.5xl font-extrabold tracking-tight mb-1 font-sans"
            style={{ fontFamily: '"Outfit", "Inter", sans-serif' }}
          >
            ozayra
          </motion.h1>
        </div>
      </div>

      <div className="flex-1 max-w-[440px] mx-auto w-full px-6 py-6 flex flex-col justify-between overflow-hidden">
        {/* Main Card - Flat to match screen */}
        <div className="flex flex-col justify-center flex-1 gap-6">
           <div className="text-center space-y-2">
              {step === 1 ? (
                <>
                  <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white leading-tight px-4" style={{ fontFamily: '"Outfit", "Inter", sans-serif' }}>
                    India's #1 Food, Grocery and Rides App
                  </h2>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Log in or sign up
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    {showNameInput ? "Create Profile" : "Verify OTP"}
                  </h2>
                  <div className="h-1 w-12 bg-[#249b57] mx-auto rounded-full" />
                </>
              )}
           </div>

          <form onSubmit={showNameInput ? handleSubmitName : step === 1 ? handleSendOTP : handleVerifyOTP} className="space-y-5">
            {step === 1 ? (
              <div className="space-y-5">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    {/* Country Code Dropdown */}
                    <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl w-28 shadow-sm">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">IN</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">+91</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Phone Number Input */}
                    <div className="flex-1">
                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        className="block w-full px-5 py-4 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 focus:border-[#249b57] focus:ring-1 focus:ring-[#249b57] outline-none rounded-2xl transition-all font-semibold text-lg shadow-sm placeholder:text-gray-300"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center gap-2.5 mt-3 px-1">
                    <input
                      type="checkbox"
                      id="rememberLogin"
                      checked={rememberLogin}
                      onChange={(e) => setRememberLogin(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#249b57] focus:ring-[#249b57] accent-[#249b57] cursor-pointer"
                    />
                    <label htmlFor="rememberLogin" className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                      Remember my login for faster sign-in
                    </label>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 text-center leading-relaxed px-4">
                  We will send success notifications and order updates via SMS
                </p>
              </div>
            ) : showNameInput ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <div className="w-10 h-10 bg-[#249b57]/10 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#249b57]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Verified Number</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">+91 {phoneNumber}</p>
                  </div>
                  <button type="button" onClick={handleEditNumber} className="text-xs text-[#249b57] font-black underline cursor-pointer">
                    Change
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                      <UserRound className="w-5 h-5 text-gray-400 group-focus-within:text-[#249b57] transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (nameError) setNameError("")
                      }}
                      className={`block w-full pl-10 pr-4 py-3 bg-transparent text-gray-900 dark:text-white border-b-2 border-gray-100 dark:border-gray-800 focus:border-[#249b57] outline-none transition-all placeholder:text-gray-300 font-bold text-lg ${nameError ? "border-red-500" : ""}`}
                      placeholder="Your full name"
                    />
                  </div>

                  {nameError ? (
                    <p className="text-xs font-semibold text-red-500 text-center">{nameError}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                      Please enter your name so we can save it to your profile.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                      <div className="w-10 h-10 bg-[#249b57]/10 rounded-full flex items-center justify-center">
                         <ShieldCheck className="w-5 h-5 text-[#249b57]" />
                      </div>
                      <div className="flex-1">
                         <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Sent to</p>
                         <p className="text-sm font-black text-gray-900 dark:text-white">+91 {phoneNumber}</p>
                      </div>
                      <button type="button" onClick={handleEditNumber} className="text-xs text-[#249b57] font-black underline cursor-pointer">Edit</button>
                   </div>

                  <div className="flex justify-center gap-3 mt-4">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="tel"
                        inputMode="numeric"
                        required
                        autoFocus={index === 0}
                        value={otp[index] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(-1);
                          if (!val) return;
                          const newOtp = otp.split("");
                          newOtp[index] = val;
                          const combined = newOtp.join("").slice(0, 4);
                          setOtp(combined);
                          
                          // Focus next
                          if (index < 3 && val) {
                            document.getElementById(`otp-${index + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            if (!otp[index] && index > 0) {
                               document.getElementById(`otp-${index - 1}`)?.focus();
                            } else {
                              const newOtp = otp.split("");
                              newOtp[index] = "";
                              setOtp(newOtp.join(""));
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
                          if (pasteData) {
                            setOtp(pasteData);
                            document.getElementById(`otp-${Math.min(pasteData.length, 3)}`)?.focus();
                          }
                        }}
                        className="w-14 h-14 sm:w-16 sm:h-16 text-center text-xl sm:text-3xl font-black bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-[#249b57] rounded-xl sm:rounded-2xl outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="-"
                      />
                    ))}
                  </div>
                  <div className="text-center mt-4">
                    {resendTimer > 0 ? (
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Resend OTP in {formatResendTimer(resendTimer)}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading}
                        className="text-xs font-black text-[#249b57] underline disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all relative overflow-hidden shadow-lg ${
                loading
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                  : "bg-[#249b57] hover:bg-[#1d854a] text-white hover:shadow-xl hover:shadow-[#249b57]/20 active:scale-[0.98] hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-white" />
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center pb-2 flex-shrink-0">
           <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
             By continuing, you agree to our
           </p>
           <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
             <Link to="/food/user/profile/terms" className="underline hover:text-[#249b57] transition-colors">Terms of Service</Link>
             {" • "}
             <Link to="/food/user/profile/privacy" className="underline hover:text-[#249b57] transition-colors">Privacy Policy</Link>
             {" • "}
             <Link to="/food/user/profile/refund" className="underline hover:text-[#249b57] transition-colors">Refund Policy</Link>
           </p>
        </div>
      </div>
    </div>
  )
}
