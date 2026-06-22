import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ActionCard = ({ title, description, image, surfaceClass, titleClass, buttonClass, buttonText, path, imageClass }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`group relative flex min-h-[186px] flex-1 flex-col overflow-hidden rounded-[28px] p-4.5 pt-5 pl-5 transition-transform duration-200 hover:-translate-y-0.5 focus-within:-translate-y-0.5 ${surfaceClass}`}
    >
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="max-w-[120px]">
          <h3 className={`text-[21px] font-bold leading-none tracking-tight ${titleClass}`}>{title}</h3>
          <p className="mt-2 text-[12px] font-medium leading-[1.3] text-gray-500">{description}</p>
        </div>

        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(path);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white transition-all active:scale-95 ${buttonClass}`}
          >
            {buttonText}
            <ArrowRight size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className={`pointer-events-none absolute z-20 transition-transform duration-300 group-hover:scale-[1.05] ${imageClass}`}>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="w-full h-auto object-contain drop-shadow-md"
        />
      </div>
    </div>
  );
};

const ActionsSection = () => {
  return (
    <div className="px-5">
      <div className="mb-4 ml-1">
        <h2 className="text-[20px] font-bold text-slate-700 tracking-tight">What do you need today?</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ActionCard
          title="Ride"
          description="Bike, auto, and cab rides."
          image="/1_Bike.png"
          surfaceClass="bg-gradient-to-b from-[#FFFDF9] to-[#FDF4E8] border border-[#FBEAD4]"
          titleClass="text-slate-700"
          buttonClass="bg-[#F6C6A1] hover:bg-[#F3B78A]"
          buttonText="Book Now"
          path="/taxi/user/ride/select-location"
          imageClass="bottom-11 -right-2 w-[85px]"
        />

        <ActionCard
          title="Delivery"
          description="Send parcels across the city."
          image="/5_Parcel.png"
          surfaceClass="bg-gradient-to-b from-[#FDFDFF] to-[#F2F4FD] border border-[#E9EDFD]"
          titleClass="text-slate-700"
          buttonClass="bg-[#C3C4FD] hover:bg-[#B3B4F9]"
          buttonText="Send Now"
          path="/taxi/user/parcel/type"
          imageClass="bottom-12 -right-1 w-[75px]"
        />
      </div>
    </div>
  );
};

export default ActionsSection;
