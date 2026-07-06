import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Eye, FileSearch, Search, X, CheckCircle2, XCircle, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BASE = () => `${globalThis.__LEGACY_BACKEND_ORIGIN__}/api/v1/admin/wallet/drivers/withdrawals`;

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const WithdrawalRequestDrivers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  
  // Pending Requests State
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  // History Requests State
  const [historyRows, setHistoryRows] = useState([]);
  const [historyPaginator, setHistoryPaginator] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('history');

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchPendingRows = async () => {
    setPendingLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${BASE()}?status=pending&limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingRows(data.data?.results || []);
      }
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchHistoryRows = async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm, nextStatus = historyStatusFilter } = {}) => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
        status: nextStatus,
      });
      if (String(nextSearch || '').trim()) {
        params.set('search', String(nextSearch).trim());
      }
      const res = await fetch(`${BASE()}?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryRows(data.data?.results || []);
        setHistoryPaginator(data.data?.paginator || null);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${globalThis.__LEGACY_BACKEND_ORIGIN__}/api/v1/admin/wallet/withdrawals/${reqId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedRequest(null);
        fetchPendingRows();
        fetchHistoryRows();
      } else {
        alert(data.message || 'Failed to update withdrawal status');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating status.');
    }
  };

  useEffect(() => {
    fetchPendingRows();
  }, []);

  useEffect(() => {
    fetchHistoryRows({ nextPage: 1, nextLimit: itemsPerPage, nextSearch: searchTerm, nextStatus: historyStatusFilter });
    setPage(1);
  }, [itemsPerPage, historyStatusFilter]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchHistoryRows({ nextPage: 1, nextLimit: itemsPerPage, nextSearch: searchTerm, nextStatus: historyStatusFilter });
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    fetchHistoryRows({ nextPage: page, nextLimit: itemsPerPage, nextSearch: searchTerm, nextStatus: historyStatusFilter });
  }, [page]);



  const totalPages = useMemo(() => Math.max(1, Number(historyPaginator?.last_page || 1)), [historyPaginator]);
  const safePage = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages]);
  const totalEntries = useMemo(() => Number(historyPaginator?.total || 0), [historyPaginator]);
  const perPage = useMemo(() => Number(historyPaginator?.per_page || itemsPerPage), [historyPaginator, itemsPerPage]);
  const startIndex = useMemo(() => (safePage - 1) * perPage, [safePage, perPage]);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(startIndex + historyRows.length, totalEntries);

  const meta = selectedRequest?.metadata || {};
  const method = selectedRequest?.metadata?.paymentMethod || (selectedRequest?.payment_method?.includes('UPI') ? 'UPI' : 'Bank Transfer');

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 font-sans text-slate-800 space-y-10 antialiased">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Driver Wallet</span>
          <ChevronRight size={10} className="text-slate-300" />
          <span className="text-slate-500">Withdrawals</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Withdrawal Requests</h1>
      </div>

      {/* SECTION 1: ACTIVE / PENDING REQUESTS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">New Requests</h2>
            <p className="text-xs text-slate-400 mt-0.5">Awaiting verification and payout</p>
          </div>
          {pendingRows.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              {pendingRows.length} Action needed
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Driver</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Loading requests...</td>
                </tr>
              ) : pendingRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400 py-3">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <p className="text-sm">No pending requests to process</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingRows.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4.5 text-sm text-slate-500">{formatDateTime(item.last_request_at)}</td>
                    <td className="px-6 py-4.5 text-sm font-semibold text-slate-900">{item.driver?.name || 'Unknown'}</td>
                    <td className="px-6 py-4.5 text-sm text-slate-500">{item.driver?.mobile || '-'}</td>
                    <td className="px-6 py-4.5 text-sm font-bold text-slate-900">₹{Number(item.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4.5 text-sm">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <FileSearch size={13} />
                        Process
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Payout History</h2>
            <p className="text-xs text-slate-400 mt-0.5">Logs of all previous payouts</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
            {[
              { id: 'history', label: 'All History' },
              { id: 'completed', label: 'Approved' },
              { id: 'rejected', label: 'Declined' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setHistoryStatusFilter(st.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  historyStatusFilter === st.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value) || 10)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full border border-slate-200 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-slate-800 bg-white outline-none focus:border-slate-400 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Driver</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Loading history...</td>
                </tr>
              ) : historyRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No historical records found</td>
                </tr>
              ) : (
                historyRows.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4.5 text-sm text-slate-400">{formatDateTime(item.last_request_at)}</td>
                    <td className="px-6 py-4.5 text-sm font-semibold text-slate-800">{item.driver?.name || 'Unknown'}</td>
                    <td className="px-6 py-4.5 text-sm text-slate-500">{item.driver?.mobile || '-'}</td>
                    <td className="px-6 py-4.5 text-sm font-medium text-slate-800">₹{Number(item.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4.5 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50/80 text-rose-700'
                      }`}>
                        {item.status === 'completed' ? 'Approved' : 'Declined'}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 border-t border-slate-50">
          <div>
            Showing {showingFrom} to {showingTo} of {totalEntries} entries
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold">{safePage}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* QUICK VIEW DETAILS MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[9999] backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100 relative animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Request Information</h3>
                <p className="text-xs text-slate-400 mt-0.5">Details of the driver payout request</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Driver Card */}
              <div className="bg-slate-50/50 rounded-xl p-4 space-y-2.5 border border-slate-100 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium">Driver</span>
                  <span className="text-slate-900 font-semibold uppercase">{selectedRequest.driver?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium">Mobile</span>
                  <span className="text-slate-900 font-medium">{selectedRequest.driver?.mobile}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-medium">Wallet Balance</span>
                  <span className="text-indigo-600 font-bold">₹{Number(selectedRequest.driver?.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Transfer Destination Info */}
              <div className="border border-slate-100 rounded-xl p-4.5 space-y-3.5 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <Building size={15} className="text-slate-400" />
                  <span className="font-semibold text-slate-800 uppercase tracking-wider">
                    {method === 'UPI' ? 'UPI Destination' : 'Bank Account Destination'}
                  </span>
                </div>

                {method === 'UPI' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UPI ID / VPA</label>
                    <p className="text-sm font-semibold text-indigo-600 select-all">{meta.upiId || 'N/A'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div className="space-y-0.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Holder Name</label>
                      <p className="text-sm font-semibold text-slate-800 uppercase">{meta.accountHolderName || selectedRequest.driver?.name || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</label>
                      <p className="text-sm font-semibold text-slate-800 tracking-wider select-all">{meta.accountNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IFSC Code</label>
                      <p className="text-sm font-semibold text-indigo-650 tracking-wider select-all">{meta.ifscCode || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</label>
                      <p className="text-sm font-semibold text-slate-700 uppercase">{meta.bankName || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Highlight */}
              <div className="bg-indigo-50/45 border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest mb-0.5">Amount to Payout</p>
                <p className="text-2xl font-black text-indigo-950">₹{Number(selectedRequest.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Modal Actions */}
            {(selectedRequest.status === 'pending' || selectedRequest.status === 'requested') && (
              <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                <button
                  onClick={() => handleUpdateStatus(selectedRequest._id, 'rejected')}
                  className="flex-1 py-2 px-4 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <XCircle size={14} />
                  Decline & Refund
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedRequest._id, 'completed')}
                  className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-855 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-[0.98]"
                >
                  <CheckCircle2 size={14} />
                  Approve Paid
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalRequestDrivers;
