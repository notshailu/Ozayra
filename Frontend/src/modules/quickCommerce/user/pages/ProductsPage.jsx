import React, { useState, useEffect } from 'react';
import ProductCard from '../components/shared/ProductCard';
import { customerApi } from '../services/customerApi';
import { useLocation } from '../context/LocationContext';

const ProductsPage = () => {
    const { currentLocation } = useLocation();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const hasValidLocation =
                    Number.isFinite(currentLocation?.latitude) &&
                    Number.isFinite(currentLocation?.longitude);

                const params = { limit: 100 };
                if (hasValidLocation) {
                    params.lat = currentLocation.latitude;
                    params.lng = currentLocation.longitude;
                }

                const res = await customerApi.getProducts(params);
                if (res.data.success) {
                    const rawResult = res.data.result;
                    const dbProds = Array.isArray(res.data.results)
                        ? res.data.results
                        : Array.isArray(rawResult?.items)
                            ? rawResult.items
                            : Array.isArray(rawResult)
                                ? rawResult
                                : [];

                    const formatted = dbProds.map(p => ({
                        ...p,
                        id: p._id,
                        image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2",
                        price: p.salePrice || p.price,
                        originalPrice: p.price,
                        weight: p.weight || "1 unit",
                        deliveryTime: "8-15 mins"
                    }));
                    setProducts(formatted);
                }
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [currentLocation]);

    return (
        <div className="relative z-10 py-8 w-full max-w-[1920px] mx-auto px-4 md:px-[50px] animate-in fade-in slide-in-from-bottom-4 duration-700 mt-36 md:mt-24">
            <div className="mb-8 text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0c831f] mb-1">All Products</h1>
                <p className="text-gray-500 text-sm md:text-lg font-medium">
                    {isLoading
                        ? "Loading fresh and organic items..."
                        : `Showing ${products.length} fresh and organic items`}
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {Array.from({ length: 12 }).map((_, idx) => (
                        <div key={idx} className="flex flex-col gap-3 p-4 bg-white dark:bg-card rounded-[20px] border border-slate-100 dark:border-white/5 animate-pulse">
                            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl w-full animate-pulse" />
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 animate-pulse" />
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2 animate-pulse" />
                            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-full mt-2 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <p className="text-gray-400 font-bold italic text-lg">No products found</p>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
