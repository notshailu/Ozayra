import React, { useState, useEffect } from 'react';
import {
  Users,
  Car,
  CheckCircle2,
  Clock,
  Wallet,
  IndianRupee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  History,
  CircleAlert,
  ChevronRight,
  Zap,
  ShieldCheck,
  CreditCard,
  UserCheck,
  UserPlus,
  BarChart3,
  Activity,
  XCircle,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { BACKEND_LABEL } from '../../../../shared/api/runtimeConfig';

/* ─── Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ label, value, delta, icon: Icon, accent, isLoading }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
    {isLoading ? (
      <div className="animate-pulse space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-7 bg-gray-100 rounded w-1/3" />
      </div>
    ) : (
      <>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest leading-none">{label}</p>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <Icon size={15} strokeWidth={2.2} />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-gray-900 leading-none tracking-tight">{value}</span>
          {delta !== undefined && (
            <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
      </>
    )}
  </div>
);

/* ─── Donut Chart ────────────────────────────────────────────── */
const Donut = ({ segments, total }) => {
  let offset = 0;
  const r = 15.9155;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
        {segments.map((s, i) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          const dash = (pct / 100) * circ;
          const gap = circ - dash;
          const seg = (
            <circle
              key={i}
              cx="18" cy="18" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="3.5"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ / 100}
              strokeLinecap="round"
            />
          );
          offset += pct;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Total</span>
        <span className="text-2xl font-bold text-gray-900 leading-tight">{total}</span>
      </div>
    </div>
  );
};

/* ─── Mini Earnings Card ─────────────────────────────────────── */
const EarningRow = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}>
        <Icon size={13} strokeWidth={2.2} />
      </div>
      <span className="text-[12px] font-medium text-gray-500">{label}</span>
    </div>
    <span className="text-[13px] font-semibold text-gray-900">₹ {value}</span>
  </div>
);

/* ─── Section Header ─────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">{children}</h2>
);

/* ─── Cancellation Pill ──────────────────────────────────────── */
const CancelPill = ({ label, value, color }) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[12px] font-medium text-gray-600">{label}</span>
    </div>
    <span className="text-[14px] font-bold text-gray-900">{value}</span>
  </div>
);

/* ─── Main Dashboard ─────────────────────────────────────────── */
const MainDashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_drivers: 0,
    approved_drivers: 0,
    pending_drivers: 0,
    todayTrips: { completed: 0, cancelled: 0, scheduled: 0 },
    overallTrips: { completed: 0, cancelled: 0, scheduled: 0 },
    todayEarnings: { total: 0, by_cash: 0, by_wallet: 0, by_card: 0, admin_commission: 0, driver_earnings: 0 },
    overallEarnings: { total: 0, by_cash: 0, by_wallet: 0, by_card: 0, admin_commission: 0, driver_earnings: 0 },
    cancelChart: { total: 0, byUser: 0, byDriver: 0, noDriver: 0, byDispatch: 0 },
    isLoading: true,
  });
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashboardData = await adminService.getDashboardData();
        const data = dashboardData?.data || dashboardData;
        setDashboardError('');
        setStats({
          total_users: data?.totalUsers || 0,
          total_drivers: data?.totalDrivers?.total || 0,
          approved_drivers: data?.totalDrivers?.approved || 0,
          pending_drivers: data?.totalDrivers?.declined || 0,
          todayTrips: data?.todayTrips || { completed: 0, cancelled: 0, scheduled: 0 },
          overallTrips: data?.overallTrips || { completed: 0, cancelled: 0, scheduled: 0 },
          todayEarnings: data?.todayEarnings || { total: 0, by_cash: 0, by_wallet: 0, by_card: 0, admin_commission: 0, driver_earnings: 0 },
          overallEarnings: data?.overallEarnings || { total: 0, by_cash: 0, by_wallet: 0, by_card: 0, admin_commission: 0, driver_earnings: 0 },
          cancelChart: data?.cancelChart || { total: 0, byUser: 0, byDriver: 0, noDriver: 0, byDispatch: 0 },
          isLoading: false,
        });
      } catch (err) {
        setDashboardError(`Dashboard data unavailable. Start the backend on ${BACKEND_LABEL} to load live metrics.`);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    fetchDashboardData();
  }, []);

  const { isLoading } = stats;


  const todaySegments = [
    { label: 'Completed', value: stats.todayTrips.completed, color: '#6366f1' },
    { label: 'Cancelled', value: stats.todayTrips.cancelled, color: '#f43f5e' },
    { label: 'Scheduled', value: stats.todayTrips.scheduled, color: '#3b82f6' },
  ];
  const overallSegments = [
    { label: 'Completed', value: stats.overallTrips.completed, color: '#10b981' },
    { label: 'Cancelled', value: stats.overallTrips.cancelled, color: '#f43f5e' },
    { label: 'Scheduled', value: stats.overallTrips.scheduled, color: '#f59e0b' },
  ];
  const todayTotal = todaySegments.reduce((a, b) => a + b.value, 0);
  const overallTotal = overallSegments.reduce((a, b) => a + b.value, 0);
  const fmt = (v) => Number(v || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans text-gray-900 -m-8 p-8">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 leading-none tracking-tight">Dashboard</h1>
          <p className="text-[12px] text-gray-400 mt-1">Welcome back, Super Admin</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-semibold">Overview</span>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {dashboardError && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <CircleAlert size={16} className="text-amber-500 shrink-0" />
          <p className="text-[12px] font-medium text-amber-700">{dashboardError}</p>
        </div>
      )}

      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Drivers Registered" value={stats.total_drivers} delta={100} icon={UserPlus} accent="#6366f1" isLoading={isLoading} />
        <StatCard label="Approved Drivers"   value={stats.approved_drivers} delta={100} icon={ShieldCheck} accent="#10b981" isLoading={isLoading} />
        <StatCard label="Waiting Approval"   value={stats.pending_drivers} delta={-4}  icon={Clock}       accent="#f59e0b" isLoading={isLoading} />
        <StatCard label="Users Registered"   value={stats.total_users}    delta={100} icon={Users}       accent="#3b82f6" isLoading={isLoading} />
      </div>

      {/* ── SOS Alerts ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        <SectionTitle>SOS Alerts</SectionTitle>
        <div className="flex flex-col items-center py-8 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
            <ShieldCheck size={22} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-semibold text-gray-900">All Clear</p>
          <p className="text-[11px] text-gray-400">No active SOS alerts at this time</p>
        </div>
      </div>

      {/* ── Today Trips + Today Earnings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Today Trips */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Today's Trips</SectionTitle>
          <div className="flex items-center gap-8">
            <Donut segments={todaySegments} total={todayTotal} />
            <div className="flex-1 space-y-3">
              {todaySegments.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[12px] font-medium text-gray-500">{s.label}</span>
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today Earnings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Today's Earnings</SectionTitle>
          <EarningRow label="Total Earnings"    value={fmt(stats.todayEarnings.total)}            icon={IndianRupee} color="#6366f1" />
          <EarningRow label="By Cash"           value={fmt(stats.todayEarnings.by_cash)}           icon={Wallet}      color="#10b981" />
          <EarningRow label="By Wallet"         value={fmt(stats.todayEarnings.by_wallet)}         icon={Wallet}      color="#f59e0b" />
          <EarningRow label="By Card / Online"  value={fmt(stats.todayEarnings.by_card)}           icon={CreditCard}  color="#3b82f6" />
          <EarningRow label="Admin Commission"  value={fmt(stats.todayEarnings.admin_commission)}  icon={ShieldCheck} color="#8b5cf6" />
          <EarningRow label="Driver Earnings"   value={fmt(stats.todayEarnings.driver_earnings)}   icon={UserCheck}   color="#10b981" />
        </div>
      </div>

      {/* ── Overall Trips + Overall Earnings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Overall Trips */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Overall Trips</SectionTitle>
          <div className="flex items-center gap-8">
            <Donut segments={overallSegments} total={overallTotal} />
            <div className="flex-1 space-y-3">
              {overallSegments.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[12px] font-medium text-gray-500">{s.label}</span>
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Earnings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Overall Earnings</SectionTitle>
          <EarningRow label="Total Earnings"    value={fmt(stats.overallEarnings.total)}            icon={IndianRupee} color="#f43f5e" />
          <EarningRow label="By Cash"           value={fmt(stats.overallEarnings.by_cash)}           icon={Wallet}      color="#f59e0b" />
          <EarningRow label="By Wallet"         value={fmt(stats.overallEarnings.by_wallet)}         icon={Wallet}      color="#10b981" />
          <EarningRow label="By Card / Online"  value={fmt(stats.overallEarnings.by_card)}           icon={CreditCard}  color="#3b82f6" />
          <EarningRow label="Admin Commission"  value={fmt(stats.overallEarnings.admin_commission)}  icon={ShieldCheck} color="#8b5cf6" />
          <EarningRow label="Driver Earnings"   value={fmt(stats.overallEarnings.driver_earnings)}   icon={UserCheck}   color="#10b981" />
        </div>
      </div>

      {/* ── Cancellations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Cancellation Chart</SectionTitle>
          <div className="flex items-end gap-2 h-36 mb-4">
            {[
              { val: stats.cancelChart.noDriver,  color: '#3f51b5', label: 'No Drivers' },
              { val: stats.cancelChart.byUser,    color: '#ffb300', label: 'By Users'   },
              { val: stats.cancelChart.byDriver,  color: '#009688', label: 'By Drivers' },
              { val: stats.cancelChart.byDispatch,color: '#f43f5e', label: 'Dispatch'   },
            ].map(({ val, color, label }, i) => {
              const maxVal = Math.max(stats.cancelChart.noDriver, stats.cancelChart.byUser, stats.cancelChart.byDriver, stats.cancelChart.byDispatch, 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-gray-50 rounded-lg flex items-end" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-lg transition-all duration-700"
                      style={{
                        height: `${Math.max((val / maxVal) * 100, val > 0 ? 8 : 2)}%`,
                        minHeight: '3px',
                        backgroundColor: color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {[
              { label: 'No Drivers', color: '#3f51b5' },
              { label: 'By Users', color: '#ffb300' },
              { label: 'By Drivers', color: '#009688' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-medium text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Cancellation Summary</SectionTitle>
          <div className="space-y-3">
            <CancelPill label="Total Cancelled"      value={stats.cancelChart.total}      color="#6366f1" />
            <CancelPill label="Cancelled by Users"   value={stats.cancelChart.byUser}     color="#f59e0b" />
            <CancelPill label="Cancelled by Drivers" value={stats.cancelChart.byDriver}   color="#3b82f6" />
            <CancelPill label="Dispatcher Cancelled" value={stats.cancelChart.byDispatch} color="#10b981" />
          </div>
        </div>
      </div>

    </div>
  );
};

export default MainDashboard;
