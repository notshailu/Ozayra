import { optimizeCloudinaryUrl } from "@/shared/utils/cloudinaryUtils";

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");

const FALLBACK_IMAGES = {
  fruits: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=200',
  vegetables: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=200',
  fruit: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=200',
  vegetable: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=200',
  dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=200',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200',
  egg: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?q=80&w=200',
  eggs: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?q=80&w=200',
  drink: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=200',
  drinks: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=200',
  juice: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=200',
  juices: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=200',
  beverage: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=200',
  beverages: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=200',
  snack: 'https://images.unsplash.com/photo-1621939514649-28b12e81658b?q=80&w=200',
  snacks: 'https://images.unsplash.com/photo-1621939514649-28b12e81658b?q=80&w=200',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200',
  biscuit: 'https://images.unsplash.com/photo-1558961309-dbdf71791a5a?q=80&w=200',
  biscuits: 'https://images.unsplash.com/photo-1558961309-dbdf71791a5a?q=80&w=200',
  instant: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200',
  frozen: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200',
  groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200',
  fresh: 'https://images.unsplash.com/photo-1540340061722-9293d5163008?q=80&w=200',
  home: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=200',
  personal: 'https://images.unsplash.com/photo-1556228578-8d84f5ae1d41?q=80&w=200',
  beauty: 'https://images.unsplash.com/photo-1556228578-8d84f5ae1d41?q=80&w=200',
  pet: 'https://images.unsplash.com/photo-1589924691195-41432c84c161?q=80&w=200',
  pets: 'https://images.unsplash.com/photo-1589924691195-41432c84c161?q=80&w=200',
  baby: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=200',
  kids: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=200',
};

const getFallbackByTitle = (title = "") => {
  const t = String(title).toLowerCase();
  for (const key of Object.keys(FALLBACK_IMAGES)) {
    if (t.includes(key)) {
      return FALLBACK_IMAGES[key];
    }
  }
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200';
};

export const resolveQuickImageUrl = (value, categoryName = "") => {
  const raw = String(value || "").trim();
  const isGrofers = raw.includes("grofers.com");

  if (!raw || raw === "null" || raw === "undefined" || isGrofers) {
    return getFallbackByTitle(categoryName);
  }

  const normalized = raw.replace(/\\/g, "/");
  let resolvedUrl = normalized;

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    resolvedUrl = normalized;
  } else if (normalized.startsWith("//")) {
    resolvedUrl = `https:${normalized}`;
  } else {
    const path = normalized.startsWith("/") ? normalized : `/${normalized}`;
    resolvedUrl = `${API_BASE_URL}${path}`;
  }

  // Optimize Cloudinary URLs to use webp/f_auto
  return optimizeCloudinaryUrl(resolvedUrl);
};
