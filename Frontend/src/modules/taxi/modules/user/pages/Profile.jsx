import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Wallet, Bell, MapPin, Star, Package, Gift, Trash2, Camera, Check, LogOut, ChevronRight, HelpCircle } from 'lucide-react';
import BottomNavbar from '../components/BottomNavbar';
import { clearLocalUserSession, getLocalUserInfo, getLocalUserToken, setLocalUserInfo, userAuthService } from '../services/authService';
import { clearCurrentRide } from '../services/currentRideService';
import { socketService } from '../../../shared/api/socket';
import { useImageUpload } from '../../../shared/hooks/useImageUpload';

const MotionButton = motion.button;

const menuItems = [
  { icon: User, title: 'Profile Settings', sub: 'Manage your personal info', path: '/taxi/user/profile/settings', bg: 'bg-orange-50', color: 'text-orange-500' },
  { icon: Wallet, title: 'Wallet', sub: 'Balance, transactions & top-up', path: '/taxi/user/wallet', bg: 'bg-blue-50', color: 'text-blue-500' },
  { icon: MapPin, title: 'Saved Addresses', sub: 'Home, office & others', path: '/taxi/user/profile/addresses', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { icon: Package, title: 'My Rides', sub: 'History & receipts', path: '/taxi/user/activity', bg: 'bg-indigo-50', color: 'text-indigo-500' },
  { icon: Bell, title: 'Notifications', sub: 'Offers & safety alerts', path: '/taxi/user/profile/notifications', bg: 'bg-purple-50', color: 'text-purple-500' },
  { icon: Gift, title: 'Refer & Earn', sub: 'Invite friends & get rewards', path: '/taxi/user/referral', bg: 'bg-amber-50', color: 'text-amber-500' },
  { icon: HelpCircle, title: 'Support', sub: 'Help center & ticketing', path: '/taxi/user/support/tickets', bg: 'bg-slate-100', color: 'text-slate-600' },
  { icon: Trash2, title: 'Delete Account', sub: 'Request account deletion', path: '/taxi/user/profile/delete-account', bg: 'bg-rose-50', color: 'text-rose-500' },
];

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    profileImage: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const {
    uploading: imageUploading,
    preview: imagePreview,
    handleFileChange: onProfileImageChange,
  } = useImageUpload({
    folder: 'user-profiles',
    onSuccess: async (url) => {
      const previousImage = profile.profileImage;
      setIsUploading(true);
      setProfile((prev) => ({ ...prev, profileImage: url }));

      try {
        await userAuthService.updateCurrentUser({
          profileImage: url,
        });
        
        // Keep Taxi + shared Food/Quick user caches aligned.
        const stored = getLocalUserInfo();
        setLocalUserInfo({ ...stored, profileImage: url });
      } catch (err) {
        setProfile((prev) => ({ ...prev, profileImage: previousImage }));
        setError(err?.message || 'Unable to update profile photo');
      } finally {
        setIsUploading(false);
      }
    },
  });

  useEffect(() => {
    const token = getLocalUserToken();

    if (!token) {
      setProfile({
        name: '',
        phone: '',
        profileImage: '',
      });
      navigate('/taxi/user/login', { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        const stored = getLocalUserInfo();
        const response = await userAuthService.getCurrentUser();
        const user = response?.data?.user || {};
        setProfile({
          name: user.name || stored?.name || '',
          phone: user.phone || stored?.phone || '',
          profileImage: user.profileImage || stored?.profileImage || '',
        });
        setLocalUserInfo(user);
      } catch {
        // Keep the local fallback if the network is unavailable.
      }
    };

    loadProfile();
  }, [navigate]);

  const handleLogout = () => {
    clearCurrentRide();
    socketService.disconnect();
    clearLocalUserSession();
    setProfile({
      name: '',
      phone: '',
      profileImage: '',
    });
    navigate('/user/auth/login', { replace: true });
  };

  const initials = (profile.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto font-sans pb-28 relative overflow-hidden">
      {/* Header Profile Section */}
      <div className="px-5 pt-10 pb-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">My Account</h1>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-2">Manage your profile & settings</p>
        </div>

        {/* Hero Profile Card */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
              {(imagePreview || profile.profileImage) ? (
                <img 
                  src={imagePreview || profile.profileImage} 
                  alt="User" 
                  className={`w-full h-full object-cover ${(imageUploading || isUploading) ? 'opacity-60' : ''}`} 
                />
              ) : (
                <span className="text-xl font-semibold text-white opacity-40">{initials || 'U'}</span>
              )}
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={16} className="text-white" />
              </div>

              {/* Uploading indicator */}
              {(imageUploading || isUploading) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* File Input Label */}
            <label className="absolute inset-0 cursor-pointer" aria-label="Upload profile image">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onProfileImageChange}
                disabled={imageUploading || isUploading}
              />
            </label>

            <div className="absolute -bottom-0 -right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <Check size={10} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-semibold text-slate-900 truncate capitalize leading-tight">
              {profile.name || 'User Name'}
            </h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              {profile.phone ? `+91 ${profile.phone}` : '+91 Mobile Number'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="bg-amber-50 rounded px-2 py-1 flex items-center gap-1">
              <Star size={10} className="text-amber-500 fill-amber-500" />
              <span className="text-[11px] font-semibold text-slate-800">4.9</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active</span>
          </div>
        </div>
        {error && (
          <p className="mt-3 px-2 text-[12px] text-rose-500">{error}</p>
        )}
      </div>

      {/* Menu Options */}
      <div className="px-5 space-y-4">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">System Menu</h3>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden divide-y divide-slate-50">
          {menuItems.map(({ icon: Icon, title, sub, path, bg, color }, idx) => (
            <MotionButton
              key={idx}
              whileTap={{ backgroundColor: '#F8FAFC' }}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                {React.createElement(Icon, { size: 18, className: color, strokeWidth: 2 })}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-slate-900 leading-tight">{title}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" strokeWidth={2} />
            </MotionButton>
          ))}
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 pb-8">
          <button
            onClick={handleLogout}
            className="w-full h-14 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 flex items-center justify-center gap-2 text-[14px] font-medium active:scale-95 transition-all"
          >
            <LogOut size={16} strokeWidth={2.5} />
            Sign out
          </button>

          <p className="text-center text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-6">App Version 2.4.1 (Stable)</p>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Profile;
