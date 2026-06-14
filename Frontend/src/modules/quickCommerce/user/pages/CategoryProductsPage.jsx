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
    "https://cdn-icons-png.flaticon.com/128/2321/2321831.png"
  );
};

const CategoryProductsPage = () => {
    const { categoryId: catId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentLocation } = useAppLocation();
    const initialSubcategoryId = location.state?.activeSubcategoryId || 'all';
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubcategoryId);
    const [category, setCategory] = useState(null);
    const [subCategories, setSubCategories] = useState([{ id: 'all', name: 'All', icon: 'https://cdn-icons-png.flaticon.com/128/2321/2321831.png' }]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [headerTheme, setHeaderTheme] = useState(FALLBACK_HEADER_COLOR);

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
                    
                    setSubCategories([{ id: 'all', name: 'All', icon: 'https://cdn-icons-png.flaticon.com/128/2321/2321831.png' }, ...formattedSubs]);
                    
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
        <div className="flex min-h-screen flex-col bg-white dark:bg-background font-sans pt-0 transition-colors duration-500">
            <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col">
                {/* Category Subheader */}
                <header className={cn(
                    "sticky top-0 z-30 px-4 py-4 flex items-center justify-between border-b border-white/20 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md",
                    isProductDetailOpen && "hidden md:flex"
                )}
                    style={{
                        backgroundImage: `linear-gradient(180deg, ${headerTheme} 0%, ${headerTheme}F2 100%)`,
                    }}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1 hover:bg-white/15 rounded-full transition-colors"
                        >
                            <ChevronLeft size={24} className="text-white" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">
                                Quick Category
                            </span>
                            <h1 className="text-[18px] font-bold text-white tracking-tight">
                                {category?.name || catId}
                            </h1>
                        </div>
                    </div>

                </header>

                <div className="flex flex-1 relative items-start">
                    {/* Sidebar */}
                    <aside className="w-20 md:w-28 border-r border-gray-50 dark:border-white/5 flex flex-col bg-white dark:bg-card overflow-y-auto hide-scrollbar sticky top-0 h-screen pb-32 transition-colors">
                        {subCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedSubCategory(cat.id)}
                                className={cn(
                                    "flex flex-col items-center py-4 px-1 gap-2 transition-all relative border-l-4",
                                    selectedSubCategory === cat.id
                                        ? "bg-[#F7FCF5] dark:bg-emerald-950/20 border-[#0c831f]"
                                        : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center p-2 transition-all duration-300",
                                    selectedSubCategory === cat.id ? "scale-110" : "grayscale opacity-70"
                                )}>
                                    <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                                </div>
                                <span className={cn(
                                    "text-[10px] text-center font-bold font-sans leading-tight px-1",
                                    selectedSubCategory === cat.id ? "text-[#0c831f]" : "text-gray-500"
                                )}>
                                    {cat.name}
                                </span>
                            </button>
                        ))}
                    </aside>

                    {/* Content */}
                    <main className="flex-1 px-3 pt-1 pb-24 bg-white dark:bg-background transition-colors">
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
                                                                    className="absolute top-0 left-0 w-full h-[72%] object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-full"
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

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-4 md:gap-4 lg:gap-6">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} compact={true} />
                            ))}
                            {filteredProducts.length === 0 && !isLoading && (
                                <div className="col-span-2 py-20 text-center">
                                    <p className="text-gray-400 font-bold italic">No products found in this category</p>
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
