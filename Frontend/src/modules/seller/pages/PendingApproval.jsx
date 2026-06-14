import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@core/context/AuthContext";
import { motion } from "framer-motion";
import { Clock3, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { sellerApi } from "../services/sellerApi";

export default function SellerPendingApproval() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProfile = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    const sellerToken = localStorage.getItem("auth_seller");
    if (!sellerToken) {
      setIsLoading(false);
      setIsRefreshing(false);
      navigate("/seller/auth", { replace: true });
      return;
    }

    try {
      const response = await sellerApi.getProfile();
      const data = response?.data?.result || {};
      setProfile(data);

      const isApproved =
        data.approved !== false &&
        (!data.approvalStatus || data.approvalStatus === "approved");

      if (isApproved) {
        await refreshUser();
        toast.success("Your seller account has been approved!");
        navigate("/seller", { replace: true });
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        toast.error("Failed to load approval status");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const isRejected = profile?.approvalStatus === "rejected";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#fafafa] px-4 font-['Outfit']">
      {/* Premium ambient backdrop glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full blur-[140px] opacity-[0.08] ${isRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500 blur-[140px] opacity-[0.04]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_32px_96px_-24px_rgba(0,0,0,0.06)]"
      >
        {/* Centered Glowing Status Icon */}
        <div className="flex justify-center mb-6">
          {isRejected ? (
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
          ) : (
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50/80 text-amber-600">
              <Clock3 className="h-6 w-6" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500"></span>
              </span>
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="text-center">
          <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${isRejected ? 'text-rose-500' : 'text-amber-600'}`}>
            {isRejected ? "Action required" : "Under review"}
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 leading-tight">
            {isRejected ? "Updates needed on request" : "Waiting for admin approval"}
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
            {isRejected
              ? "Your seller request was not approved as submitted. Please review the admin notes below, correct your details, and submit again."
              : "We've received your onboarding submission. The admin team is currently reviewing your shop's compliance and bank credentials."}
          </p>
        </div>

        <div className="my-6 border-t border-slate-100" />

        {/* Info Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-400">Shop</span>
            <span className="font-bold text-slate-800">{profile?.shopName || "—"}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-400">Owner</span>
            <span className="font-bold text-slate-800">{profile?.name || "—"}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-400">Status</span>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${isRejected ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>
              {isRejected ? "Rejected" : "Pending"}
            </span>
          </div>

          {isRejected && profile?.approvalNotes && (
            <div className="mt-2 rounded-2xl bg-rose-50/50 border border-rose-100/50 p-4 text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Admin feedback</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-rose-700">{profile.approvalNotes}</p>
            </div>
          )}
        </div>

        <div className="my-6 border-t border-slate-100" />

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => loadProfile(true)}
            disabled={isRefreshing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-white hover:bg-black transition duration-200 disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Checking..." : "Refresh Status"}
          </button>

          {isRejected && (
            <button
              type="button"
              onClick={() => navigate("/seller/onboarding")}
              className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition duration-200"
            >
              Edit Application
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
