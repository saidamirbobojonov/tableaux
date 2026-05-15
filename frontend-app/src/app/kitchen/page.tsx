"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import KDSOrderCard from "@/components/kds/KDSOrderCard";
import ThemeToggle from "@/components/layout/ThemeToggle";
import RoleGuard from "@/components/layout/RoleGuard";
import { kitchenApi } from "@/lib/api";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import type { KDSOrder } from "@/types";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";
const POLL_MS = 6000; // 6s polling for near-realtime feel

type Tab = "all" | "PENDING" | "PREPARING" | "READY";

export default function KitchenPage() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshStr, setLastRefreshStr] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Track previous pending count to detect new orders
  const prevPendingCount = useRef(0);

  const fetchOrders = useCallback(() => {
    kitchenApi
      .board(BRANCH_ID)
      .then((res) => {
        const fresh: KDSOrder[] = res.data.results ?? res.data;
        setOrders((prev) => {
          const newPending = fresh.filter((o) => o.status === "PENDING").length;
          // Play chime if pending orders increased
          if (newPending > prevPendingCount.current && prevPendingCount.current !== 0) {
            try {
              const ctx = new AudioContext();
              // Two-tone notification
              [880, 1100].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.3);
              });
            } catch { /* browser may block */ }
          }
          prevPendingCount.current = newPending;
          return fresh;
        });
        setLastRefreshStr(new Date().toLocaleTimeString());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  usePageRefresh(fetchOrders, POLL_MS);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleAction(orderId: string, status: string) {
    try {
      await kitchenApi.updateStatus(orderId, status);
      fetchOrders();
    } catch (err) {
      console.error("Status update failed", err);
    }
  }

  function clearReady() {
    const ready = orders.filter((o) => o.status === "READY");
    Promise.all(ready.map((o) => kitchenApi.updateStatus(o.id, "COMPLETED")))
      .then(fetchOrders)
      .catch(console.error);
  }

  const counts = {
    all: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    PREPARING: orders.filter((o) => o.status === "PREPARING").length,
    READY: orders.filter((o) => o.status === "READY").length,
  };

  // Sort: PENDING first, then PREPARING (by elapsed descending), then READY
  const sortedOrders = [...orders].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, PREPARING: 1, READY: 2 };
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
    if (diff !== 0) return diff;
    return b.time_elapsed_seconds - a.time_elapsed_seconds; // oldest first within same status
  });

  const visible = activeTab === "all"
    ? sortedOrders
    : sortedOrders.filter((o) => o.status === activeTab);

  const avgPrep = orders.length
    ? Math.round(orders.reduce((s, o) => s + o.time_elapsed_seconds, 0) / orders.length)
    : 0;

  const urgentCount = orders.filter((o) => o.time_elapsed_seconds >= 900).length;

  const TABS: { key: Tab; label: string; color?: string }[] = [
    { key: "all", label: "All" },
    { key: "PENDING", label: "New", color: "text-[#a7a66c]" },
    { key: "PREPARING", label: "Cooking", color: "text-amber-500" },
    { key: "READY", label: "Ready", color: "text-green-500" },
  ];

  return (
    <RoleGuard allowedRoles={["OWNER", "BRANCH_MAN", "CHEF"]}>
    <div className="bg-[#f7f7f6] dark:bg-[#1a1916] min-h-screen text-[#151513] dark:text-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#1c1b16]/90 backdrop-blur-md border-b border-[#e8e8e5] dark:border-[#2a2922] px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#a7a66c] text-xl">restaurant_menu</span>
            <span className="font-extrabold text-base tracking-tight">Kitchen Display</span>
          </div>

          {/* Status counts */}
          <div className="hidden md:flex items-center gap-1 bg-[#f7f7f6] dark:bg-[#25241e] rounded-xl px-2 py-1.5 border border-[#e8e8e5] dark:border-[#2a2922]">
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <span className="size-2 rounded-full bg-[#a7a66c]" />
              <span className="text-xs font-black">{counts.PENDING}</span>
              <span className="text-[10px] text-[#7b7b6f] font-bold">New</span>
            </div>
            <div className="w-px h-5 bg-[#e8e8e5] dark:bg-[#2a2922]" />
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-xs font-black">{counts.PREPARING}</span>
              <span className="text-[10px] text-[#7b7b6f] font-bold">Cooking</span>
            </div>
            <div className="w-px h-5 bg-[#e8e8e5] dark:bg-[#2a2922]" />
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="text-xs font-black">{counts.READY}</span>
              <span className="text-[10px] text-[#7b7b6f] font-bold">Ready</span>
            </div>
          </div>

          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-lg animate-pulse">
              <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
              <span className="text-xs font-black text-red-500">{urgentCount} delayed</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#7b7b6f]">
            <span className="size-1.5 bg-green-500 rounded-full animate-pulse" />
            {lastRefreshStr || "—"}
          </div>
          <ThemeToggle />
          <button
            onClick={clearReady}
            disabled={counts.READY === 0}
            className="bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            <span className="hidden sm:inline">Clear Ready</span>
          </button>
          <Link
            href="/pos"
            className="size-9 flex items-center justify-center rounded-xl bg-[#f3f3f2] dark:bg-[#333] hover:bg-[#e2e2df] dark:hover:bg-[#444] transition-colors"
            title="POS"
          >
            <span className="material-symbols-outlined text-lg">point_of_sale</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-[2000px] mx-auto w-full p-4 md:p-5">

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-5 bg-white dark:bg-[#25241e] rounded-2xl p-1 border border-[#e8e8e5] dark:border-[#2a2922] self-start shadow-sm">
          {TABS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative px-4 py-2 rounded-xl text-sm font-black transition-all ${
                activeTab === key
                  ? "bg-[#a7a66c] text-white shadow"
                  : `${color ?? "text-[#7b7b6f]"} hover:bg-[#f7f7f6] dark:hover:bg-[#32312a]`
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`ml-1.5 text-[10px] ${activeTab === key ? "opacity-80" : "opacity-60"}`}>
                  {counts[key]}
                </span>
              )}
              {key === "PENDING" && counts.PENDING > 0 && activeTab !== "PENDING" && (
                <span className="absolute -top-1 -right-1 size-2 bg-[#a7a66c] rounded-full animate-ping" />
              )}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#7b7b6f] font-medium">Loading orders...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#7b7b6f]">
            <span className="material-symbols-outlined text-6xl opacity-30">check_circle</span>
            <p className="text-xl font-extrabold opacity-50">
              {activeTab === "all" ? "No active orders" : `No ${activeTab.toLowerCase()} orders`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 auto-rows-min">
            {visible.map((order) => (
              <KDSOrderCard key={order.id} order={order} onAction={handleAction} />
            ))}
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-6 pt-5 border-t border-[#e8e8e5] dark:border-[#2a2922] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] mb-0.5">
                Avg Elapsed
              </p>
              <p className="text-xl font-extrabold">
                {Math.floor(avgPrep / 60)}m {avgPrep % 60}s
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] mb-0.5">
                Active Tickets
              </p>
              <p className="text-xl font-extrabold text-[#a7a66c]">{counts.all}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] mb-0.5">
                Kitchen Load
              </p>
              <p className={`text-xl font-extrabold ${
                counts.all > 10 ? "text-red-500" : counts.all > 5 ? "text-amber-500" : "text-green-500"
              }`}>
                {counts.all > 10 ? "High" : counts.all > 5 ? "Medium" : "Low"}
              </p>
            </div>
            {urgentCount > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-0.5">
                  Delayed (&gt;15m)
                </p>
                <p className="text-xl font-extrabold text-red-500">{urgentCount}</p>
              </div>
            )}
          </div>

          <nav className="flex items-center gap-3 text-xs font-bold text-[#7b7b6f]">
            <Link href="/pos" className="hover:text-[#a7a66c] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">point_of_sale</span>
              POS
            </Link>
            <Link href="/dashboard" className="hover:text-[#a7a66c] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">dashboard</span>
              Dashboard
            </Link>
          </nav>
        </div>
      </main>
    </div>
    </RoleGuard>
  );
}
