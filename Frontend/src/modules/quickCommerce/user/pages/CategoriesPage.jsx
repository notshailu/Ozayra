import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLocationHeader from '../components/shared/MainLocationHeader';
import { customerApi } from '../services/customerApi';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveQuickImageUrl } from '../utils/image';
import { getQuickSearchPath } from '../utils/routes';
import { Search, Mic } from 'lucide-react';
import { useQuickHomeData } from '../hooks/useQuickHomeData';
import { useSettings } from '@core/context/SettingsContext';
import { useLocation } from '../context/LocationContext';
import { getQuickCategoryPath } from '../utils/routes';
import { cn } from "@/lib/utils";

// Helper to ensure proper Title Casing even if entered lowercase in admin DB
const formatTitle = (str = "") => {
    if (!str || typeof str !== "string") return "";
    return str
        .trim()
        .split(/\s+/)
        .map(word => {
            if (!word) return "";
            if (word === "&" || word.toLowerCase() === "and") return word === "&" ? "&" : "and";
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
};

const CategoryCard = ({ category, themeColor }) => {
    return (
        <div className="flex flex-col items-center cursor-pointer">
            <div 
                className="w-full aspect-square rounded-[16px] sm:rounded-2xl flex items-center justify-center p-2.5 sm:p-3 relative overflow-hidden"
                style={{ backgroundColor: themeColor }}
            >
                <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-contain mix-blend-multiply" // Added mix-blend-multiply to help with white backgrounds on JPGs
                    onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop";
                    }}
                />
            </div>
            <span className="block text-[11px] sm:text-[12px] font-[600] text-[#333333] dark:text-slate-200 text-center leading-[1.25] tracking-tight mt-2 px-0.5">
                {formatTitle(category.name)}
            </span>
        </div>
    );
};

const CategoriesPage = () => {
    const navigate = useNavigate();
    const { currentLocation } = useLocation();
    const { settings } = useSettings();
    const { categories: headerCategories, activeCategory: headerActiveCategory, setActiveCategory: setHeaderActiveCategory } = useQuickHomeData();
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const quickThemeColor = settings?.quickThemeColor || "#F1ECC6";

    const searchPath = getQuickSearchPath();
    const [searchPlaceholder, setSearchPlaceholder] = useState('Search "chocolate"');
    const [textIndex, setTextIndex] = useState(0);

    const typingPhrases = [
        'Search "chocolate"',
        'Search "milk & bread"',
        'Search "chips & namkeen"',
        'Search "cold drinks"',
        'Search "vegetables"',
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % typingPhrases.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setSearchPlaceholder(typingPhrases[textIndex]);
    }, [textIndex]);

    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await customerApi.getCategories({ tree: true });
            if (res?.data?.success) {
                const results = res.data.results || res.data.result || [];
                const allCategories = Array.isArray(results) ? results : [];

                const headerCats = allCategories.filter(cat => cat.type === "header");
                const normalCats = allCategories.filter(cat => cat.type === "category" || cat.type === "subcategory");

                let formattedGroups = [];

                if (headerCats.length > 0) {
                    formattedGroups = headerCats
                        .filter((header) => (header.name || '').trim().toLowerCase() !== 'all')
                        .map((header, idx) => {
                            let subs = header.children && header.children.length > 0
                                ? header.children
                                : allCategories.filter(cat => String(cat.parentId) === String(header._id) || String(cat.headerId) === String(header._id));

                            if (subs.length === 0) return null;

                            return {
                                id: header._id || idx,
                                title: header.name,
                                categories: subs.map((cat, cIdx) => ({
                                    id: cat._id || `${idx}-${cIdx}`,
                                    name: cat.name,
                                    image: resolveQuickImageUrl(cat.image || cat.icon || cat.thumbnail, cat.name),
                                }))
                            };
                        }).filter(Boolean);
                }

                if (formattedGroups.length === 0 && normalCats.length > 0) {
                    formattedGroups = [{
                        id: 'all-cats',
                        title: 'All Categories',
                        categories: normalCats.map((cat, idx) => ({
                            id: cat._id || idx,
                            name: cat.name,
                            image: resolveQuickImageUrl(cat.image || cat.icon || cat.thumbnail, cat.name),
                        }))
                    }];
                }

                setGroups(formattedGroups);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return (
        <div 
            style={{ fontFamily: "'Okra', 'Outfit', sans-serif" }}
            className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500 pb-24"
        >
            {/* Unified Blinkit Warm Yellow Top Bar containing both location AND search bar inside ONE single component */}
            <MainLocationHeader 
                showCategories={true} 
                categories={headerCategories}
                activeCategory={headerActiveCategory}
                onCategorySelect={(cat) => {
                    setHeaderActiveCategory(cat);
                    // Also scroll to the group if it exists
                    const groupId = cat._id || cat.id;
                    if (groupId && groupId !== 'all') {
                        const el = document.getElementById(`group-${groupId}`);
                        if (el) {
                            const offset = 180; // approximate header height
                            const top = el.getBoundingClientRect().top + window.scrollY - offset;
                            window.scrollTo({ top, behavior: 'smooth' });
                        }
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }}
                showSearchBar={true} 
            />

            {/* Categories Content begins below the unified top header */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-[220px] sm:pt-[230px] md:pt-[250px]">
                    <AnimatePresence mode='wait'>
                        {isLoading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-64 gap-3"
                            >
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loading categories...</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-8 sm:space-y-10">
                                {groups.map((group, groupIdx) => (
                                    <motion.section
                                        key={group.id}
                                        id={`group-${group.id}`}
                                        initial={{ opacity: 0, y: 15 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-40px" }}
                                        transition={{ duration: 0.35, delay: Math.min(groupIdx * 0.06, 0.3) }}
                                        className="space-y-3.5"
                                    >
                                        {/* Blinkit-style Section Heading */}
                                        <h2 className="text-[17px] sm:text-[19px] font-[800] text-[#222222] dark:text-white tracking-tight px-0 mb-2">
                                            {formatTitle(group.title)}
                                        </h2>

                                        {/* 4 columns on mobile, matching Blinkit gaps */}
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-6">
                                            {group.categories.map((category, cIdx) => (
                                                <div
                                                    key={category.id}
                                                    onClick={() => navigate(getQuickCategoryPath(category.id))}
                                                    className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl cursor-pointer"
                                                >
                                                    <CategoryCard
                                                        category={category}
                                                        themeColor={quickThemeColor}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </motion.section>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
    );
};

export default CategoriesPage;


