"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { ordersApi } from "@/lib/api";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import type { Order, OrderStatus } from "@/types";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";

const STATUS_TABS: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PAID", label: "Paid" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  PAID: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PREPARING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  READY: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ON_WAY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-[#a7a66c]/10 text-[#a7a66c]",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const ORDER_TYPE_ICON: Record<string, string> = {
  DINE_IN: "restaurant",
  TAKEAWAY: "takeout_dining",
  DELIVERY: "delivery_dining",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    const params: Record<string, string> = activeTab !== "ALL" ? { status: activeTab } : {};
    ordersApi
      .list(BRANCH_ID, params)
      .then((res) => setOrders(res.data.results ?? res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  usePageRefresh(fetchOrders, 15000);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === "ALL"
      ? orders.length
      : orders.filter((o) => o.status === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppShell title="Orders">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setLoading(true); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === key
                  ? "bg-[#a7a66c] text-white"
                  : "bg-white dark:bg-[#25241e] text-[#7b7b6f] border border-[#e2e2df] dark:border-[#3a3930] hover:border-[#a7a66c] hover:text-[#a7a66c]"
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === key ? "bg-white/20 text-white" : "bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f]"
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-[#7b7b6f]">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#7b7b6f]">
            <span className="material-symbols-outlined text-5xl">receipt_long</span>
            <p className="font-bold">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedId === order.id;
              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-[#25241e] rounded-xl border border-[#e2e2df] dark:border-[#3a3930] shadow-sm overflow-hidden"
                >
                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#f7f7f6] dark:hover:bg-[#32312a]/30 transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {/* Order type icon */}
                    <div className="size-10 rounded-full bg-[#a7a66c]/10 flex items-center justify-center text-[#a7a66c] shrink-0">
                      <span className="material-symbols-outlined text-xl">
                        {ORDER_TYPE_ICON[order.order_type] ?? "receipt"}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#151513] dark:text-white text-sm">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        {order.table_number && (
                          <span className="text-xs text-[#7b7b6f]">· Table {order.table_number}</span>
                        )}
                        {order.customer_phone && (
                          <span className="text-xs text-[#7b7b6f]">· {order.customer_phone}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#7b7b6f] mt-0.5">
                        {order.items_details?.length ?? 0} items · {timeAgo(order.created_at)}
                      </p>
                    </div>

                    {/* Status + amount */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status}
                      </span>
                      <p className="font-bold text-[#151513] dark:text-white text-sm hidden sm:block">
                        {Number(order.total_amount).toFixed(2)} TJS
                      </p>
                      <span className="material-symbols-outlined text-[#7b7b6f] text-xl">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-[#e2e2df] dark:border-[#3a3930] px-5 py-4 bg-[#f7f7f6] dark:bg-[#32312a]/20">
                      <div className="space-y-2 mb-4">
                        {order.items_details?.map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#151513] dark:text-white">
                                {item.quantity}× {item.name}
                                {item.variant && <span className="text-[#7b7b6f] font-normal"> ({item.variant})</span>}
                              </p>
                              {item.modifiers.length > 0 && (
                                <p className="text-xs text-[#a7a66c] italic">
                                  +{item.modifiers.map((m) => m.name).join(", ")}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-[#7b7b6f] italic">{item.notes}</p>
                              )}
                            </div>
                            <p className="text-sm font-bold text-[#151513] dark:text-white shrink-0">
                              {Number(item.total).toFixed(2)} TJS
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-[#e2e2df] dark:border-[#3a3930]">
                        <div className="flex items-center gap-2 text-xs text-[#7b7b6f]">
                          {order.payment_method && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">payments</span>
                              {order.payment_method}
                            </span>
                          )}
                          {order.notes && (
                            <span className="italic">"{order.notes}"</span>
                          )}
                        </div>
                        <p className="font-extrabold text-[#a7a66c]">
                          {Number(order.total_amount).toFixed(2)} TJS
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
