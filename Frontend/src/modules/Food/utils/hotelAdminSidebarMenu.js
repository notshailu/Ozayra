export const hotelAdminSidebarMenu = [
  {
    type: "link",
    label: "Dashboard",
    path: "/admin/hotel/dashboard",
    icon: "LayoutDashboard",
  },
  {
    type: "section",
    label: "HOTEL MANAGEMENT",
    items: [
      { type: "link", label: "User Management", path: "/admin/hotel/users", icon: "Users" },
      { type: "link", label: "Partner Management", path: "/admin/hotel/partners", icon: "Building2" },
      { type: "link", label: "Property Management", path: "/admin/hotel/properties", icon: "Home" },
      { type: "link", label: "Bookings", path: "/admin/hotel/bookings", icon: "Calendar" },
      { type: "link", label: "Notifications", path: "/admin/hotel/notifications", icon: "Bell" },
      { type: "link", label: "Finance & Payouts", path: "/admin/hotel/finance", icon: "Wallet" },
      { type: "link", label: "Offers & Coupons", path: "/admin/hotel/offers", icon: "Tag" },
      { type: "link", label: "Legal & Content", path: "/admin/hotel/legal", icon: "FileText" },
      { type: "link", label: "Contact Messages", path: "/admin/hotel/contact-messages", icon: "MessageSquare" },
      { type: "link", label: "FAQs", path: "/admin/hotel/faqs", icon: "CircleHelp" },
      { type: "link", label: "Settings", path: "/admin/hotel/settings", icon: "Settings" },
    ],
  },
]
