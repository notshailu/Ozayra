import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Plus, Minus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { resolveQuickImageUrl } from "../../utils/image";
import { getCloudinarySrcSet } from "@/shared/utils/cloudinaryUtils";

import { motion, AnimatePresence } from "framer-motion";

import { getQuickProductPath } from "../../utils/routes";
import { useSettings } from "@core/context/SettingsContext";

const FlatBadge = ({ text, className }) => (
  <div className={cn("bg-[#5b2bab] text-white px-1.5 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase tracking-wider shadow-sm", className)}>
    {text}
  </div>
);

const ProductCard = React.memo(
  ({ product, badge, className, compact = false, colorTheme = "green" }) => {
    const navigate = useNavigate();
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } =
      useWishlist();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { showToast } = useToast();
    const { animateAddToCart, animateRemoveFromCart } = useCartAnimation();

    const [showHeartPopup, setShowHeartPopup] = React.useState(false);
    const imageRef = React.useRef(null);

    const themeStyles = {
      green: { text: "text-[#0c831f]", border: "border-[#0c831f]", bgHover: "hover:bg-green-50", bgSolid: "bg-[#0c831f]" },
      blue: { text: "text-[#004b91]", border: "border-[#004b91]", bgHover: "hover:bg-blue-50", bgSolid: "bg-[#004b91]" }
    };
    const tStyle = themeStyles[colorTheme] || themeStyles.green;

    const getComparableProductId = React.useCallback(
      (value) => String(value ?? "").split("::")[0],
      [],
    );

    const cartItem = React.useMemo(
      () =>
        cart.find(
          (item) =>
            getComparableProductId(item.productId || item.itemId || item.id || item._id) ===
            getComparableProductId(product.id || product._id),
        ),
      [cart, getComparableProductId, product.id, product._id],
    );
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = isInWishlist(product.id || product._id);

    const handleProductClick = React.useCallback(
      () => {
        const productId = product.id || product._id;
        if (!productId) return;
        navigate(getQuickProductPath(productId), { state: { product } });
      },
      [navigate, product],
    );

    const toggleWishlist = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isWishlisted) {
          setShowHeartPopup(true);
          setTimeout(() => setShowHeartPopup(false), 1000);
        }

        toggleWishlistGlobal(product);
        showToast(
          isWishlisted
             ? `${product.name} removed from wishlist`
            : `${product.name} added to wishlist`,
          isWishlisted ? "info" : "success",
        );
      },
      [isWishlisted, toggleWishlistGlobal, product, showToast],
    );

    const handleAddToCart = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const stock = Number(product.stock ?? Infinity);
        if (stock <= 0) {
          showToast("This product is out of stock", "error");
          return;
        }
        if (imageRef.current) {
          const resolvedSrc = resolveQuickImageUrl(product.image || product.mainImage) || product.image || product.mainImage;
          animateAddToCart(
            imageRef.current.getBoundingClientRect(),
            resolvedSrc,
          );
        }
        addToCart(product);
      },
      [animateAddToCart, product, addToCart],
    );

    const handleIncrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const stock = Number(product.stock ?? Infinity);
        if (quantity >= stock) {
          showToast(`Only ${stock} in stock`, "error");
          return;
        }
        updateQuantity(product.id || product._id, 1);
      },
      [updateQuantity, product.id, product._id],
    );

    const handleDecrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (quantity === 1) {
          animateRemoveFromCart(product.image);
          removeFromCart(product.id || product._id);
        } else {
          updateQuantity(product.id || product._id, -1);
        }
      },
      [
        quantity,
        animateRemoveFromCart,
        product.image,
        removeFromCart,
        product.id,
        product._id,
        updateQuantity,
      ],
    );

    return (
      <div
        className={cn(
          "flex-shrink-0 w-full flex flex-col h-full cursor-pointer bg-transparent",
          className,
        )}
        onClick={handleProductClick}>
        <div className="flex flex-col h-full w-full rounded-[16px] md:rounded-[20px] overflow-hidden transition-all duration-500 border border-gray-100/80 bg-white hover:border-blue-100/60 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.08)] group/card">
          {/* Top Image Section */}
          <div className="relative overflow-hidden w-full aspect-square bg-gradient-to-b from-slate-50/50 to-slate-100/80 flex items-center justify-center transition-transform duration-500 p-4">
            {/* Heart Icon */}
            <button
              onClick={toggleWishlist}
              className="absolute top-2.5 right-2.5 z-10 p-1.5 flex items-center justify-center cursor-pointer active:scale-90 transition-all bg-white/50 backdrop-blur-md rounded-full shadow-sm hover:bg-white">
              <motion.div
                whileTap={{ scale: 0.8 }}
                animate={isWishlisted ? { scale: [1, 1.3, 1] } : {}}>
                <Heart
                  size={16}
                  strokeWidth={2.5}
                  className={cn(
                    isWishlisted ? "text-rose-500 fill-rose-500" : "text-gray-400 hover:text-gray-600"
                  )}
                />
              </motion.div>
            </button>

            {/* Static Dots */}
            <div className="absolute bottom-3 left-3 flex gap-1 items-center z-10 opacity-70">
               <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-gray-400 bg-transparent"></div>
               <div className="w-1 h-1 rounded-full bg-gray-300"></div>
               <div className="w-1 h-1 rounded-full bg-gray-300"></div>
            </div>

            <AnimatePresence>
              {showHeartPopup && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1, y: 0 }}
                  animate={{ scale: 2.5, opacity: 0, y: -60 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none text-rose-500/40">
                  <Heart size={48} fill="currentColor" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full h-full p-2 flex items-center justify-center transition-transform duration-500 group-hover/card:scale-110">
              <img
                ref={imageRef}
                src={resolveQuickImageUrl(product.image || product.mainImage) || product.image || product.mainImage}
                srcSet={getCloudinarySrcSet(product.image || product.mainImage)}
                sizes="(max-width: 768px) 150px, (max-width: 1024px) 200px, 250px"
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply filter contrast-[1.05]"
                loading="lazy"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex flex-col flex-1 px-3.5 pb-3.5 pt-3 bg-white relative">
             {/* Title & Weight */}
             <div className="mb-3">
               <h3 className="text-[13px] md:text-[14px] font-[800] text-slate-800 line-clamp-2 leading-snug tracking-tight mb-1 group-hover/card:text-[#0c831f] transition-colors">
                 {product.name}
               </h3>
               <span className="text-[11px] text-slate-500 font-semibold truncate block">
                 {product.weight || "1 unit"}
               </span>
             </div>

             {/* Optional Badge */}
             {badge && (
               <div className="self-start bg-amber-50 border border-amber-100 text-amber-600 px-1.5 py-[2px] rounded text-[9px] font-black uppercase tracking-wider mb-2 max-w-full truncate shadow-sm">
                 {badge}
               </div>
             )}

             {/* Delivery Time & See More */}
             <div className="flex items-center gap-1.5 mb-3 flex-wrap">
               <div className="flex items-center gap-1 text-[9px] text-slate-600 font-bold bg-slate-100/80 px-1.5 py-1 rounded-md">
                 <Clock size={10} className="text-slate-500" strokeWidth={2.5} />
                 <span>{product.deliveryTime || "8-15 mins"}</span>
               </div>
               {product.originalPrice > product.price && (
                 <div className="text-[9px] font-black text-blue-600 bg-blue-50/80 border border-blue-100/50 px-1.5 py-1 rounded-md uppercase tracking-wider">
                   ₹{Number(product.originalPrice - product.price).toLocaleString()} OFF
                 </div>
               )}
             </div>

             {/* Price and Add Button */}
             <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-gray-50/50">
               <div className="flex flex-col">
                 <div className="flex items-baseline gap-1">
                   <span className="text-[16px] md:text-[17px] font-[900] text-slate-900 leading-none tracking-tighter">
                     ₹{Number(product.price || 0).toLocaleString()}
                   </span>
                 </div>
                 {product.originalPrice > product.price && (
                   <span className="text-[10px] text-slate-400 line-through leading-none mt-1 font-bold">
                     ₹{Number(product.originalPrice || 0).toLocaleString()}
                   </span>
                 )}
               </div>
               
               {/* ADD BUTTON */}
               {quantity > 0 ? (
                 <div className={`flex items-center ${tStyle.bgSolid} text-white rounded-lg shadow-sm h-8 overflow-hidden w-[70px] md:w-[75px]`}>
                   <button onClick={handleDecrement} className="w-1/3 h-full flex items-center justify-center hover:bg-black/10 transition-colors"><Minus size={13} strokeWidth={3} /></button>
                   <span className="w-1/3 text-center text-[13px] font-bold">{quantity}</span>
                   <button onClick={handleIncrement} className="w-1/3 h-full flex items-center justify-center hover:bg-black/10 transition-colors"><Plus size={13} strokeWidth={3} /></button>
                 </div>
               ) : (
                 <button onClick={handleAddToCart} className={`h-8 px-[18px] border ${tStyle.border} ${tStyle.text} bg-white ${tStyle.bgHover} rounded-lg text-[12px] font-bold tracking-tight uppercase shadow-sm transition-all duration-300 active:scale-95`}>
                   ADD
                 </button>
               )}
             </div>

             {/* See More Link */}
             <div className="absolute top-0 right-0 p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none hidden md:block">
                 <div className="bg-[#f0f9f3]/90 backdrop-blur-sm text-[#0c831f] px-2 py-1 rounded-md flex items-center gap-1 shadow-sm border border-[#0c831f]/10">
                   <span className="text-[9px] font-black tracking-tight">See more</span>
                   <span className="text-[7px] font-black">&#9654;</span>
                 </div>
             </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ProductCard;
