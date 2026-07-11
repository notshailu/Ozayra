export const taxiAdminSidebarMenu = [
  {
    type: "link",
    label: "Dashboard",
    path: "/admin/taxi/dashboard",
    icon: "LayoutDashboard",
  },
  {
    type: "section",
    label: "OPERATIONS",
    items: [
      { icon: "MessageCircle", label: "Chat", path: "/admin/taxi/chat", type: "link" },
      {
        type: "expandable",
        label: "Promotions",
        icon: "Megaphone",
        subItems: [
          { label: "Promo Codes", path: "/admin/taxi/promotions/promo-codes" },
          { label: "Send Notification", path: "/admin/taxi/promotions/send-notification" },
          { label: "Banner Image", path: "/admin/taxi/promotions/banner-image" },
        ],
      },
      {
        type: "expandable",
        label: "Price Management",
        icon: "IndianRupee",
        subItems: [
          { label: "Service Location", path: "/admin/taxi/pricing/service-location" },
          { label: "Zone Setup", path: "/admin/taxi/pricing/zone" },
          { label: "Airport", path: "/admin/taxi/pricing/airport" },
          { label: "Explorer Destinations", path: "/admin/taxi/pricing/explorer-destinations" },
          { label: "Vehicle Type", path: "/admin/taxi/pricing/vehicle-type" },
          { label: "Weight Management", path: "/admin/taxi/pricing/weight-management" },
          { label: "Taxi Commission", path: "/admin/taxi/pricing/taxi-commission" },
          { label: "Parcel Commission", path: "/admin/taxi/pricing/parcel-commission" },
          { label: "Goods Types", path: "/admin/taxi/pricing/goods-types" },
        ],
      },
      {
        type: "expandable",
        label: "Geofencing",
        icon: "MapPin",
        subItems: [
          { label: "Heat Map", path: "/admin/taxi/geo/heatmap" },
          { label: "God's Eye", path: "/admin/taxi/geo/gods-eye" },
          { label: "Peak Zone", path: "/admin/taxi/geo/peak-zone" },
        ],
      },
      { icon: "Car", label: "Trip Requests", path: "/admin/taxi/trips", type: "link" },
      { icon: "Package", label: "Delivery Requests", path: "/admin/taxi/deliveries", type: "link" },
      { icon: "Clock", label: "Ongoing Requests", path: "/admin/taxi/ongoing", type: "link" },
    ],
  },
  {
    type: "section",
    label: "USER MANAGEMENT",
    items: [
      {
        type: "expandable",
        label: "Customers",
        icon: "Users",
        subItems: [
          { label: "User List", path: "/admin/taxi/users" },
          { label: "Delete Requests", path: "/admin/taxi/users/delete-requests" },
        ],
      },
      { icon: "Wallet", label: "Wallet Payment", path: "/admin/taxi/wallet/payment", type: "link" },
      {
        type: "expandable",
        label: "Drivers",
        icon: "Car",
        subItems: [
          { label: "Pending Drivers", path: "/admin/taxi/drivers/pending" },
          { label: "Approved Drivers", path: "/admin/taxi/drivers" },
          { label: "Subscription", path: "/admin/taxi/drivers/subscription" },
          { label: "Ratings", path: "/admin/taxi/drivers/ratings" },
          { label: "Withdrawal Requests", path: "/admin/taxi/drivers/wallet/withdrawals" },
          { label: "Negative Balances", path: "/admin/taxi/drivers/wallet/negative" },
          { label: "Needed Documents", path: "/admin/taxi/drivers/documents" },
          { label: "Bulk Upload", path: "/admin/taxi/drivers/bulk-upload" },
          { label: "Payment Methods", path: "/admin/taxi/drivers/payment-methods" },
        ],
      },
      {
        type: "expandable",
        label: "Referrals",
        icon: "Share2",
        subItems: [
          { label: "Dashboard", path: "/admin/taxi/referrals/dashboard" },
          { label: "User Settings", path: "/admin/taxi/referrals/user-settings" },
          { label: "Driver Settings", path: "/admin/taxi/referrals/driver-settings" },
          { label: "Translation", path: "/admin/taxi/referrals/translation" },
        ],
      },
      { type: "link", label: "Admins", path: "/admin/taxi/management/admins", icon: "UserCog" },
      {
        type: "expandable",
        label: "Reports",
        icon: "FileText",
        subItems: [
          { label: "User Report", path: "/admin/taxi/reports/user" },
          { label: "Driver Report", path: "/admin/taxi/reports/driver" },
          { label: "Driver Duty", path: "/admin/taxi/reports/driver-duty" },
          { label: "Finance Report", path: "/admin/taxi/reports/finance" },
        ],
      },
      {
        type: "expandable",
        label: "Support",
        icon: "ShieldCheck",
        subItems: [
          { label: "Ticket Titles", path: "/admin/taxi/support/ticket-title" },
          { label: "All Tickets", path: "/admin/taxi/support/tickets" },
        ],
      },
    ],
  },
  {
    type: "section",
    label: "SYSTEM",
    items: [
      { type: "link", label: "Languages", path: "/admin/taxi/masters/languages", icon: "Globe" },
      {
        type: "expandable",
        label: "Business Settings",
        icon: "Settings",
        subItems: [
          { label: "Customization", path: "/admin/taxi/settings/business/customization" },
          { label: "Transport Ride", path: "/admin/taxi/settings/business/transport-ride" },
          { label: "Bid Ride", path: "/admin/taxi/settings/business/bid-ride" },
        ],
      },
      {
        type: "expandable",
        label: "App Settings",
        icon: "Smartphone",
        subItems: [
          { label: "Wallet", path: "/admin/taxi/settings/app/wallet" },
          { label: "Tip Settings", path: "/admin/taxi/settings/app/tip" },
          { label: "Onboarding Screens", path: "/admin/taxi/settings/app/onboard" },
        ],
      },
      {
        type: "expandable",
        label: "CMS Landing",
        icon: "Monitor",
        subItems: [
          { label: "Header-Footer", path: "/admin/taxi/settings/cms/header-footer" },
          { label: "Home Page", path: "/admin/taxi/settings/cms/home" },
          { label: "About Us", path: "/admin/taxi/settings/cms/about" },
          { label: "Driver Page", path: "/admin/taxi/settings/cms/driver" },
          { label: "User Page", path: "/admin/taxi/settings/cms/user" },
          { label: "Contact", path: "/admin/taxi/settings/cms/contact" },
          { label: "Legal Policies", path: "/admin/taxi/settings/cms/legal" },
        ],
      },
    ],
  },
]
