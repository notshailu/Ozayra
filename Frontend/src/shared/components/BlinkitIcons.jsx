import React from "react";

export const AllIcon = ({ sx, ...props }) => {
  const color = sx?.color || "currentColor";
  const size = sx?.fontSize?.xs || sx?.fontSize || 24;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props} style={{ minWidth: size, minHeight: size, ...props.style }}>
      {/* Items sticking out (yellow) */}
      <path d="M8 12V6.5C8 5.7 8.6 5 9.4 5C10.2 5 10.8 5.7 10.8 6.5V12" fill="#FFD147" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M13 12V5.5C13 4.7 13.6 4 14.4 4C15.2 4 15.8 4.7 15.8 5.5V12" fill="#FFD147" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
      {/* Basket body (filled) */}
      <path d="M3.5 11.5C3.5 10.7 4.2 10 5 10H19C19.8 10 20.5 10.7 20.5 11.5V16C20.5 18.2 18.7 20 16.5 20H7.5C5.3 20 3.5 18.2 3.5 16V11.5Z" fill={color} />
    </svg>
  );
};

export const MonsoonIcon = ({ sx, ...props }) => {
  const color = sx?.color || "currentColor";
  const size = sx?.fontSize?.xs || sx?.fontSize || 24;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props} style={{ minWidth: size, minHeight: size, ...props.style }}>
      {/* Umbrella canopy */}
      <path d="M4 11C4 6.58 7.58 3 12 3C16.42 3 20 6.58 20 11A2.66 2.66 0 0 1 17.33 10A2.66 2.66 0 0 1 14.66 11A2.66 2.66 0 0 1 12 10A2.66 2.66 0 0 1 9.33 11A2.66 2.66 0 0 1 6.66 10A2.66 2.66 0 0 1 4 11Z" />
      {/* Umbrella handle */}
      <path d="M12 11V18.5C12 19.3 11.3 20 10.5 20C9.7 20 9 19.3 9 18.5" />
      {/* Rain Drops & Sparkles */}
      <path d="M7 15L6.5 16.5" />
      <path d="M16.5 16L16 17.5" />
      <path d="M19 12L18.5 13.5" />
      <path d="M14 14.5L13.5 16" />
      <path d="M5 8L4 8.5" strokeWidth="1.5" />
      <path d="M20 9L21 9.5" strokeWidth="1.5" />
    </svg>
  );
};

export const ElectronicsIcon = ({ sx, ...props }) => {
  const color = sx?.color || "currentColor";
  const size = sx?.fontSize?.xs || sx?.fontSize || 24;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props} style={{ minWidth: size, minHeight: size, ...props.style }}>
      {/* Headband */}
      <path d="M5 13V11C5 7.1 8.1 4 12 4C15.9 4 19 7.1 19 11V13" strokeWidth="1.5" />
      {/* Left Earcup */}
      <rect x="4.5" y="12.5" width="4" height="7.5" rx="2" strokeWidth="1.5" />
      <path d="M8.5 14V18" strokeWidth="1.5" />
      {/* Right Earcup */}
      <rect x="15.5" y="12.5" width="4" height="7.5" rx="2" strokeWidth="1.5" />
      <path d="M15.5 14V18" strokeWidth="1.5" />
    </svg>
  );
};

export const BeautyIcon = ({ sx, ...props }) => {
  const color = sx?.color || "currentColor";
  const size = sx?.fontSize?.xs || sx?.fontSize || 24;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props} style={{ minWidth: size, minHeight: size, ...props.style }}>
      {/* Lipstick Base */}
      <rect x="5.5" y="13.5" width="5.5" height="7.5" rx="0.5" />
      {/* Lipstick Tube */}
      <rect x="6" y="10.5" width="4.5" height="3" />
      {/* Lipstick Color */}
      <path d="M6.5 10.5V7C6.5 6.5 7 5.5 8.25 5.5C9.5 5.5 10 6.5 10 7V10.5" />
      
      {/* Brush Handle */}
      <rect x="13.5" y="11.5" width="4.5" height="9.5" rx="0.5" />
      {/* Brush Metal Ring */}
      <rect x="14" y="8.5" width="3.5" height="3" />
      {/* Brush Bristles */}
      <path d="M14 8.5V5.5C14 4 15 3 15.75 3C16.5 3 17.5 4 17.5 5.5V8.5" />
    </svg>
  );
};

export const DecorIcon = ({ sx, ...props }) => {
  const color = sx?.color || "currentColor";
  const size = sx?.fontSize?.xs || sx?.fontSize || 24;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props} style={{ minWidth: size, minHeight: size, ...props.style }}>
      {/* Lampshade */}
      <path d="M8 5H16L18 13H6L8 5Z" strokeWidth="1.5" />
      <path d="M7 9H17" strokeWidth="1" strokeDasharray="1 3" />
      {/* Stand */}
      <path d="M12 13V21" strokeWidth="1.5" />
      {/* Base */}
      <path d="M8.5 21H15.5" strokeWidth="1.5" />
      {/* Pull chain */}
      <path d="M15 13V15.5" />
      <circle cx="15" cy="16" r="0.8" fill={color} stroke="none" />
    </svg>
  );
};

export const GroceryIcon = ({ sx, ...props }) => {
  const color = sx?.color || "currentColor";
  const size = sx?.fontSize?.xs || sx?.fontSize || 24;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...props} style={{ minWidth: size, minHeight: size, ...props.style }}>
      {/* Basket */}
      <path d="M3.5 8H20.5L18.5 19C18.4 20.1 17.5 21 16.4 21H7.6C6.5 21 5.6 20.1 5.5 19L3.5 8Z" />
      {/* Handles */}
      <path d="M7.5 8V5.5C7.5 4.1 8.6 3 10 3H14C15.4 3 16.5 4.1 16.5 5.5V8" />
    </svg>
  );
};
