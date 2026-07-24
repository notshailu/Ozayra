import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURED_PALETTES = [
  { border: "#0A3D36", bgFrom: "#0A3D3620", bgTo: "#0A3D3660", text: "#0A3D36" }, // Teal
  { border: "#C59B34", bgFrom: "#FAD67340", bgTo: "#F1B13270", text: "#8B6B14" }, // Gold
  { border: "#2173DF", bgFrom: "#2173DF20", bgTo: "#2173DF60", text: "#18509E" }, // Blue
  { border: "#E91E63", bgFrom: "#E91E6320", bgTo: "#E91E6360", text: "#A31545" }, // Pink
  { border: "#8B4513", bgFrom: "#8B451320", bgTo: "#8B451360", text: "#5C2E0B" }, // Brown
  { border: "#9C27B0", bgFrom: "#9C27B020", bgTo: "#9C27B060", text: "#6D1B7B" }, // Purple
];

const FeaturedCategories = ({ categoryMap, activeCategory }) => {
  const scrollRef = useRef(null);

  const activeCatId = activeCategory?._id || activeCategory?.id;
  const isAllActive = !activeCatId || activeCatId === "all";

  // Filter categories: if a specific header is active, show its level 2 children.
  // Otherwise, show categories marked as featured on home.
  const displayedCategories = Object.values(categoryMap || {}).filter(c => {
    if (!isAllActive) {
      const parentId = String(c.parentId || c.headerId || c.parent?._id || c.header?._id || c.parent || c.header);
      return parentId === String(activeCatId);
    }
    return c.isFeaturedOnHome;
  });

  const sectionTitle = !isAllActive ? `Explore ${activeCategory.name}` : "Featured categories";

  const scrollCats = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // If there are no categories to display, don't render the section at all
  if (!displayedCategories || displayedCategories.length === 0) {
    return null;
  }

  return (
    <div className="mx-3 md:mx-8 mb-5 relative group z-20 md:mt-3 mt-2 overflow-hidden bg-white dark:bg-card shadow-sm rounded-2xl pt-4 md:pt-6 pb-2">
      <div className="relative z-10 px-4 flex items-center justify-between mb-3">
        <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-[#333333] dark:text-white leading-none">
          {sectionTitle}
        </h2>
      </div>

      <div className="relative">
        <div className="absolute left-2 lg:left-8 top-[50%] -translate-y-1/2 z-20 hidden md:flex">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollCats("left")}
            className="h-9 w-9 bg-white/90 backdrop-blur-md shadow-lg rounded-full flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-white text-[#333333] transition-all"
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </motion.button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar px-4 pb-4 pt-1 snap-x scroll-smooth"
        >
          {displayedCategories.map((item, index) => {
            // Determine colors: If default green is found, use a vibrant multicolor palette based on index
            const rawColor = item.color || item.headerColor || item.accentColor;
            const useFallback = !rawColor || rawColor === "#0c831f";
            
            const palette = useFallback 
              ? FEATURED_PALETTES[index % FEATURED_PALETTES.length]
              : { border: rawColor, bgFrom: `${rawColor}20`, bgTo: `${rawColor}60`, text: rawColor };

            return (
              <Link key={item.id} to={`/quick/categories/${item.slug}`} className="shrink-0 snap-start">
                <motion.div
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    borderColor: palette.border, 
                    background: `linear-gradient(to bottom, ${palette.bgFrom}, ${palette.bgTo})`
                  }}
                  className={`relative w-[130px] h-[160px] md:w-[150px] md:h-[185px] rounded-[16px] border-[2px] overflow-hidden shadow-sm group/card cursor-pointer`}
                >
                  {/* Badge */}
                  <div className="absolute top-0 left-0 right-0 flex justify-center z-20">
                    <div
                      style={{ borderColor: palette.border }}
                      className={`mt-[-2px] px-3 py-1 rounded-b-xl shadow-sm border-x border-b bg-white`}
                    >
                      <span 
                        style={{ color: palette.text }}
                        className="text-[9px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                      >
                        Featured
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="absolute top-[45px] md:top-[55px] left-0 right-0 px-2 z-20 text-center">
                    <h3
                      className={`text-[14px] md:text-[16px] font-[900] leading-tight text-[#1A1A1A] drop-shadow-md`}
                    >
                      {item.name}
                    </h3>
                  </div>

                  {/* Image */}
                  <div className="absolute inset-0 z-10 flex items-end justify-center">
                    <div className="w-[110%] h-[65%] mb-[-10%] relative flex justify-center items-end">
                       <img
                         src={item.image || "https://images.unsplash.com/photo-1555505019-8c3f1c4aba5f?auto=format&fit=crop&q=80&w=300"}
                         alt={item.name}
                         className="w-full h-full object-cover rounded-full filter drop-shadow-2xl group-hover/card:scale-105 transition-transform duration-500"
                         style={{ maskImage: "linear-gradient(to top, black 50%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 50%, transparent 100%)" }}
                       />
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
          {/* Spacer to fix right padding issue in webkit scroll containers */}
          <div className="shrink-0 w-1 md:w-4" aria-hidden="true"></div>
        </div>

        <div className="absolute right-4 lg:right-10 top-[50%] -translate-y-1/2 z-20 hidden md:flex">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollCats("right")}
            className="h-9 w-9 bg-white/90 backdrop-blur-md shadow-lg rounded-full flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-white text-[#333333] transition-all"
          >
            <ChevronRight size={20} strokeWidth={3} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedCategories;
