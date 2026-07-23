import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Heart,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "@shared/components/ui/Toast";
import { customerApi } from "../services/customerApi";
import { resolveQuickImageUrl } from "../utils/image";

const getProductIdentifier = (value) =>
  String(value?.productId || value?.itemId || value?.id || value?._id || "").split("::")[0];

const normalizePrice = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanDescription = (text) => {
  if (!text) return "No description is available for this product yet.";

  const value = String(text).trim();
  if (!value) return "No description is available for this product yet.";

  if (value.startsWith("{\\rtf") || value.includes("\\par")) {
    const cleaned = value
      .replace(/\{\\[^}]*\}/g, " ")
      .replace(/\\[a-z]+\d*\s?/gi, " ")
      .replace(/\\'/g, "'")
      .replace(/[{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned || "No description is available for this product yet.";
  }

  return value;
};

const normalizeProduct = (product = {}, fallback = {}) => {
  const source = { ...fallback, ...product };
  const imageCandidates = [
    source.mainImage,
    source.image,
    ...(Array.isArray(source.galleryImages) ? source.galleryImages : []),
  ]
    .map((image) => resolveQuickImageUrl(image) || image)
    .filter(Boolean);

  const images = [...new Set(imageCandidates)];
  const salePrice = normalizePrice(source.salePrice, 0);
  const basePrice = normalizePrice(source.price, salePrice);
  const price = salePrice > 0 ? salePrice : basePrice;
  const originalPrice = Math.max(
    price,
    normalizePrice(source.originalPrice ?? source.mrp ?? source.price, price),
  );
  const stock = normalizePrice(source.stock, 0);

  return {
    ...source,
    id: source.id || source._id,
    _id: source._id || source.id,
    name: source.name || "Product",
    category:
      source.category ||
      source.categoryName ||
      source.categoryId?.name ||
      "Quick Commerce",
    price,
    originalPrice,
    description: cleanDescription(source.description),
    images:
      images.length > 0
        ? images
        : ["https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop"],
    details: [
      {
        label: "Unit",
        value: source.weight || source.unit || "1 unit",
      },
      {
        label: "Stock",
        value: stock > 0 ? `${stock} available` : "Out of stock",
      },
      {
        label: "Brand",
        value: source.brand || "Quick Select",
      },
    ],
    storeName:
      source.storeName ||
      source.restaurantName ||
      source.seller?.name ||
      source.sellerId?.name ||
      source.store?.name ||
      source.storeId?.name ||
      "Fresh Mart",
    deliveryTime: source.deliveryTime || "8-12 mins",
  };
};

const ProductDetailPage = () => {
  const { productId, id } = useParams();
  const resolvedProductId = productId || id;
  const location = useLocation();
  const navigate = useNavigate();

  const initialProduct = useMemo(() => {
    const routeProduct = location.state?.product;
    return routeProduct ? normalizeProduct(routeProduct) : null;
  }, [location.state]);

  const [product, setProduct] = useState(initialProduct);
  const [activeImage, setActiveImage] = useState(initialProduct?.images?.[0] || "");
  const [loadingProduct, setLoadingProduct] = useState(!initialProduct);
  const [productError, setProductError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { toggleWishlist: toggleWishlistGlobal, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const quantity = useMemo(() => {
    if (!product) return 0;
    const cartItem = cart.find(
      (item) => getProductIdentifier(item) === getProductIdentifier(product),
    );
    return cartItem ? cartItem.quantity : 0;
  }, [cart, product]);

  const isWishlisted = product
    ? isInWishlist(product.id || product._id)
    : false;

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      if (!resolvedProductId) {
        setLoadingProduct(false);
        setProductError("Product id is missing from the route.");
        return;
      }

      setLoadingProduct(true);
      setProductError("");

      try {
        const response = await customerApi.getProductDetails(resolvedProductId);
        const result =
          response?.data?.result ||
          response?.data?.data ||
          response?.data?.product ||
          null;

        if (!result) {
          throw new Error("Product not found");
        }

        if (!cancelled) {
          const normalized = normalizeProduct(result, location.state?.product);
          setProduct(normalized);
          setActiveImage((currentImage) => currentImage || normalized.images[0]);
        }
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setProductError(
            error?.response?.data?.message || "Unable to load this product.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProduct(false);
        }
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [location.state, resolvedProductId]);

  useEffect(() => {
    if (product?.images?.length) {
      setActiveImage(product.images[0]);
    }
  }, [product]);

  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      if (!resolvedProductId) {
        setReviewLoading(false);
        return;
      }

      setReviewLoading(true);

      try {
        const response = await customerApi.getProductReviews(resolvedProductId);
        if (!cancelled) {
          setReviews(response?.data?.results || []);
        }
      } catch (error) {
        if (!cancelled) {
          setReviews([]);
        }
      } finally {
        if (!cancelled) {
          setReviewLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [resolvedProductId]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return "4.8";
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlistGlobal(product);
    showToast(
      isWishlisted
        ? `${product.name} removed from wishlist`
        : `${product.name} added to wishlist`,
      isWishlisted ? "info" : "success",
    );
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!resolvedProductId || !newReview.comment.trim()) return;

    try {
      setIsSubmittingReview(true);
      const response = await customerApi.submitReview({
        productId: resolvedProductId,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
      });

      if (response?.data?.success) {
        showToast("Review submitted for moderation", "success");
        setNewReview({ rating: 5, comment: "" });
      }
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Failed to submit review",
        "error",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 font-outfit">
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm">
          <Loader2 className="animate-spin text-green-600" size={18} />
          <span className="font-semibold text-slate-600">Loading product...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-4 text-center font-outfit">
        <h1 className="text-xl font-bold text-slate-800">Product not found</h1>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          {productError || "This product may have been removed or is no longer available."}
        </p>
        <Button
          onClick={() => navigate(-1)}
          className="mt-4 rounded-lg bg-green-600 px-5 py-2 text-xs font-semibold text-white hover:bg-green-700"
        >
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl animate-in px-4 py-6 font-outfit text-slate-850">
      <button
        onClick={() => navigate(-1)}
        className="group mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wider"
      >
        <ArrowLeft
          size={14}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Back
      </button>

      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        {/* Left Column - Product Images */}
        <div className="space-y-4 md:w-[45%]">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-white flex items-center justify-center">
            <img
              src={activeImage}
              alt={product.name}
              className="max-h-[85%] max-w-[85%] object-contain p-2"
            />
            <button
              onClick={handleToggleWishlist}
              className={cn(
                "absolute right-4 top-4 rounded-full p-2.5 shadow-sm border border-slate-50 transition-all active:scale-90",
                isWishlisted
                  ? "bg-red-50 text-red-500"
                  : "bg-white text-slate-400 hover:text-slate-600",
              )}
            >
              <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} className={cn(isWishlisted && "fill-current")} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {product.images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                onClick={() => setActiveImage(image)}
                className={cn(
                  "h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border transition-all",
                  activeImage === image
                    ? "border-green-600 scale-95"
                    : "border-slate-100 opacity-60 hover:opacity-100",
                )}
              >
                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="h-full w-full object-contain p-1"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-6 md:w-[55%] flex flex-col justify-between py-1">
          <div>
            <div className="mb-3.5 flex items-center gap-3">
              <span className="rounded-md bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">
                {product.category}
              </span>
              <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                <Star size={10} fill="currentColor" />
                {averageRating} ({reviews.length || "0"})
              </div>
            </div>

            <h1 className="mb-2 text-2xl font-extrabold text-slate-900 leading-snug">
              {product.name}
            </h1>

            <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[9px]">Sold by:</span>
              <span className="font-bold text-slate-600 hover:text-slate-800 transition-colors">
                {product.storeName}
              </span>
            </div>

            <div className="mb-4 flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-slate-900">
                {"\u20B9"}
                {product.price}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-sm font-semibold text-slate-400 line-through">
                    {"\u20B9"}
                    {product.originalPrice}
                  </span>
                  <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500 uppercase tracking-wide">
                    {Math.round(
                      ((product.originalPrice - product.price) /
                        product.originalPrice) *
                        100,
                    )}
                    % OFF
                  </span>
                </>
              )}
            </div>

            <p className="max-w-xl text-xs font-medium leading-relaxed text-slate-500">
              {product.description}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="w-full sm:w-48">
              {quantity > 0 ? (
                <div className="flex h-10 w-full items-center rounded-lg border border-green-600 bg-white px-1 text-green-600 font-semibold shadow-sm">
                  <button
                    onClick={() =>
                      quantity === 1
                        ? removeFromCart(product.id || product._id)
                        : updateQuantity(product.id || product._id, -1)
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-green-50 transition-colors active:scale-95"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="flex-1 text-center text-sm font-bold text-slate-800">{quantity}</span>
                  <button
                    disabled={quantity >= Number(product.stock ?? Infinity)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    onClick={() => {
                      const stock = Number(product.stock ?? Infinity);
                      if (quantity >= stock) {
                        showToast(`Only ${stock} in stock`, "error");
                        return;
                      }
                      updateQuantity(product.id || product._id, 1);
                    }}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <Button
                  onClick={async () => {
                    const stock = Number(product.stock ?? Infinity);
                    if (stock <= 0) {
                      showToast("This product is out of stock", "error");
                      return;
                    }
                    await addToCart(product);
                    showToast(`${product.name} added to cart`, "success");
                  }}
                  className="h-10 w-full rounded-lg border border-green-600 bg-white text-xs font-bold tracking-wider text-green-600 hover:bg-green-50/50 shadow-sm transition-all"
                >
                  ADD TO CART
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-0.5 text-left">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                <Clock size={12} />
                Delivered in {product.deliveryTime}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Freshness & Hygiene Guaranteed
              </span>
            </div>
          </div>

          {/* Product Info Table */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Product Info</h4>
            <div className="divide-y divide-slate-50 max-w-md">
              {product.details.map((detail) => (
                <div key={detail.label} className="flex justify-between py-1.5 text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">{detail.label}</span>
                  <span className="text-slate-700 font-bold">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16 border-t border-slate-100 pt-12">
        <div className="flex flex-col gap-10 lg:flex-row">
          <div className="lg:w-[40%]">
            <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6">
              <h3 className="mb-1 text-base font-bold text-slate-800">Write a Review</h3>
              <p className="mb-4 text-xs font-medium text-slate-400">
                Share your experience with this product
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Your Rating
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview((current) => ({ ...current, rating: star }))}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                          newReview.rating >= star
                            ? "bg-amber-50 text-amber-500"
                            : "bg-slate-50 text-slate-300 hover:text-slate-400",
                        )}
                      >
                        <Star
                          className={cn("h-5 w-5", newReview.rating >= star && "fill-current")}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Comment
                  </label>
                  <textarea
                    value={newReview.comment}
                    onChange={(event) =>
                      setNewReview((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))
                    }
                    placeholder="What did you like or dislike?"
                    className="min-h-[100px] w-full rounded-xl border border-slate-100 p-3 text-xs font-medium outline-none focus:border-green-600 transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="h-10 w-full rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  {isSubmittingReview ? "SUBMITTING..." : "SUBMIT REVIEW"}
                </Button>
                <p className="text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Reviews are moderated before publishing
                </p>
              </form>
            </div>
          </div>

          <div className="space-y-6 lg:w-[60%]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Customer Reviews</h3>
              <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 border border-green-100">
                <MessageSquare size={14} className="text-green-700" />
                <span>
                  {reviews.length} Verified
                </span>
              </div>
            </div>

            {reviewLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-green-600" size={24} />
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="rounded-2xl border border-slate-100 bg-white p-5"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs font-bold">
                          {(review.userId?.profileImage || review.userId?.image || review.userAvatar) ? (
                            <img
                              src={resolveQuickImageUrl(review.userId?.profileImage || review.userId?.image || review.userAvatar)}
                              alt={review.userId?.name || review.userName || "Reviewer"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (review.userId?.name || review.userName || "?")[0]
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            {review.userId?.name || review.userName || "Anonymous"}
                          </h4>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, index) => (
                              <Star
                                key={index}
                                size={10}
                                className={cn(
                                  index < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200",
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-slate-500">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  No reviews yet. Be the first!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
