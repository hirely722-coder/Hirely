import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  CreditCard, DollarSign, Calendar, AlertCircle, RefreshCw, 
  ArrowUpRight, ArrowDownRight, CheckCircle2, RefreshCcw, Download
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminPayments() {
  const { showToast } = useApp();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/payments');
      setPayments(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleRefund = async (payment: any) => {
    if (!window.confirm(`Are you sure you want to refund this payment of $${payment.amount} to ${payment.agencyName}?`)) return;
    try {
      const updated = await fetchAdminApi(`/api/superadmin/payments/${payment.id}/refund`, { method: 'POST' });
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updated } : p));
      showToast(`✓ Payment of $${payment.amount} refunded successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Refund failed', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = 'Transaction ID,Agency,Plan,Amount,Currency,Status,Created At\n';
    const rows = filteredPayments.map(p => 
      `"${p.id}","${p.agencyName}","${p.planName}",${p.amount},"${p.currency}","${p.status}","${p.createdAt}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hirely_payments_${Date.now()}.csv`;
    link.click();
  };

  const filteredPayments = payments.filter(p => {
    return filterStatus === 'All' || p.status === filterStatus;
  });

  // Calculate payment summaries
  const totalPaid = payments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalRefunded = payments.filter(p => p.status === 'Refunded').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalFailed = payments.filter(p => p.status === 'Failed').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Revenue & Payments</h1>
          <p className="text-xs text-slate-500 font-medium">Track subscription invoices, manage refund requests, and audit transaction health.</p>
        </div>
        <button 
          onClick={loadPayments}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Paid Revenue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">Active Revenue</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received Revenue</p>
            <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">${totalPaid.toFixed(2)}</h3>
          </div>
        </div>

        {/* Refunded */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 shrink-0">
              <RefreshCcw className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">Refunded</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Refunded</p>
            <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">${totalRefunded.toFixed(2)}</h3>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50">Billing Errors</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed Transactions</p>
            <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">${totalFailed.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Failed Payment Warning Banner */}
      {payments.some(p => p.status === 'Failed') && (
        <div className="flex gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs font-semibold text-rose-700 leading-normal items-start">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-800">Unresolved Billing Exceptions Detected</p>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
              Some subscription renewals failed processing. Access permissions are temporarily preserved but automated locks will apply if payments are not cleared within the next 48 hours.
            </p>
          </div>
        </div>
      )}

      {/* Transaction History Data table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-sm font-bold text-slate-900 font-display">Invoices & Transaction Ledger</h3>
          
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-bold"
              >
                <option value="All">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading ledger logs...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No payment logs found matching this criteria.</div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Agency</th>
                  <th className="px-6 py-4">Plan License</th>
                  <th className="px-6 py-4">Billing Amount</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400 font-semibold">{pay.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-display">{pay.agencyName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{pay.planName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ${parseFloat(pay.amount).toFixed(2)} {pay.currency}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-400">
                      {new Date(pay.createdAt).toLocaleDateString()} {new Date(pay.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        pay.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                          : pay.status === 'Refunded'
                            ? 'bg-slate-50 text-slate-700 border-slate-200/50'
                            : pay.status === 'Failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-100/50'
                              : 'bg-amber-50 text-amber-700 border-amber-100/50'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {pay.status === 'Paid' ? (
                        <button
                          onClick={() => handleRefund(pay)}
                          className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 border border-rose-100 bg-rose-50 hover:bg-rose-100/50 px-2.5 py-1 rounded-xl transition-all cursor-pointer ml-auto"
                        >
                          <RefreshCcw className="h-3 w-3" />
                          <span>Refund</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
