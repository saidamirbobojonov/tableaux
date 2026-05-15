"use client";

import { useEffect, useRef, useState } from "react";
import type { KDSOrder } from "@/types";

interface KDSOrderCardProps {
  order: KDSOrder;
  onAction: (orderId: string, status: string) => Promise<void>;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const NEXT_STATUS: Record<string, string> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
};

const TYPE_ICON: Record<string, string> = {
  DINE_IN: "restaurant",
  TAKEAWAY: "takeout_dining",
  DELIVERY: "delivery_dining",
  RESERVE: "event_seat",
};

// Urgency thresholds (seconds)
const WARN_SEC = 600;   // 10 min — yellow
const URGENT_SEC = 900; // 15 min — red pulse

export default function KDSOrderCard({ order, onAction }: KDSOrderCardProps) {
  const [elapsed, setElapsed] = useState(order.time_elapsed_seconds);
  const [acting, setActing] = useState(false);
  const isNew = order.status === "PENDING";
  const isPreparing = order.status === "PREPARING";
  const isReady = order.status === "READY";
  const isWarn = elapsed >= WARN_SEC && elapsed < URGENT_SEC;
  const isUrgent = elapsed >= URGENT_SEC;

  // Play a subtle chime when a NEW order appears
  const hasChimed = useRef(false);
  useEffect(() => {
    if (isNew && !hasChimed.current) {
      hasChimed.current = true;
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch { /* browser may block autoplay */ }
    }
  }, [isNew]);

  // Live timer
  useEffect(() => {
    setElapsed(order.time_elapsed_seconds);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [order.time_elapsed_seconds]);

  async function handleAction(nextStatus: string) {
    setActing(true);
    try { await onAction(order.id, nextStatus); }
    finally { setActing(false); }
  }

  // Timer color
  const timerColor = isUrgent
    ? "text-red-500"
    : isWarn
    ? "text-orange-500"
    : isPreparing
    ? "text-amber-400"
    : "text-[#a7a66c]";

  // Card border
  const borderClass = isUrgent
    ? "border-2 border-red-500 shadow-red-500/10 shadow-lg"
    : isPreparing
    ? "border-2 border-[#a7a66c] shadow-[#a7a66c]/5"
    : isReady
    ? "border-2 border-green-500 shadow-green-500/5"
    : "border border-[#e8e8e5] dark:border-[#333]";

  const nextStatus = NEXT_STATUS[order.status];
  const actionLabel = isNew ? "Start Preparing" : isPreparing ? "Mark Ready" : null;

  const orderLabel = order.order_type === "DINE_IN"
    ? `Table ${order.table_number ?? "?"}`
    : order.order_type === "DELIVERY"
    ? "Delivery"
    : order.order_type;

  return (
    <div className={`flex flex-col bg-white dark:bg-[#252420] rounded-xl transition-all hover:shadow-lg ${borderClass} ${isUrgent ? "animate-pulse-border" : ""}`}>
      {/* ── Card Header ── */}
      <div className={`p-4 flex justify-between items-start border-b ${
        isPreparing ? "border-[#a7a66c]/20" : isUrgent ? "border-red-500/20" : "border-[#e8e8e5] dark:border-[#333]"
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="material-symbols-outlined text-[#7b7b6f] text-base">
              {TYPE_ICON[order.order_type] ?? "receipt_long"}
            </span>
            <h3 className="text-2xl font-extrabold tracking-tighter text-[#151513] dark:text-white">
              {orderLabel}
            </h3>
          </div>
          <p className="text-[10px] font-bold text-[#7b7b6f] uppercase tracking-wide">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          {order.server_name && order.server_name !== "Guest" && (
            <p className="text-[10px] text-[#7b7b6f] mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">person</span>
              {order.server_name}
            </p>
          )}
          {order.order_type === "DELIVERY" && order.delivery_address && (
            <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1 max-w-[160px] truncate">
              <span className="material-symbols-outlined text-[11px]">location_on</span>
              {order.delivery_address}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-black tabular-nums ${timerColor}`}>
            {formatTimer(elapsed)}
          </div>
          <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${timerColor} opacity-80`}>
            {isNew ? "New" : isPreparing ? "Cooking" : isReady ? "Ready" : order.status}
          </div>
          {isUrgent && (
            <div className="mt-1 text-[9px] font-black text-red-500 uppercase tracking-wide">
              ⚠ Delayed
            </div>
          )}
        </div>
      </div>

      {/* ── Order-level note (prominent) ── */}
      {order.notes && (
        <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-700/40 rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">
            sticky_note_2
          </span>
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400 leading-snug">
            {order.notes}
          </p>
        </div>
      )}

      {/* ── Items ── */}
      <div className="p-4 flex-1 space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="text-lg font-extrabold text-[#a7a66c] pt-0.5 min-w-[2rem] tabular-nums">
              {item.quantity}×
            </span>
            <div className="flex-1">
              <p className="font-bold text-[#151513] dark:text-white leading-snug">
                {item.name}
                {item.variant_name && (
                  <span className="text-[#7b7b6f] font-normal"> · {item.variant_name}</span>
                )}
              </p>
              {item.modifiers.length > 0 && (
                <p className="text-xs mt-0.5 font-bold text-[#a7a66c] uppercase tracking-wide">
                  + {item.modifiers.map((m) => m.name).join(" · ")}
                </p>
              )}
              {item.notes && (
                <p className="text-xs mt-0.5 italic text-amber-600 dark:text-amber-400 font-medium">
                  ↳ {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Buttons ── */}
      <div className="px-4 pb-4 pt-1">
        {isReady ? (
          <div className="w-full py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-bold text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Ready — Awaiting Payment
          </div>
        ) : nextStatus && actionLabel ? (
          <div className="flex gap-2">
            <button
              disabled={acting}
              onClick={() => handleAction(nextStatus)}
              className={`flex-[3] py-3.5 text-white rounded-xl font-bold text-sm uppercase tracking-wider active:scale-95 transition-all disabled:opacity-60 ${
                isNew
                  ? "bg-[#a7a66c] hover:bg-[#a7a66c]/90"
                  : "bg-[#2d2c26] hover:bg-[#1a1916] dark:bg-[#444] dark:hover:bg-[#555]"
              }`}
            >
              {acting ? "..." : actionLabel}
            </button>
            <button
              onClick={() => handleAction("CANCELLED")}
              className="flex-1 py-3.5 border border-[#e8e8e5] dark:border-[#444] text-red-400 hover:text-red-600 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Cancel order"
            >
              <span className="material-symbols-outlined text-base">cancel</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
