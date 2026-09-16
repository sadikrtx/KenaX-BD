import React, { useState } from 'react';
import {
  Truck,
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  MapPin,
  Calendar,
  Save,
} from 'lucide-react';
import { Order, OrderStatus, UserRole, StaffUser } from '../../types';

interface AdminDeliveryProps {
  orders: Order[];
  onUpdateDelivery: (
    orderId: string,
    courierName: string,
    trackingNumber: string,
    status: OrderStatus
  ) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminDelivery: React.FC<AdminDeliveryProps> = ({
  orders,
  onUpdateDelivery,
}) => {
  const [courierFilter, setCourierFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [courier, setCourier] = useState('Steadfast Courier');
  const [tracking, setTracking] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Shipped');

  // Filter orders that have or need delivery
  const deliveryOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourier =
      courierFilter === 'all' ||
      (o.courierName && o.courierName.toLowerCase().includes(courierFilter.toLowerCase()));

    return matchesSearch && matchesCourier;
  });

  const getTrackingUrl = (courierName?: string, trackingNumber?: string) => {
    if (!trackingNumber) return '#';
    const c = courierName?.toLowerCase() || '';
    if (c.includes('steadfast')) return `https://steadfast.com.bd/t/${trackingNumber}`;
    if (c.includes('pathao')) return `https://merchant.pathao.com/tracking?consignment_id=${trackingNumber}`;
    if (c.includes('redx')) return `https://redx.com.bd/track/${trackingNumber}`;
    return `https://www.google.com/search?q=${encodeURIComponent(`${courierName || 'courier'} track ${trackingNumber}`)}`;
  };

  const handleOpenEdit = (order: Order) => {
    setSelectedOrder(order);
    setCourier(order.courierName || 'Steadfast Courier');
    setTracking(order.trackingNumber || '');
    setStatus(order.orderStatus);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    onUpdateDelivery(selectedOrder.id, courier, tracking, status);
    setToastMessage(`অর্ডার #${selectedOrder.id} এর ডেলিভারি তথ্য ও ট্র্যাকিং সফলভাবে আপডেট হয়েছে!`);
    setTimeout(() => setToastMessage(null), 4000);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Courier Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deliveries</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {orders.filter((o) => o.orderStatus === 'Shipped' || o.orderStatus === 'Out for Delivery').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">In rider hands</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Steadfast Shipments</span>
          <p className="text-2xl font-black text-sky-600 mt-1">
            {orders.filter((o) => o.courierName?.includes('Steadfast')).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Primary Bangladesh API partner</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pathao Deliveries</span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {orders.filter((o) => o.courierName?.includes('Pathao')).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Same-day Dhaka deliveries</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Successful Handover</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {orders.filter((o) => o.orderStatus === 'Delivered').length}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Completed</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer, tracking code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={courierFilter}
          onChange={(e) => setCourierFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
        >
          <option value="all">All Courier Partners</option>
          <option value="steadfast">Steadfast Courier</option>
          <option value="pathao">Pathao Courier</option>
          <option value="redx">RedX Logistics</option>
          <option value="sundarban">Sundarban Courier</option>
          <option value="ecourier">eCourier</option>
        </select>
      </div>

      {/* Logistics Table / Card List */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {/* Desktop View (Unchanged table layout) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer & City</th>
                <th className="py-3.5 px-4">Courier Partner</th>
                <th className="py-3.5 px-4">Consignment / Tracking</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveryOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                    #{o.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{o.customerName}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{o.district || (typeof o.deliveryAddress === 'object' ? (o.deliveryAddress as any)?.district : o.deliveryAddress) || o.division || o.customerDivision || 'Dhaka'}</span>
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {o.courierName || 'Steadfast Courier'}
                  </td>
                  <td className="py-3.5 px-4">
                    {o.trackingNumber ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {o.trackingNumber}
                        </span>
                        <a
                          href={getTrackingUrl(o.courierName, o.trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-sky-600 hover:text-sky-800 transition-colors"
                          title="Open Live Courier Tracking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Not assigned yet</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        o.orderStatus === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(o)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Update Logistics</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Clean, Zero Horizontal Scroll Compact Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {deliveryOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No orders found matching courier or tracking search.
            </div>
          ) : (
            deliveryOrders.map((o) => {
              const locationStr = o.district || (typeof o.deliveryAddress === 'object' ? (o.deliveryAddress as any)?.district : o.deliveryAddress) || o.division || o.customerDivision || 'Dhaka';
              return (
                <div key={o.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  {/* Top Row: Order ID + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-sky-700 text-xs">#{o.id}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                        {o.courierName || 'Steadfast'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        o.orderStatus === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {o.orderStatus}
                    </span>
                  </div>

                  {/* Customer and Location Info */}
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <p className="font-bold text-slate-900 text-xs">{o.customerName}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{locationStr}</span>
                    </p>
                  </div>

                  {/* Consignment & Action */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Tracking:</span>
                      {o.trackingNumber ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] truncate">
                            {o.trackingNumber}
                          </span>
                          <a
                            href={getTrackingUrl(o.courierName, o.trackingNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-sky-600 hover:text-sky-800 transition-colors shrink-0"
                            title="Open Live Courier Tracking"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Not assigned</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenEdit(o)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Update</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Logistics Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">Update Order Consignment</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-800">Order #{selectedOrder.id}</p>
                <p className="text-xs text-slate-500">
                  Recipient: {selectedOrder.customerName} ({selectedOrder.customerMobile})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Courier Partner</label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                >
                  <option value="Steadfast Courier">Steadfast Courier</option>
                  <option value="Pathao Courier">Pathao Courier</option>
                  <option value="RedX Logistics">RedX Logistics</option>
                  <option value="Sundarban Courier">Sundarban Courier</option>
                  <option value="eCourier">eCourier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Consignment / Tracking ID</label>
                <input
                  type="text"
                  required
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. STF-9082341"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fulfillment Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                >
                  <option value="Processing">Processing</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped (Dispatched)</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled / Returned</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Delivery Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
