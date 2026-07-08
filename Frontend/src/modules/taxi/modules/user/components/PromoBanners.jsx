import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, ShieldCheck } from 'lucide-react';

const rotatingCards = [
  {
    icon: Clock3,
    iconClass: 'text-orange-500',
    title: 'In a hurry?',
    description: 'Auto for shorter wait times.',
    actionClass: 'bg-orange-50 text-orange-500',
    path: '/taxi/user/ride/select-location',
    images: [
      { src: '/2_AutoRickshaw.png', alt: 'Auto' },
      { src: '/1_Bike.png', alt: 'Bike' },
    ],
  },
  {
    icon: ShieldCheck,
    iconClass: 'text-blue-600',
    title: 'Need more space?',
    description: 'Cab for luggage or comfort.',
    actionClass: 'bg-blue-50 text-blue-500',
    path: '/taxi/user/ride/select-location',
    images: [
      { src: '/4_Taxi.png', alt: 'Taxi' },
      { src: '/white_sedan_banner_car.webp', alt: 'Sedan' },
    ],
  },
];

const ImageCarousel = ({ images, className }) => {
  const activeImage = images?.[0];

  if (!activeImage) return null;

  return (
    <div className={className}>
      <img src={activeImage.src} alt={activeImage.alt} className="w-full object-contain drop-shadow-md" />
    </div>
  );
};

const PromoCard = ({ icon: Icon, iconClass, title, description, actionClass, path, images, onNavigate }) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    onClick={() => onNavigate(path)}
    className="relative flex flex-col min-h-[156px] overflow-hidden rounded-[24px] border border-gray-100 bg-white p-4.5 pt-4 pl-4 shadow-sm"
  >
    <div className={`flex items-center gap-2 ${iconClass}`}>
      <Icon size={15} strokeWidth={2.5} />
    </div>
    
    <div className="relative z-10 flex flex-1 flex-col mt-2.5">
      <div className="max-w-[105px]">
        <h3 className="text-[18px] font-bold leading-tight tracking-tight text-slate-700">{title}</h3>
        <p className="mt-1 text-[11px] font-medium leading-snug text-gray-500">{description}</p>
      </div>
      
      <div className="mt-auto pt-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${actionClass}`}>
          <ArrowRight size={16} strokeWidth={2.5} />
        </div>
      </div>
    </div>

    <ImageCarousel images={images} className="absolute bottom-2 -right-1 w-[85px] opacity-95 pointer-events-none z-20 drop-shadow-sm" />
  </motion.div>
);

const PromoBanners = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 space-y-4">
      <div className="mb-2 ml-1">
        <h2 className="text-[20px] font-bold text-slate-700 tracking-tight">Recommended for you</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {rotatingCards.map((card) => (
          <PromoCard key={card.title} {...card} onNavigate={navigate} />
        ))}
      </div>
    </div>
  );
};

export default PromoBanners;
