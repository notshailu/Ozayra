import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Heart, Search, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { cn } from '@/lib/utils';

import ProductCard from '../components/shared/ProductCard';
import ProductDetailSheet from '../components/shared/ProductDetailSheet';
import { useProductDetail } from '../context/ProductDetailContext';
import { customerApi } from '../services/customerApi';
import MiniCart from '../components/shared/MiniCart';
import SectionRenderer from "../components/experience/SectionRenderer";
import ExperienceBannerCarousel from "../components/experience/ExperienceBannerCarousel";
import { resolveQuickImageUrl } from '../utils/image';
import { getQuickCategoryPath } from '../utils/routes';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useSettings } from "@core/context/SettingsContext";
import { useQuickHomeData } from '../hooks/useQuickHomeData';

const QUICK_THEME_STORAGE_KEY = "food.quick.headerColor";
const QUICK_HEADER_RETURN_STORAGE_KEY = "food.quick.headerReturn";
const FALLBACK_HEADER_COLOR = "#0c831f";

const quickCategoryPalettes = [
  { bgFrom: "#ffd96a", bgVia: "#ffeaa0", bgTo: "#fff0c7", glowColor: "rgba(255,184,0,0.18)", frameColor: "#f0d98a" },
  { bgFrom: "#9fe88c", bgVia: "#c3f1b2", bgTo: "#e4f8da", glowColor: "rgba(126,220,141,0.18)", frameColor: "#bfe3b7" },
  { bgFrom: "#f3a25d", bgVia: "#f9c48b", bgTo: "#fee0bf", glowColor: "rgba(255,139,61,0.16)", frameColor: "#efc08e" },
  { bgFrom: "#b8eff0", bgVia: "#d5f7f5", bgTo: "#edfdfc", glowColor: "rgba(122,215,215,0.16)", frameColor: "#b9e5e3" },
];

const getQuickCategoryImage = (category = {}) => {
  const candidate =
    category?.image ||
    category?.icon ||
    category?.thumbnail ||
    category?.imageUrl ||
    category?.iconUrl ||
    category?.media?.image ||
    category?.media?.url ||
    "";

  return (
    resolveQuickImageUrl(candidate, category?.name) ||
    "https://cdn-icons-png.flaticon.com/128/1828/1828859.png"
  );
};

const SidebarSkeleton = () => (
    <div className="flex flex-col gap-6 py-4 px-3 w-full items-center">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-full animate-pulse">
                <div className="w-[60px] h-[60px] rounded-2xl bg-slate-100/70" />
                <div className="h-2.5 w-10 bg-slate-100/70 rounded-full" />
            </div>
        ))}
    </div>
);

const ProductCardSkeleton = () => (
    <div className="border border-slate-100 rounded-2xl p-2.5 bg-white flex flex-col h-full gap-3 animate-pulse">
        <div className="aspect-square w-full rounded-xl bg-slate-50" />
        <div className="h-2.5 w-1/3 bg-slate-100 rounded-full" />
        <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-5/6 bg-slate-100 rounded-full" />
            <div className="h-3 w-1/2 bg-slate-100 rounded-full" />
        </div>
        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-50">
            <div className="space-y-1">
                <div className="h-4 w-12 bg-slate-100 rounded-full" />
                <div className="h-3 w-8 bg-slate-100 rounded-full" />
            </div>
            <div className="h-8 w-14 bg-slate-50 rounded-lg" />
        </div>
    </div>
);

const CategoryProductsPage = () => {
    const { categoryId: catId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentLocation } = useAppLocation();
    const { settings } = useSettings();
    const {
        activeCategory,
        categories,
        isLoading: isDataLoading,
        isBootstrapped
    } = useQuickHomeData({ currentLocation, settings });
    
    const initialSubcategoryId = location.state?.activeSubcategoryId || 'all';
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubcategoryId);
    const [category, setCategory] = useState(null);
    const [subCategories, setSubCategories] = useState([{ id: 'all', name: 'All', icon: 'https://cdn-icons-png.flaticon.com/128/1828/1828859.png' }]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [headerTheme, setHeaderTheme] = useState(FALLBACK_HEADER_COLOR);
    const [localActiveHeader, setLocalActiveHeader] = useState(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const storedTheme = window.sessionStorage.getItem(QUICK_THEME_STORAGE_KEY);
        const storedHeaderReturn = window.sessionStorage.getItem(QUICK_HEADER_RETURN_STORAGE_KEY);

        if (storedTheme && /^#[0-9a-fA-F]{6}$/.test(storedTheme)) {
            setHeaderTheme(storedTheme);
            return;
        }

        if (storedHeaderReturn) {
            try {
                const parsed = JSON.parse(storedHeaderReturn);
                if (parsed?.color && /^#[0-9a-fA-F]{6}$/.test(parsed.color)) {
                    setHeaderTheme(parsed.color);
                }
            } catch (error) {
                // Ignore malformed stored header context.
            }
        }
    }, []);

    const [experienceSections, setExperienceSections] = useState([]);
    const [heroConfig, setHeroConfig] = useState(null);
    const [categoryMap, setCategoryMap] = useState({});
    const [subcategoryMap, setSubcategoryMap] = useState({});
    const [fullCategoryMap, setFullCategoryMap] = useState({});

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);

            const [prodRes, catRes, expRes, heroRes] = await Promise.all([
                hasValidLocation
                    ? customerApi.getProducts({
                        categoryId: catId,
                        lat: currentLocation.latitude,
                        lng: currentLocation.longitude,
                    })
                    : Promise.resolve({ data: { success: true, result: { items: [] } } }),
                customerApi.getCategories({ tree: true }),
                customerApi.getExperienceSections({ pageType: 'header', headerId: catId }).catch(() => null),
                customerApi.getHeroConfig({ pageType: 'header', headerId: catId }).catch(() => null)
            ]);

            if (prodRes.data.success) {
                const rawResult = prodRes.data.result;
                const dbProds = Array.isArray(prodRes.data.results)
                    ? prodRes.data.results
                    : Array.isArray(rawResult?.items)
                        ? rawResult.items
                        : Array.isArray(rawResult)
                            ? rawResult
                            : [];

                const formattedProds = dbProds.map(p => ({
                    ...p,
                    id: p._id,
                    image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2",
                    price: p.salePrice || p.price,
                    originalPrice: p.price,
                    weight: p.weight || "1 unit",
                    deliveryTime: "8-15 mins"
                }));
                setProducts(Array.isArray(formattedProds) ? formattedProds : []);
            }

            if (catRes.data.success) {
                const results = catRes.data.results || catRes.data.result || [];
                const allCats = Array.isArray(results) ? results : [];

                // Build maps for SectionRenderer
                const cMap = {};
                const sMap = {};
                const fullMap = {};
                
                const flatten = (items) => {
                    items.forEach(item => {
                        fullMap[item._id] = item;
                        if (item.type === 'category') cMap[item._id] = item;
                        else if (item.type === 'subcategory') sMap[item._id] = item;
                        if (item.children && item.children.length > 0) flatten(item.children);
                    });
                };
                flatten(allCats);
                setCategoryMap(cMap);
                setSubcategoryMap(sMap);
                setFullCategoryMap(fullMap);

                // Find the current category in the flattened map
                let currentCat = fullMap[catId];
                
                if (currentCat) {
                    setCategory(currentCat);
                    
                    // Populate subcategories
                    let subs = [];
                    let isDirectSub = false;

                    if (currentCat.children && currentCat.children.length > 0) {
                        // It's a parent category, show its children
                        subs = currentCat.children;
                    } else if (currentCat.parentId) {
                        // It's a subcategory, find its parent and show all siblings
                        const parent = fullMap[currentCat.parentId?._id || currentCat.parentId];
                        if (parent && parent.children) {
                            subs = parent.children;
                        }
                        isDirectSub = true;
                    }

                    const formattedSubs = subs.map(s => ({
                        id: s._id,
                        name: s.name,
                        icon: s.image || 'https://cdn-icons-png.flaticon.com/128/2321/2321801.png'
                    }));
                    
                    setSubCategories([{ id: 'all', name: 'All', icon: 'https://cdn-icons-png.flaticon.com/128/1828/1828859.png' }, ...formattedSubs]);
                    
                    // If we arrived here directly with a subcategory ID, select it
                    if (isDirectSub && selectedSubCategory === 'all' && !location.state?.activeSubcategoryId) {
                        setSelectedSubCategory(currentCat._id);
                    }
                }
            }

            if (expRes?.data?.success) {
                setExperienceSections(expRes.data.result || expRes.data.results || []);
            }
            if (heroRes?.data?.success) {
                let heroData = heroRes.data.result;
                const hasBanners = (heroData?.banners?.items || []).length > 0;
                const hasCategories = (heroData?.categoryIds || []).length > 0;

                if (!hasBanners && !hasCategories) {
                    try {
                        const homeHeroRes = await customerApi.getHeroConfig({ pageType: 'home' });
                        if (homeHeroRes?.data?.success && homeHeroRes.data.result) {
                            heroData = homeHeroRes.data.result;
                        }
                    } catch (e) {
                        console.error("Error fetching fallback home hero config:", e);
                    }
                }
                setHeroConfig(heroData);
            }
        } catch (error) {
            console.error("Error fetching category data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setSelectedSubCategory(location.state?.activeSubcategoryId || 'all');
    }, [catId, location.state?.activeSubcategoryId, currentLocation?.latitude, currentLocation?.longitude]);

    const safeProducts = Array.isArray(products) ? products : [];

    const filteredProducts = safeProducts.filter(p =>
        selectedSubCategory === 'all' || p.subcategoryId?._id === selectedSubCategory || p.subcategoryId === selectedSubCategory
    );

    const productsById = React.useMemo(() => {
        const map = {};
        safeProducts.forEach(p => {
            map[p._id || p.id] = p;
        });
        return map;
    }, [safeProducts]);

    return (
        <div className="flex h-[100dvh] md:h-screen max-h-screen flex-col bg-white dark:bg-background font-outfit pt-0 transition-colors duration-500 overflow-hidden">
            <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col overflow-hidden">
                {/* Category Subheader */}
                <header className={cn(
                    "shrink-0 z-30 px-4 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white shadow-sm",
                    isProductDetailOpen && "hidden md:flex"
                )}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-full transition-colors active:scale-95"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Quick Category
                            </span>
                            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none mt-0.5">
                                {category?.name ? (
                                    category.name
                                ) : isLoading ? (
                                    <div className="h-[18px] w-24 bg-slate-100 animate-pulse rounded-md mt-1" />
                                ) : (
                                    catId
                                )}
                            </h1>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 relative items-start overflow-hidden min-h-0">
                    {/* Sidebar */}
                    <aside className="w-24 md:w-28 shrink-0 border-r border-slate-100 flex flex-col bg-[#fcfcfc] overflow-y-auto hide-scrollbar h-full pb-28">
                        {isLoading ? (
                            <SidebarSkeleton />
                        ) : (
                            subCategories.map((cat) => {
                                const isSelected = selectedSubCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedSubCategory(cat.id)}
                                        className={cn(
                                            "flex flex-col items-center py-4 px-1.5 gap-2.5 transition-all relative border-l-2 select-none outline-none",
                                            isSelected
                                                ? "bg-white border-green-600 text-green-700"
                                                : "border-transparent text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-[60px] h-[60px] rounded-2xl flex items-center justify-center transition-all duration-300 bg-slate-50 overflow-hidden relative",
                                            isSelected 
                                                ? "border-2 border-green-600 shadow-[0_4px_12px_rgba(12,131,31,0.15)] scale-105" 
                                                : "border border-slate-100 opacity-90"
                                        )}>
                                            {cat.id === 'all' ? (
                                                <div className="w-full h-full p-4 bg-slate-50 flex items-center justify-center">
                                                    <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain opacity-70" />
                                                </div>
                                            ) : (
                                                <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain p-1.5" />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-[11px] text-center font-semibold leading-tight px-1 tracking-tight truncate w-full",
                                            isSelected ? "text-green-700 font-bold" : "text-slate-400"
                                        )}>
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </aside>

                    {/* Content */}
                    <main className="flex-1 min-w-0 px-3 pt-2 pb-28 bg-white dark:bg-background transition-colors overflow-y-auto h-full">
                        {selectedSubCategory === 'all' && heroConfig && (
                            <>
                                {/* Hero Banners */}
                                {(heroConfig.banners?.items || []).length > 0 && (
                                    <div className="mb-6 rounded-[24px] overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
                                        <ExperienceBannerCarousel
                                            section={{ title: "" }}
                                            items={heroConfig.banners.items}
                                            fullWidth={true}
                                            slideGap={8}
                                        />
                                    </div>
                                )}

                                {/* Categories Below Hero */}
                                {(heroConfig.categoryIds || []).length > 0 && (
                                    <div className="mb-8 bg-slate-50/50 dark:bg-card/30 rounded-[24px] p-4 border border-slate-100 dark:border-white/5">
                                        <h3 className="text-xs font-black tracking-[0.14em] text-slate-800 dark:text-slate-200 uppercase font-sans mb-3.5 px-1">
                                            Featured Categories
                                        </h3>
                                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
                                            {(heroConfig.categoryIds || []).map((id, idx) => {
                                                const cat = fullCategoryMap[id];
                                                if (!cat) return null;
                                                const palette = quickCategoryPalettes[idx % quickCategoryPalettes.length];
                                                const categoryImage = getQuickCategoryImage(cat);
                                                return (
                                                    <motion.div
                                                        key={id}
                                                        whileHover={{ y: -4 }}
                                                        whileTap={{ scale: 0.96 }}
                                                        onClick={() => {
                                                            if (subCategories.some(sub => sub.id === id)) {
                                                                setSelectedSubCategory(id);
                                                            } else {
                                                                navigate(getQuickCategoryPath(id));
                                                            }
                                                        }}
                                                        className="flex flex-col items-center gap-1.5 min-w-[76px] cursor-pointer group snap-start"
                                                    >
                                                        <div
                                                            className="relative w-[76px] h-[86px] rounded-t-full rounded-b-[18px] shadow-[0_6px_12px_rgba(15,23,42,0.06)] border flex items-start justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_10px_20px_rgba(15,23,42,0.15)] group-hover:rotate-1"
                                                            style={{
                                                                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.6) 24%, rgba(255,255,255,0.15) 100%), linear-gradient(135deg, ${palette.bgFrom}, ${palette.bgVia}, ${palette.bgTo})`,
                                                                borderColor: palette.frameColor,
                                                            }}
                                                        >
                                                            <div
                                                                className="absolute inset-0 opacity-40 pointer-events-none"
                                                                style={{ backgroundColor: palette.glowColor }}
                                                            />
                                                            {categoryImage ? (
                                                                <img
                                                                    src={categoryImage}
                                                                    alt={cat.name}
                                                                    className="absolute top-0 left-0 w-full h-[72%] object-contain p-2 group-hover:scale-110 transition-transform duration-500 rounded-t-full"
                                                                />
                                                            ) : (
                                                                <div className="absolute top-0 left-0 w-full h-[72%] flex items-center justify-center bg-white/55 text-lg font-black uppercase text-slate-400 rounded-t-full">
                                                                    {(cat.name || "?").charAt(0)}
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-x-1 bottom-1.5 z-20 text-center">
                                                                <span className="block text-[9px] font-bold text-[#1f2b20] leading-tight whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-[#0c831f] transition-colors">
                                                                    {cat.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {selectedSubCategory === 'all' && experienceSections.filter(s => (s.title || '').trim().toLowerCase() !== 'best sellers').length > 0 && (
                            <div className="mb-4">
                                <SectionRenderer
                                    sections={experienceSections.filter(s => 
                                        (s.title || '').trim().toLowerCase() !== 'best sellers'
                                    )}
                                    productsById={productsById}
                                    categoriesById={categoryMap}
                                    subcategoriesById={subcategoryMap}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-4 md:gap-4 lg:gap-6 p-1">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <ProductCardSkeleton key={i} />
                                ))
                            ) : (
                                filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} compact={true} />
                                ))
                            )}
                            {filteredProducts.length === 0 && !isLoading && (
                                <div className="col-span-full py-16 px-4 flex flex-col items-center justify-center text-center">
                                    <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400 animate-fade-in">
                                        <Search size={30} strokeWidth={1.5} className="text-slate-350" />
                                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 border-2 border-white text-xs">
                                            ✨
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800">No items found</h3>
                                    <p className="mt-1.5 max-w-[260px] text-sm text-slate-400 leading-relaxed">
                                        We couldn't find any products in this subcategory right now.
                                    </p>
                                    <button
                                        onClick={() => setSelectedSubCategory('all')}
                                        className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-650 transition-colors hover:bg-slate-50 active:scale-95"
                                    >
                                        Browse all items
                                    </button>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                <MiniCart />
                <ProductDetailSheet />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                    
                    body {
                        font-family: 'Outfit', sans-serif;
                    }
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .hide-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}} />
        </div>
    );
};

export default CategoryProductsPage;
