import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@shared/components/ui/Card";
import PageHeader from "@shared/components/ui/PageHeader";
import Badge from "@shared/components/ui/Badge";
import {
  DollarSign,
  Truck,
  Package,
  TrendingUp,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  Plus,
  Eye,
  Loader2,
} from "lucide-react";
import {
  HiOutlineTruck,
  HiOutlineXMark,
  HiOutlineMapPin,
  HiOutlinePhone,
  HiOutlineBanknotes,
  HiOutlineChevronDown,
} from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { sellerApi } from "../services/sellerApi";
import { toast } from "sonner";
import { useSellerOrders } from "../context/SellerOrdersContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    orders: ordersFromContext,
    ordersLoading,
    refreshOrders,
  } = useSellerOrders();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const statsRes = await sellerApi.getStats();
        if (cancelled) return;
        if (statsRes.data.success) setStatsData(statsRes.data.result);
      } catch (error) {
        if (!cancelled) {
          console.error("Dashboard Fetch Error:", error);
          toast.error("Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const safeOrders = Array.isArray(ordersFromContext) ? ordersFromContext : [];
  const loadingOrStats = loading || ordersLoading;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const revenueChartData = React.useMemo(() => {
    const raw = statsData?.salesTrend ?? statsData?.chartData ?? [];
    const arr = Array.isArray(raw) ? raw : [];
    if (arr.length > 0) {
      return arr.map((d) => ({
        name: d.name ?? d.date ?? "—",
        sales: Number(d.sales ?? d.revenue ?? d.total ?? 0) || 0,
      }));
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { name: dayNames[d.getDay()], sales: 0 };
    });
  }, [statsData?.salesTrend, statsData?.chartData]);
  const revenueMax = Math.max(1, ...revenueChartData.map((d) => d.sales));

  const stats = [
    {
      label: "Total Revenue",
      value: statsData?.overview?.totalSales || "₹0",
      change: "+12.5%",
      changeType: "increase",
      icon: DollarSign,
      iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/30",
      iconColor: "text-emerald-800",
      description: "vs last month",
    },
    {
      label: "Total Orders",
      value: statsData?.overview?.totalOrders || "0",
      change: "+8.2%",
      changeType: "increase",
      icon: ShoppingBag,
      iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/30",
      iconColor: "text-emerald-800",
      description: "vs last month",
    },
    {
      label: "Avg Order Value",
      value: statsData?.overview?.avgOrderValue || "₹0",
      change: "+2.4%",
      changeType: "increase",
      icon: Package,
      iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/30",
      iconColor: "text-emerald-800",
      description: "per order",
    },
    {
      label: "Pending Orders",
      value: safeOrders.filter((o) => o.status === "pending").length.toString(),
      change: "-3.1%",
      changeType: "decrease",
      icon: Clock,
      iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/30",
      iconColor: "text-emerald-800",
      description: "need attention",
    },
  ];

  const quickActions = [
    {
      title: "Add New Product",
      description: "List a new item in your store",
      icon: Plus,
      path: "/seller/products/add",
      variant: "primary",
    },
    {
      title: "Process Orders",
      description: "View and manage pending orders",
      icon: Truck,
      path: "/seller/orders",
      variant: "outline",
    },
    {
      title: "View Earnings",
      description: "Check your revenue and payouts",
      icon: DollarSign,
      path: "/seller/earnings",
      variant: "outline-emerald",
    },
  ];

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "pending":
        return "warning";
      case "processing":
      case "confirmed":
        return "info";
      case "packed":
        return "primary";
      case "shipped":
      case "out_for_delivery":
        return "secondary";
      case "delivered":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "secondary";
    }
  };

  const normalizeOrderForModal = (order) => {
    if (!order) return null;
    const addr = order.address;
    const addressStr = [
      addr?.line1,
      addr?.line2,
      addr?.city,
      addr?.state,
      addr?.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    const items = (order.items || []).map((item) => ({
      name: item.name || item.productName || "Item",
      price:
        item.price ??
        (item.quantity
          ? Number(item.totalPrice ?? 0) / Number(item.quantity)
          : 0),
      qty: item.quantity ?? 1,
      image: item.image || "",
    }));
    return {
      id: order.orderId,
      customer: {
        name: order.customer?.name || "Customer",
        phone: order.customer?.phone || "",
      },
      address: addressStr || "—",
      items,
      total: Number(order.pricing?.total ?? 0),
      status: order.status || "pending",
      payment:
        order.payment?.method === "cash" || order.payment?.method === "cod"
          ? "Cash on Delivery"
          : "Online Paid",
    };
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await sellerApi.updateOrderStatus(orderId, {
        status: newStatus.toLowerCase(),
      });
      toast.success(`Order status updated to ${newStatus}`);
      setSelectedOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, status: newStatus } : prev,
      );
      if (typeof refreshOrders === "function") refreshOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  if (loadingOrStats) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fcfcfc] font-semibold text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 mr-2" />
        Updating Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8 relative font-['Outfit'] pr-4">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's what's happening with your store today."
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] transition-all duration-300 flex items-start justify-between group"
          >
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-slate-900 mt-2.5">
                {stat.value}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-0.5",
                    stat.changeType === "increase"
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-red-700 bg-red-50",
                  )}
                >
                  <TrendingUp
                    className={cn(
                      "h-3 w-3",
                      stat.changeType === "decrease" && "rotate-180",
                    )}
                  />
                  {stat.change}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {stat.description}
                </span>
              </div>
            </div>
            <div className={cn("p-2.5 rounded-2xl transition-all duration-300 group-hover:scale-105", stat.iconBg)}>
              <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => {
          const isPrimary = action.variant === "primary";
          const isEmerald = action.variant === "outline-emerald";
          return (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className={cn(
                "p-6 rounded-3xl text-left transition-all duration-300 border shadow-[0_12px_40px_-16px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5",
                isPrimary
                  ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                  : isEmerald
                    ? "bg-white border-slate-100 text-slate-900 hover:border-emerald-500/50 hover:bg-emerald-50/20"
                    : "bg-white border-slate-100 text-slate-900 hover:border-emerald-500/50 hover:bg-emerald-50/20",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "p-2 rounded-2xl",
                    isPrimary
                      ? "bg-white/20"
                      : "bg-emerald-50 text-emerald-600",
                  )}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "font-black text-sm uppercase tracking-wide",
                      isPrimary ? "text-white" : "text-slate-900",
                    )}
                  >
                    {action.title}
                  </h3>
                  <p
                    className={cn(
                      "text-xs mt-1 font-medium",
                      isPrimary ? "text-white/70" : "text-slate-500",
                    )}
                  >
                    {action.description}
                  </p>
                </div>
                <ArrowUpRight
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                    isPrimary ? "text-white/70" : "text-slate-400",
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.03)] flex flex-col">
          <div>
            <h3 className="text-base font-black text-slate-950 uppercase tracking-wide">Revenue Overview</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Last 7 days performance</p>
          </div>
          <div className="h-[280px] min-h-[250px] w-full mt-6 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueChartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `₹${value}`}
                  domain={[0, revenueMax]}
                  allowDataOverflow
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid #f1f5f9",
                    borderRadius: "16px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                    fontSize: "12px",
                    fontFamily: "Outfit",
                    fontWeight: "bold",
                  }}
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                  labelFormatter={(label) => `Day: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Mix */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.03)] flex flex-col">
          <div>
            <h3 className="text-base font-black text-slate-950 uppercase tracking-wide">Top Categories</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Sales by category</p>
          </div>
          <div className="h-[280px] min-h-[250px] w-full mt-6 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData?.categoryMix || []} layout="vertical" margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  type="category"
                  dataKey="subject"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid #f1f5f9",
                    borderRadius: "16px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                  }}
                />
                <Bar dataKey="A" fill="#10b981" radius={[0, 8, 8, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_12px_40px_-16px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-950 uppercase tracking-wide">Recent Orders</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Latest transactions from your store</p>
          </div>
          <button
            onClick={() => navigate("/seller/orders")}
            className="text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/40">
                <th className="text-left py-3.5 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="text-left py-3.5 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left py-3.5 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-3.5 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left py-3.5 px-6 text-xs font-black text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-3.5 px-6 text-xs font-black text-slate-400 uppercase tracking-wider w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {safeOrders.slice(0, 5).map((order) => (
                <tr key={order.orderId} className="hover:bg-slate-50/30 transition-colors duration-200">
                  <td className="py-4 px-6 align-middle">
                    <span className="text-sm font-bold text-slate-900">
                      #{order.orderId}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {order.customer?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "C"}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {order.customer?.name || "Customer"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <span className="text-sm font-medium text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <span className="text-sm font-black text-slate-900">
                      ₹{order.pricing?.total || 0}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle">
                    <Badge variant={getStatusColor(order.status)} className="capitalize font-bold text-[10px] tracking-wider py-0.5 px-2.5 rounded-lg shadow-sm">
                      {order.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-center align-middle">
                    <button
                      onClick={() => {
                        setSelectedOrder(normalizeOrderForModal(order));
                        setIsOrderModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-100 rounded-xl inline-flex items-center justify-center"
                    >
                      <Eye className="h-4.5 w-4.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {isOrderModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center p-3 sm:p-6 lg:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setIsOrderModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg sm:max-w-2xl relative z-10 bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <HiOutlineTruck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Order Details
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant={getStatusColor(selectedOrder.status)}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
                        {selectedOrder.status}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        #{selectedOrder.id}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOrderModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-800"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-6 overflow-y-auto scrollbar-hide flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <HiOutlineMapPin className="h-4 w-4 text-emerald-500" />{" "}
                        Delivery Address
                      </h4>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100/50 shadow-sm">
                        {selectedOrder.address}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <HiOutlinePhone className="h-4 w-4 text-emerald-500" />{" "}
                        Contact Info
                      </h4>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 shadow-sm">
                        <p className="text-xs font-bold text-slate-800">
                          {selectedOrder.customer.name}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-1">
                          {selectedOrder.customer.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/30">
                      <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3">
                        Order Summary
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-500">
                            Subtotal
                          </span>
                          <span className="font-bold text-slate-800">
                            ₹{(selectedOrder.total - 10).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-500">
                            Delivery Fee
                          </span>
                          <span className="font-bold text-emerald-600">
                            ₹10.00
                          </span>
                        </div>
                        <div className="h-px bg-emerald-100/30 my-2" />
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            Total
                          </span>
                          <span className="font-black text-emerald-600">
                            ₹{selectedOrder.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl shadow-slate-950/10">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Payment Status
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <HiOutlineBanknotes className="h-5 w-5 text-emerald-400" />
                        <span className="text-xs font-bold tracking-tight">
                          {selectedOrder.payment}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Items Ordered ({selectedOrder.items.length})
                </h4>
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white ring-1 ring-slate-100 rounded-2xl group hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-bold">
                              —
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-1">
                            ₹{Number(item.price).toFixed(2)} × {item.qty}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">
                          ₹{(item.price * item.qty).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center justify-end">
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setIsOrderModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all duration-200"
                  >
                    Close
                  </button>
                  <div className="relative inline-block w-44">
                    <select
                      value={selectedOrder.status.toLowerCase()}
                      onChange={(e) =>
                        handleStatusUpdate(selectedOrder.id, e.target.value)
                      }
                      disabled={[
                        "confirmed",
                        "packed",
                        "out_for_delivery",
                        "delivered",
                      ].includes(selectedOrder.status.toLowerCase())}
                      className={cn(
                        "w-full text-[10px] pl-3 pr-8 py-2.5 rounded-xl font-black uppercase tracking-wider border appearance-none transition-all outline-none shadow-sm",
                        [
                          "confirmed",
                          "packed",
                          "out_for_delivery",
                          "delivered",
                        ].includes(selectedOrder.status.toLowerCase())
                          ? "cursor-not-allowed opacity-75"
                          : "cursor-pointer focus:ring-2 focus:ring-offset-1",
                        getStatusColor(selectedOrder.status) === "warning"
                          ? "bg-amber-100 text-amber-700 focus:ring-amber-200"
                          : getStatusColor(selectedOrder.status) === "info"
                            ? "bg-blue-100 text-blue-700 focus:ring-blue-200"
                            : getStatusColor(selectedOrder.status) === "primary"
                              ? "bg-indigo-100 text-indigo-700 focus:ring-indigo-200"
                              : getStatusColor(selectedOrder.status) ===
                                  "secondary"
                                ? "bg-purple-100 text-purple-700 focus:ring-purple-200"
                                : getStatusColor(selectedOrder.status) ===
                                    "success"
                                  ? "bg-emerald-100 text-emerald-700 focus:ring-emerald-200"
                                  : getStatusColor(selectedOrder.status) ===
                                      "error"
                                    ? "bg-rose-100 text-rose-700 focus:ring-rose-200"
                                    : "bg-slate-100 text-slate-700 focus:ring-slate-200",
                      )}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-65" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
