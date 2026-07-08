import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, Package } from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';

import imgDocuments from '../../../../assets/3d images/documents.webp';
import imgGrocery from '../../../../assets/3d images/grocery.webp';
import imgGifts from '../../../../assets/3d images/gifts.webp';
import imgClothes from '../../../../assets/3d images/clothes.webp';
import imgElectronics from '../../../../assets/3d images/electronics.webp';
import imgOthers from '../../../../assets/3d images/others.webp';

const Motion = motion;

const fallbackCategories = [
  { id: '1', title: 'Documents', img: imgDocuments, desc: 'Office files, paper', bg: 'bg-orange-50' },
  { id: '2', title: 'Groceries', img: imgGrocery, desc: 'Daily veggies', bg: 'bg-green-50' },
  { id: '3', title: 'Gifts', img: imgGifts, desc: 'Cake, gift box', bg: 'bg-purple-50' },
  { id: '4', title: 'Clothes', img: imgClothes, desc: 'Laundry, dresses', bg: 'bg-blue-50' },
  { id: '5', title: 'Electronics', img: imgElectronics, desc: 'Phone, cables', bg: 'bg-yellow-100' },
  { id: '6', title: 'Others', img: imgOthers, desc: 'Any other item', bg: 'bg-gray-100' },
];

const bgClasses = [
  'bg-orange-50',
  'bg-green-50',
  'bg-purple-50',
  'bg-blue-50',
  'bg-yellow-100',
  'bg-gray-100',
];

const imageMatchers = [
  { pattern: /(document|file|paper|certificate|passport)/i, img: imgDocuments },
  { pattern: /(grocery|food|vegetable|fruit|kitchen|meal|perishable)/i, img: imgGrocery },
  { pattern: /(gift|flower|cake|surprise|toy)/i, img: imgGifts },
  { pattern: /(cloth|laundry|dress|fashion|garment|shoe|apparel)/i, img: imgClothes },
  { pattern: /(electronic|phone|laptop|device|charger|computer|gadget)/i, img: imgElectronics },
];

const resolveCategoryImage = (name = '') =>
  imageMatchers.find((entry) => entry.pattern.test(name))?.img || imgOthers;

const formatGoodsType = (item, index) => {
  const title = String(item?.name || item?.goods_type_name || '').trim();
  const rawModuleAccess = String(item?.goods_types_for || item?.goods_type_for || 'both').trim();
  const moduleAccess = rawModuleAccess
    .split(',')
    .map((entry) =>
      entry
        .trim()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    )
    .filter(Boolean)
    .join(', ');
  const savedIcon = String(item?.icon || '').trim();

  return {
    id: String(item?._id || item?.id || index + 1),
    title: title || `Category ${index + 1}`,
    img: savedIcon || resolveCategoryImage(title),
    desc: moduleAccess === 'Both' ? 'Available for all delivery types' : `${moduleAccess} delivery`,
    bg: bgClasses[index % bgClasses.length],
    goodsTypeFor: rawModuleAccess || 'both',
    raw: item,
  };
};

const ParcelType = () => {
  const [categories, setCategories] = useState(fallbackCategories);
  const [selectedType, setSelectedType] = useState(fallbackCategories[0]?.title || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchGoodsTypes = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const response = await api.get('/users/goods-types');
        const items = response?.results || response?.data?.results || response?.data?.goods_types || [];
        const activeItems = items.filter((item) => Number(item?.active ?? 1) === 1);
        const mappedCategories = (activeItems.length ? activeItems : items).map(formatGoodsType);

        if (!isMounted) return;

        if (mappedCategories.length > 0) {
          setCategories(mappedCategories);
          setSelectedType((current) =>
            mappedCategories.some((category) => category.title === current)
              ? current
              : mappedCategories[0].title
          );
        } else {
          setCategories(fallbackCategories);
          setSelectedType(fallbackCategories[0]?.title || '');
        }
      } catch {
        if (!isMounted) return;
        setLoadError('Unable to load goods types right now.');
        setCategories(fallbackCategories);
        setSelectedType((current) => current || fallbackCategories[0]?.title || '');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGoodsTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  const selected = useMemo(
    () => categories.find((category) => category.title === selectedType) || categories[0],
    [categories, selectedType]
  );

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto flex flex-col font-sans relative">
      {/* Header */}
      <Motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white px-5 py-4 flex items-center gap-4 border-b border-gray-200 sticky top-0 z-20"
      >
        <Motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all shrink-0"
        >
          <ArrowLeft size={22} className="text-gray-900" strokeWidth={2.5} />
        </Motion.button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Parcel Delivery</p>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">What are you sending?</h1>
        </div>
        <div className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 shrink-0 flex items-center gap-1.5">
          <Package size={14} className="text-gray-500" />
          <span>{categories.length} types</span>
        </div>
      </Motion.header>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-32 overflow-y-auto no-scrollbar">
        {/* Section label & Step progress */}
        <Motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          className="mb-6 bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Step 1 of 3</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-yellow-600">Select Category</span>
          </div>
          
          {/* Progress Bar Segments */}
          <div className="flex items-center gap-2 mt-3">
            <div className="h-1.5 flex-1 rounded-full bg-yellow-400" />
            <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
            <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
          </div>
          
          <h2 className="mt-4 text-base font-bold tracking-tight text-gray-900">What describes your item?</h2>
          <p className="mt-1 text-[13px] font-medium text-gray-500">Choose a category below to configure package details.</p>
        </Motion.div>

        {loadError ? (
          <Motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{loadError} Showing saved defaults for now.</span>
          </Motion.div>
        ) : null}

        {/* Category Grid */}
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
          className="grid grid-cols-2 gap-4"
        >
          {loading ? (
            [...Array(6)].map((_, index) => (
              <div
                key={`loading-${index}`}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-gray-100" />
                <div className="mt-4 h-3.5 animate-pulse rounded-full bg-gray-100" />
                <div className="mx-auto mt-2.5 h-3 w-3/4 animate-pulse rounded-full bg-gray-100" />
              </div>
            ))
          ) : (
            categories.map((cat, i) => {
              const isSelected = selectedType === cat.title;
              return (
                <Motion.button
                  key={cat.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedType(cat.title)}
                  className={`relative flex min-h-[160px] flex-col items-center justify-start gap-3 rounded-xl p-4 border transition-all duration-200 text-center cursor-pointer ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-50 shadow-sm ring-1 ring-yellow-400 scale-[1.02]'
                      : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'
                  }`}
                >
                  {/* Selected indicator dot */}
                  <AnimatePresence>
                    {isSelected && (
                      <Motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-3 right-3 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white"
                      />
                    )}
                  </AnimatePresence>

                  {/* 3D image container */}
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all overflow-visible ${cat.bg}`}>
                    <img
                      src={cat.img}
                      alt={cat.title}
                      className="w-10 h-10 object-contain drop-shadow-sm"
                    />
                  </div>

                  {/* Labels */}
                  <div className="w-full flex-grow flex flex-col justify-center mt-1">
                    <span className={`block text-[14px] font-bold leading-tight transition-colors ${
                      isSelected ? 'text-gray-900' : 'text-gray-800'
                    }`}>
                      {cat.title}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium leading-tight text-gray-500 transition-colors">
                      {cat.desc}
                    </span>
                  </div>
                </Motion.button>
              );
            })
          )}
        </Motion.div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pointer-events-none z-30">
        <Motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            navigate('/taxi/user/parcel/details', {
              state: {
                parcelType: selectedType,
                selectedGoodsType: selected,
                goodsTypeFor: selected?.goodsTypeFor || 'both',
              },
            })
          }
          disabled={loading || !selectedType}
          className="pointer-events-auto w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-4 rounded-xl text-base font-bold shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin opacity-70" strokeWidth={2.5} />
              <span>Loading Categories</span>
            </>
          ) : (
            <>
              <span>Next: Item Details</span>
              <ChevronRight size={18} className="opacity-70" strokeWidth={3} />
            </>
          )}
        </Motion.button>
      </div>
    </div>
  );
};

export default ParcelType;
