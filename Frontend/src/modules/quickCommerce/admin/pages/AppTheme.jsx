import React, { useState, useEffect } from 'react';
import { Palette, Save, Loader2, Info } from 'lucide-react';
import { toast } from "sonner";
import { adminAPI } from "@/services/api";
import { getCachedSettings, setCachedSettings } from "@/modules/common/utils/businessSettings";

const PRESET_COLORS = [
  { name: 'Blinkit Cyan', value: '#F0F8F8' },
  { name: 'Instamart Yellow', value: '#F0EBC9' },
  { name: 'Zepto Purple', value: '#E9E4F0' },
  { name: 'Swiggy Orange', value: '#FDECE4' },
  { name: 'Light Cream (Default)', value: '#F1ECC6' },
  { name: 'Pure White', value: '#FFFFFF' }
];

export default function AppTheme() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickThemeColor, setQuickThemeColor] = useState("#F1ECC6");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getBusinessSettings();
      const settings = response?.data?.data || response?.data;
      if (settings && settings.quickThemeColor) {
        setQuickThemeColor(settings.quickThemeColor);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const dataToSend = {
        quickThemeColor: quickThemeColor
      };

      await adminAPI.updateBusinessSettings(dataToSend);
      
      const cached = getCachedSettings();
      if (cached) {
        setCachedSettings({ ...cached, quickThemeColor });
      }

      toast.success('App Theme updated successfully!');
    } catch (err) {
      toast.error('Failed to update App Theme');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <Loader2 className="w-10 h-10 text-[#0c831f] animate-spin" />
       </div>
     );
  }

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200">
               <Palette className="w-6 h-6 text-[#0c831f]" />
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight">App Theme</h1>
               <p className="text-sm font-medium text-slate-500 mt-1">Manage the global background color for the customer app.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="p-8">
             <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Primary App Background Color</label>
                  <p className="text-xs text-gray-500 mb-4">This color is used as the background for the Home Header, Categories List, and Lowest Price section.</p>
                  
                  <div className="flex items-center gap-4">
                     <div 
                        className="w-16 h-16 rounded-xl border border-gray-300 shadow-inner flex-shrink-0"
                        style={{ backgroundColor: quickThemeColor }}
                     />
                     <input
                        type="color"
                        value={quickThemeColor}
                        onChange={(e) => setQuickThemeColor(e.target.value)}
                        className="h-10 w-24 p-1 cursor-pointer border-gray-300 rounded"
                     />
                     <input
                        type="text"
                        value={quickThemeColor}
                        onChange={(e) => setQuickThemeColor(e.target.value.toUpperCase())}
                        className="border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm w-32"
                        placeholder="#FFFFFF"
                     />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                   <h3 className="text-sm font-bold text-gray-700 mb-3">Quick Presets</h3>
                   <div className="flex flex-wrap gap-3">
                      {PRESET_COLORS.map((preset) => (
                         <button
                            key={preset.value}
                            onClick={() => setQuickThemeColor(preset.value)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-[#0c831f] hover:bg-green-50 transition-all"
                         >
                            <span 
                               className="w-5 h-5 rounded-full border border-gray-300 block"
                               style={{ backgroundColor: preset.value }}
                            />
                            <span className="text-xs font-semibold text-gray-700">{preset.name}</span>
                         </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
             onClick={handleUpdate} 
             disabled={saving} 
             className="bg-[#0c831f] text-white px-8 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-green-600/20 hover:bg-[#0a6c19] active:scale-95 transition-all disabled:opacity-50"
          >
             {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
             Save Theme
          </button>
        </div>
      </div>
    </div>
  );
}
