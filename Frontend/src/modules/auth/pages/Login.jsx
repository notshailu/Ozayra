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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col overflow-y-auto">
      {/* Top Banner section - Brand Yellow */}
      <div className="w-full bg-[#FCB702] dark:bg-[#D9A204] rounded-b-[3.5rem] py-6 px-6 text-center text-slate-900 relative overflow-hidden shadow-sm flex flex-col items-center justify-center h-[50vh] flex-shrink-0">
        <div className="absolute inset-0 bg-white/10 opacity-60 blur-3xl rounded-full -top-1/2 -left-1/4 animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-64 h-64 flex items-center justify-center"
          >
             <img src="/ozayra_logo.png" alt="ozayra logo" className="w-full h-full object-contain" />
          </motion.div>
        </div>
      </div>

      <div className="flex-1 max-w-[440px] mx-auto w-full px-6 py-6 flex flex-col justify-between">
        {/* Main Card - Flat to match screen */}
        <div className="flex flex-col justify-center flex-1 gap-6">
           <div className="text-center space-y-2">
              {step === 1 ? null : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {showNameInput ? "Create Profile" : "Verify OTP"}
                  </h2>
                  <div className="h-1 w-12 bg-[#FCB702] mx-auto rounded-full" />
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
                        className="block w-full px-5 py-4 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 focus:border-[#FCB702] focus:ring-1 focus:ring-[#FCB702] outline-none rounded-2xl transition-all font-semibold text-lg shadow-sm placeholder:text-gray-300"
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
                      className="w-5 h-5 rounded border-gray-300 text-[#FCB702] focus:ring-[#FCB702] accent-[#FCB702] cursor-pointer"
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
                  <div className="w-10 h-10 bg-[#FCB702]/10 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#CA8A04]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Verified Number</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">+91 {phoneNumber}</p>
                  </div>
                  <button type="button" onClick={handleEditNumber} className="text-xs text-[#CA8A04] font-black underline cursor-pointer">
                    Change
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                      <UserRound className="w-5 h-5 text-gray-400 group-focus-within:text-[#FCB702] transition-colors" />
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
                      className={`block w-full pl-10 pr-4 py-3 bg-transparent text-gray-900 dark:text-white border-b-2 border-gray-100 dark:border-gray-800 focus:border-[#FCB702] outline-none transition-all placeholder:text-gray-300 font-bold text-lg ${nameError ? "border-red-500" : ""}`}
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
                  <div className="text-center space-y-1 mb-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      We've sent a 4-digit verification code to
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-lg">
                        +91 {phoneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleEditNumber}
                        className="text-xs font-bold text-[#CA8A04] hover:text-[#B47803] transition-colors underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 mt-6">
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
                        className="w-14 h-14 sm:w-16 sm:h-16 text-center text-xl sm:text-3xl font-semibold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-[#FCB702] focus:ring-4 focus:ring-[#FCB702]/20 rounded-xl sm:rounded-2xl outline-none transition-all text-gray-900 dark:text-white shadow-sm"
                        placeholder=""
                      />
                    ))}
                  </div>
                  
                  <div className="text-center mt-6">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Didn't receive the OTP?{" "}
                      {resendTimer > 0 ? (
                        <span className="font-bold text-gray-900 dark:text-white ml-1">
                          Resend in {formatResendTimer(resendTimer)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={loading}
                          className="font-bold text-[#CA8A04] hover:text-[#B47803] hover:underline disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ml-1"
                        >
                          Resend Code
                        </button>
                      )}
                    </p>
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
                  : "bg-[#FCB702] hover:bg-[#E5AC02] text-slate-900 hover:shadow-xl hover:shadow-[#FCB702]/20 active:scale-[0.98] hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-slate-900" />
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
             <Link to="/food/user/profile/terms" className="underline hover:text-[#CA8A04] transition-colors">Terms of Service</Link>
             {" • "}
             <Link to="/food/user/profile/privacy" className="underline hover:text-[#CA8A04] transition-colors">Privacy Policy</Link>
             {" • "}
             <Link to="/food/user/profile/refund" className="underline hover:text-[#CA8A04] transition-colors">Refund Policy</Link>
           </p>
        </div>
      </div>
    </div>
  )
}
