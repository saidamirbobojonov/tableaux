"use client";

import type { KDSOrder } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  PAID: "border-t-yellow-400",
  PREPARING: "border-t-blue-400",
  READY: "border-t-green-500",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "New",
  PREPARING: "Preparing",
  READY: "Ready",
};

const NEXT_STATUS: Record<string, string> = {
  PAID: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const NEXT_LABEL: Record<string, string> = {
  PAID: "Start Cooking",
  PREPARING: "Mark Ready",
  READY: "Complete",
};

interface KDSCardProps {
  order: KDSOrder;
  onStatusUpdate: (orderId: string, status: string) => Promise<void>;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function KDSCard({ order, onStatusUpdate }: KDSCardProps) {
  const borderColor = STATUS_COLORS[order.status] ?? "border-t-[#a7a66c]";
  const nextStatus = NEXT_STATUS[order.status];
  const nextLabel = NEXT_LABEL[order.status];

  const isUrgent = order.time_elapsed_seconds > 600; // > 10 min

  return (
    <div
      className={`bg-white dark:bg-[#25241e] rounded-xl border border-[#e2e2df] dark:border-[#3a3930] border-t-4 ${borderColor} shadow-sm flex flex-col`}
    >
      {/* Card Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#f3f3f2] dark:border-[#3a3930]">
        <div>
          <p className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wider">
            {order.order_type === "DINE_IN" ? `Table ${order.table_number}` : order.order_type}
          </p>
          <p className="text-[#151513] dark:text-white text-base font-bold">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              isUrgent
                ? "bg-red-100 text-red-600"
                : "bg-[#a7a66c]/10 text-[#a7a66c]"
            }`}
          >
            {formatElapsed(order.time_elapsed_seconds)}
          </span>
          <p className="text-[10px] text-[#7b7b6f] mt-1">{STATUS_LABELS[order.status] ?? order.status}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 flex-1 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="min-w-[1.5rem] text-sm font-bold text-[#a7a66c]">
              {item.quantity}×
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#151513] dark:text-white">
                {item.name}
                {item.variant_name && (
                  <span className="text-[#7b7b6f] font-normal"> ({item.variant_name})</span>
                )}
              </p>
              {item.modifiers.length > 0 && (
                <p className="text-xs text-[#7b7b6f]">
                  +{item.modifiers.map((m) => m.name).join(", ")}
                </p>
              )}
              {item.notes && (
                <p className="text-xs text-amber-600 italic mt-0.5">📝 {item.notes}</p>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
            Note: {order.notes}
          </div>
        )}
      </div>

      {/* Action */}
      {nextStatus && (
        <div className="px-4 pb-4 pt-3 border-t border-[#f3f3f2] dark:border-[#3a3930]">
          <button
            onClick={() => onStatusUpdate(order.id, nextStatus)}
            className="w-full bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white text-sm font-bold py-2.5 rounded-lg transition-all"
          >
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}
