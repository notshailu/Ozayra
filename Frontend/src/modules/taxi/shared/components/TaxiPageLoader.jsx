const TaxiPageLoader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
    <div className="w-56 h-56 flex items-center justify-center">
      <dotlottie-player
        src="/lets-ride.lottie"
        autoplay
        loop
        style={{ width: "100%", height: "100%" }}
      />
    </div>
    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 animate-pulse mt-2">
      Let's Ride
    </p>
  </div>
);

export default TaxiPageLoader;
