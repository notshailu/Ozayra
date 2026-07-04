import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Copy, Gift, Loader2, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentDriver } from '../../services/registrationService';
import {
  getReferralSettingsContent,
  getReferralTranslationContent,
} from '../../../shared/services/referralTranslationService';
import {
  applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks,
  DRIVER_REFERRAL_TRANSLATION_FIELDS,
  getStoredReferralLanguageCode,
} from '../../../shared/utils/referralTranslationFields';

const readStoredDriverInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('driverInfo') || '{}');
  } catch {
    return {};
  }
};

const DriverReferral = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('refer');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState(() => {
    const stored = readStoredDriverInfo();
    return {
      referralCode: stored.referralCode || '',
    };
  });
  const [translation, setTranslation] = useState({
    language_code: 'en',
    driver_referral: {
      instant_referrer_user: '',
      instant_referrer_user_and_new_user: '',
      conditional_referrer_user_ride_count: '',
      conditional_referrer_user_earnings: '',
      dual_conditional_referrer_user_and_new_user_ride_count: '',
      dual_conditional_referrer_user_and_new_user_earnings: '',
      banner_text: '',
    },
  });

  useEffect(() => {
    const loadDriverReferral = async () => {
      setLoading(true);
      const languageCode = getStoredReferralLanguageCode('driver');
      const stored = readStoredDriverInfo();
      const fallbackDriverSection = {
        instant_referrer_user: '',
        instant_referrer_user_and_new_user: '',
        conditional_referrer_user_ride_count: '',
        conditional_referrer_user_earnings: '',
        dual_conditional_referrer_user_and_new_user_ride_count: '',
        dual_conditional_referrer_user_and_new_user_earnings: '',
        banner_text: '',
      };

      try {
        const [driverResponse, translationResponse, settingsResponse] = await Promise.all([
          getCurrentDriver(),
          getReferralTranslationContent(languageCode),
          getReferralSettingsContent('driver'),
        ]);

        const driver = driverResponse?.data || {};
        const translationData = translationResponse?.data || {};
        const settingsData = settingsResponse?.data || {};
        const hydratedDriverReferral = applyReferralSettingPlaceholders(
          translationData.driver_referral || fallbackDriverSection,
          settingsData,
        );

        setDriverProfile({
          referralCode: driver.referralCode || stored.referralCode || '',
        });
        setTranslation({
          language_code: translationData.language_code || languageCode,
          driver_referral: hydratedDriverReferral,
        });

        localStorage.setItem(
          'driverInfo',
          JSON.stringify({
            ...stored,
            referralCode: driver.referralCode || '',
          }),
        );
      } catch {
        try {
          const [translationResponse, settingsResponse] = await Promise.all([
            getReferralTranslationContent(languageCode),
            getReferralSettingsContent('driver'),
          ]);
          setTranslation({
            language_code: translationResponse?.data?.language_code || languageCode,
            driver_referral: applyReferralSettingPlaceholders(
              translationResponse?.data?.driver_referral || fallbackDriverSection,
              settingsResponse?.data || {},
            ),
          });
        } catch {
          // Keep local fallback state.
        }
      } finally {
        setLoading(false);
      }
    };

    loadDriverReferral();
  }, []);

  const referralCode = driverProfile.referralCode || '';
  const bannerText = translation.driver_referral?.banner_text || 'Refer and Earn';
  const infoBlocks = buildReferralPreviewBlocks(
    translation.driver_referral,
    DRIVER_REFERRAL_TRANSLATION_FIELDS,
  );

  const handleCopy = async () => {
    if (!referralCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures silently.
    }
  };

  const handleShare = async () => {
    if (!referralCode) {
      return;
    }
    const shareText = `${bannerText}\nUse my referral code ${referralCode} and join as a driver.\n${window.location.origin}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: bannerText,
          text: shareText,
        });
        return;
      }
    } catch {
      // Fall through to desktop-friendly sharing options.
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures and continue to WhatsApp fallback.
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans p-5 pt-8 pb-10">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/taxi/driver/profile')}
          className="w-10 h-10 rounded-xl border border-slate-100 bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={18} className="text-slate-900" />
        </button>
        <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">Referrals</h1>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden max-w-md mx-auto">
        {/* Banner */}
        <div className="bg-slate-900 px-5 py-5 text-white flex items-center justify-between">
          <div>
            <p className="text-[20px] font-semibold leading-tight">{bannerText}</p>
            <p className="text-[12px] text-white/50 mt-1 font-medium">Invite drivers and earn rewards</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
            <Gift size={20} />
          </div>
        </div>

        {/* Code + Copy */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center bg-slate-50/50">
              <p className="text-[16px] font-semibold text-slate-900 tracking-wide">
                {referralCode || 'Not available'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Your referral code</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!referralCode}
              className="rounded-xl bg-slate-900 text-white px-4 py-3 text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 h-full"
            >
              {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('refer')}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-medium transition-all ${
                activeTab === 'refer' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'
              }`}
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-medium transition-all ${
                activeTab === 'history' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 border border-slate-100'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 min-h-[280px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : activeTab === 'refer' ? (
            <div className="space-y-3">
              {infoBlocks.length === 0 ? (
                <p className="text-[13px] font-medium text-slate-400">Referral content will appear here after admin updates this language.</p>
              ) : (
                infoBlocks.map((block) => (
                  <div
                    key={block.key}
                    className="text-[14px] leading-6 text-slate-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-8 text-center">
              <p className="text-[14px] font-medium text-slate-700">No referral history</p>
              <p className="text-[13px] font-medium text-slate-400 mt-1">Your referral activity will appear here.</p>
            </div>
          )}
        </div>

        {/* Share Button */}
        <div className="px-4 pb-5">
          <button
            type="button"
            onClick={handleShare}
            disabled={!referralCode}
            className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            Share referral <Share2 size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {copied ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-xl bg-slate-900 text-white px-4 py-3 text-[13px] font-medium shadow-xl"
          >
            Referral code copied
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default DriverReferral;
