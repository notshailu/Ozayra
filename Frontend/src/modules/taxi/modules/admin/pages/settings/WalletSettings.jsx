import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Loader2,
  Save,
  ShieldCheck,
  Wallet,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../shared/api/axiosInstance';

const AMOUNT_FIELDS = [
  {
    name: 'driver_wallet_minimum_amount_to_get_an_order',
    label: 'Driver minimum balance to get orders',
    help: 'Driver app blocks new orders when wallet balance is below this amount. Use a negative value to allow cash debt.',
    placeholder: '-500',
  },
  {
    name: 'minimum_amount_added_to_wallet',
    label: 'Minimum driver top-up amount',
    help: 'Driver cannot add less than this amount from the wallet page.',
    placeholder: '500',
  },
  {
    name: 'minimum_wallet_amount_for_transfer',
    label: 'Minimum transfer amount',
    help: 'Shown to drivers as the minimum amount for wallet transfers.',
    placeholder: '100',
  },
  {
    name: 'owner_wallet_minimum_amount_to_get_an_order',
    label: 'Owner minimum balance to get orders',
    help: 'Kept here for owner wallet rules.',
    placeholder: '-500',
  },
];

const SWITCH_FIELDS = [
  {
    name: 'show_wallet_feature_for_driver',
    label: 'Driver wallet enabled',
    help: 'Controls whether the driver wallet can be used.',
  },
  {
    name: 'enable_wallet_transfer_driver',
    label: 'Driver wallet transfer enabled',
    help: 'Controls the transfer status shown in driver wallet.',
  },
  {
    name: 'show_wallet_feature_for_owner',
    label: 'Owner wallet enabled',
    help: 'Keeps owner wallet visibility controlled from here too.',
  },
  {
    name: 'enable_wallet_transfer_owner',
    label: 'Owner wallet transfer enabled',
    help: 'Controls owner wallet transfer availability.',
  },
  {
    name: 'show_wallet_feature_on_mobile_app',
    label: 'Wallet feature on mobile app',
    help: 'Master mobile visibility flag for wallet features.',
  },
];

const isEnabled = (value) => ['1', 'true', 'yes', 'on'].includes(String(value ?? '1').trim().toLowerCase());

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'mb-1 block text-sm font-bold text-slate-700';
const helpClass = 'mb-3 block text-xs text-slate-500';

const StatusToggle = ({ active, onToggle }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      onToggle();
    }}
    className={`relative h-6 w-12 shrink-0 rounded-full transition-all ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
  >
    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
  </button>
);

const WalletSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/general-settings/wallet');
      setSettings(res.data?.settings || res.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load wallet settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const response = await api.patch('/admin/general-settings/wallet', { settings });
      setSettings(response.data?.settings || response.settings || settings);
      toast.success('Wallet settings saved');
    } catch (err) {
      toast.error('Failed to save wallet settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name) => {
    setSettings((prev) => ({ ...prev, [name]: isEnabled(prev[name]) ? '0' : '1' }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 lg:p-8 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>App Settings</span>
            <ChevronRight size={12} />
            <span className="text-slate-700">Wallet</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Wallet Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure wallet limits, minimum balances, and feature toggles.</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {/* Amounts Section */}
        <div className="border-b border-slate-100 p-6 lg:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Amounts & Limits</h2>
              <p className="text-sm text-slate-500">These numbers directly control wallet behavior.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {AMOUNT_FIELDS.map((field) => (
              <div key={field.name}>
                <label className={labelClass}>{field.label}</label>
                <span className={helpClass}>{field.help}</span>
                <input
                  type="number"
                  value={settings[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Feature Controls Section */}
        <div className="p-6 lg:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Feature Controls</h2>
              <p className="text-sm text-slate-500">Switch wallet features on or off.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {SWITCH_FIELDS.map((field) => (
              <div key={field.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div>
                  <span className="block text-sm font-bold text-slate-800">{field.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{field.help}</span>
                </div>
                <StatusToggle active={isEnabled(settings[field.name])} onToggle={() => handleToggle(field.name)} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/50 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 px-4 py-3">
            <Info size={16} className="mt-0.5 shrink-0 text-indigo-600" />
            <p className="text-sm text-indigo-800">
              The driver wallet page reads these settings from the backend. Top-up minimum is enforced by the API, and order eligibility uses the driver minimum balance.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#2e3c78] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24305f] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default WalletSettings;
