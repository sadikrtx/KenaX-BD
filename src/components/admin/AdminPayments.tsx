import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Smartphone,
} from 'lucide-react';
import { Order, UserRole, StaffUser } from '../../types';

interface AdminPaymentsProps {
  orders: Order[];
  onVerifyPayment: (orderId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminPayments: React.FC<AdminPaymentsProps> = ({
  orders,
  onVerifyPayment,
}) => {
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.transactionId && o.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.senderMobileNumber && o.senderMobileNumber.includes(searchQuery));

    const matchesMethod =
      methodFilter === 'all' || o.paymentMethod.toLowerCase().includes(methodFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || o.paymentStatus.toLowerCase().includes(statusFilter.toLowerCase());

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalCollected = orders
    .filter((o) => o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingVerification = orders.filter(
    (o) => o.paymentStatus === 'Pending' || o.paymentStatus === 'Submitted'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Verified Collections</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">৳{totalCollected.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified across all gateways</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Verifications</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingVerification}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting TrxID check</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">bKash / Nagad Share</span>
          <p className="text-2xl font-black text-sky-600 mt-1">
            {orders.filter((o) => o.paymentMethod.toLowerCase().includes('bkash') || o.paymentMethod.toLowerCase().includes('nagad')).length} Orders
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">MFS instant transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, TrxID, sender number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
          >
            <option value="all">All Methods</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="cash">Cash on Delivery</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified / Paid</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Sender Number</th>
                <th className="py-3.5 px-4">TrxID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => {
                const isPaid = o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid';
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                      #{o.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{o.customerName}</p>
                      <p className="text-[11px] text-slate-400">{o.customerMobile}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {o.senderMobileNumber || o.customerMobile}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {o.transactionId || (
                        <span className="text-[11px] text-slate-400 italic">COD (N/A)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                      ৳{o.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isPaid ? (
                        <button
                          onClick={() => onVerifyPayment(o.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-xs inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
