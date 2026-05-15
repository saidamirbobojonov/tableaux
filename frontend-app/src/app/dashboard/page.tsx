"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import KpiCard from "@/components/ui/KpiCard";
import TopItemsTable from "@/components/ui/TopItemsTable";
import { analyticsApi } from "@/lib/api";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import type {
  DashboardStats,
  DailyTrend,
  HourlySlot,
  PaymentSplit,
  CategoryBreakdown,
  WaiterStat,
} from "@/types";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";
const POLL_MS = 30_000;

// ── Mini helpers ─────────────────────────────────────────────────────────────
function fmt(n: number, currency = "TJS") {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-black uppercase tracking-widest text-[#7b7b6f] mb-3">
      {children}
    </h2>
  );
}

// ── Daily Revenue Chart ───────────────────────────────────────────────────────
function DailyTrendChart({ data }: { data: DailyTrend[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <SectionTitle>Daily Revenue — Last 14 Days</SectionTitle>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const pct = (d.revenue / max) * 100;
          const label = d.day.slice(5); // "MM-DD"
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t bg-[#a7a66c]/70 group-hover:bg-[#a7a66c] transition-all"
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
              <span className="text-[8px] text-[#7b7b6f] leading-none rotate-45 origin-left whitespace-nowrap">
                {label}
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-[#151513] text-white text-[9px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {fmt(d.revenue)} · {d.orders} orders
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Hourly Heatmap ───────────────────────────────────────────────────────────
function HourlyChart({ data }: { data: HourlySlot[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.orders), 1);
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <SectionTitle>Peak Hours</SectionTitle>
      <div className="flex items-end gap-[3px] h-20">
        {data.map((d) => {
          const pct = (d.orders / max) * 100;
          const isHot = d.orders === max;
          return (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div
                className={`w-full rounded-sm transition-all ${
                  isHot ? "bg-orange-500" : "bg-[#a7a66c]/50 group-hover:bg-[#a7a66c]"
                }`}
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
              {d.hour % 3 === 0 && (
                <span className="text-[7px] text-[#7b7b6f] leading-none">
                  {d.hour}h
                </span>
              )}
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-[#151513] text-white text-[9px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {d.hour}:00 — {d.orders} orders
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Payment Split ─────────────────────────────────────────────────────────────
const PAY_COLORS: Record<string, string> = {
  CASH: "#22c55e",
  CARD: "#3b82f6",
  QR: "#a855f7",
};

function PaymentSplitCard({ data }: { data: PaymentSplit[] }) {
  const total = data.reduce((s, d) => s + d.orders, 0);
  if (!total) return null;
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <SectionTitle>Payment Methods</SectionTitle>
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {data.map((d) => (
          <div
            key={d.method}
            style={{ width: `${(d.orders / total) * 100}%`, background: PAY_COLORS[d.method] ?? "#a7a66c" }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.method} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: PAY_COLORS[d.method] ?? "#a7a66c" }}
              />
              <span className="font-medium text-[#151513] dark:text-white">{d.label}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-[#151513] dark:text-white">
                {d.orders} orders
              </span>
              <span className="ml-2 text-[#7b7b6f] text-xs">{fmt(d.revenue)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Category Breakdown ────────────────────────────────────────────────────────
function CategoryChart({ data }: { data: CategoryBreakdown[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <SectionTitle>Revenue by Category</SectionTitle>
      <div className="space-y-2.5">
        {data.slice(0, 8).map((d) => (
          <div key={d.category}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="font-medium text-[#151513] dark:text-white truncate max-w-[60%]">
                {d.category}
              </span>
              <span className="text-[#7b7b6f]">{fmt(d.revenue)}</span>
            </div>
            <div className="h-1.5 bg-[#f3f3f2] dark:bg-[#3a3930] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#a7a66c] rounded-full"
                style={{ width: `${(d.revenue / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Waiter Leaderboard ────────────────────────────────────────────────────────
function WaiterTable({ data }: { data: WaiterStat[] }) {
  if (!data.length) return null;
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <SectionTitle>Staff Performance</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e2df] dark:border-[#3a3930]">
              {["Staff", "Orders", "Revenue", "Avg Bill", "Tips"].map((h) => (
                <th
                  key={h}
                  className="pb-2 text-left text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((w, i) => (
              <tr
                key={w.name}
                className="border-b border-[#f3f3f2] dark:border-[#2a2922] last:border-0"
              >
                <td className="py-2.5 font-semibold text-[#151513] dark:text-white flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${
                      i === 0
                        ? "bg-[#a7a66c] text-white"
                        : "bg-[#f3f3f2] dark:bg-[#2a2922] text-[#7b7b6f]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {w.name}
                </td>
                <td className="py-2.5 text-[#151513] dark:text-white">{w.orders}</td>
                <td className="py-2.5 font-bold text-[#151513] dark:text-white">{fmt(w.revenue)}</td>
                <td className="py-2.5 text-[#7b7b6f]">{fmt(w.avg_ticket)}</td>
                <td className="py-2.5 text-green-600 font-medium">{fmt(w.tips)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Food Cost Gauge ────────────────────────────────────────────────────────────
function FoodCostCard({
  revenue,
  cost,
  profit,
  margin,
}: {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}) {
  const costPct = revenue > 0 ? (cost / revenue) * 100 : 0;
  const marginColor = margin >= 60 ? "text-green-600" : margin >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <SectionTitle>Food Cost Analysis</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#7b7b6f]">Food Cost</p>
          <p className="text-lg font-extrabold text-[#151513] dark:text-white">{fmt(cost)}</p>
          <p className="text-xs text-[#7b7b6f]">{costPct.toFixed(1)}% of revenue</p>
        </div>
        <div>
          <p className="text-xs text-[#7b7b6f]">Gross Profit</p>
          <p className={`text-lg font-extrabold ${marginColor}`}>{fmt(profit)}</p>
          <p className={`text-xs font-bold ${marginColor}`}>{margin}% margin</p>
        </div>
      </div>
      {/* Cost bar */}
      <div className="mt-3 h-2 bg-[#f3f3f2] dark:bg-[#3a3930] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#a7a66c] rounded-full"
          style={{ width: `${Math.min(costPct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Date Range Picker ─────────────────────────────────────────────────────────
const QUICK_RANGES = [
  { label: "Today", days: 0 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState("7d");
  const [from, setFrom] = useState(dateOffset(7));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const fetchStats = useCallback(() => {
    setError(null);
    analyticsApi
      .getDashboard(BRANCH_ID, from, to)
      .then((res) => { setStats(res.data); })
      .catch(() => setError("Failed to load analytics. Check your connection."))
      .finally(() => setLoading(false));
  }, [from, to]);

  usePageRefresh(fetchStats, POLL_MS);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  function applyRange(label: string, days: number) {
    setActiveRange(label);
    const today = new Date().toISOString().slice(0, 10);
    setFrom(days === 0 ? today : dateOffset(days));
    setTo(today);
  }

  const kpi = stats?.kpi;
  const topItems = stats?.top_items ?? [];
  const maxQty = topItems.length > 0 ? Math.max(...topItems.map((i) => i.total_qty)) : 1;

  return (
    <AppShell title="Manager Dashboard">
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5">

        {/* Date Range Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-[#f3f3f2] dark:bg-[#25241e] p-1 rounded-xl border border-[#e2e2df] dark:border-[#3a3930]">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => applyRange(r.label, r.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeRange === r.label
                    ? "bg-[#a7a66c] text-white shadow"
                    : "text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setActiveRange("custom"); }}
              className="border border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e] rounded-lg px-2 py-1.5 text-xs text-[#151513] dark:text-white"
            />
            <span className="text-[#7b7b6f]">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setActiveRange("custom"); }}
              className="border border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e] rounded-lg px-2 py-1.5 text-xs text-[#151513] dark:text-white"
            />
          </div>
          {loading && (
            <span className="text-xs text-[#7b7b6f] animate-pulse">Loading...</span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
          <KpiCard
            label="Total Revenue"
            value={loading || !kpi ? "..." : fmt(kpi.revenue)}
            trend={0}
            subtitle="All completed orders"
          />
          <KpiCard
            label="Total Orders"
            value={loading || !kpi ? "..." : kpi.orders_count.toLocaleString()}
            trend={0}
            subtitle="Completed + Delivered"
          />
          <KpiCard
            label="Avg Bill"
            value={loading || !kpi ? "..." : fmt(kpi.avg_ticket)}
            trend={0}
            subtitle="Per order"
          />
          <KpiCard
            label="Tips Collected"
            value={loading || !kpi ? "..." : fmt(kpi.tips_total)}
            trend={0}
            subtitle="Customer gratuity"
          />
          <KpiCard
            label="Discounts Given"
            value={loading || !kpi ? "..." : fmt(kpi.discounts_total)}
            trend={0}
            subtitle="Total reductions"
          />
        </div>

        {/* Row 2: Trend + Hourly */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyTrendChart data={stats?.daily_trend ?? []} />
          <HourlyChart data={stats?.hourly_distribution ?? []} />
        </div>

        {/* Row 3: Payment Split + Category + Food Cost */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PaymentSplitCard data={stats?.payment_split ?? []} />
          <CategoryChart data={stats?.category_breakdown ?? []} />
          {stats?.food_cost && (
            <FoodCostCard
              revenue={stats.food_cost.total_revenue}
              cost={stats.food_cost.total_food_cost}
              profit={stats.food_cost.gross_profit}
              margin={stats.food_cost.margin_percent}
            />
          )}
        </div>

        {/* Row 4: Waiter Performance + Top Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WaiterTable data={stats?.waiter_stats ?? []} />
          {topItems.length > 0 && (
            <TopItemsTable items={topItems} maxQty={maxQty} />
          )}
        </div>

        {/* Row 5: Order type split */}
        {stats?.order_type_split && stats.order_type_split.length > 0 && (
          <div className="bg-white dark:bg-[#25241e] rounded-xl p-5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
            <SectionTitle>Order Type Breakdown</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {stats.order_type_split.map((t) => {
                const icons: Record<string, string> = {
                  DINE_IN: "restaurant",
                  TAKEAWAY: "takeout_dining",
                  DELIVERY: "delivery_dining",
                  RESERVE: "event_seat",
                };
                return (
                  <div key={t.type} className="text-center p-3 bg-[#f7f7f6] dark:bg-[#1c1b16] rounded-xl">
                    <span className="material-symbols-outlined text-2xl text-[#a7a66c] mb-1">
                      {icons[t.type] ?? "receipt_long"}
                    </span>
                    <p className="text-xs font-black uppercase tracking-widest text-[#7b7b6f]">
                      {t.type.replace("_", " ")}
                    </p>
                    <p className="text-xl font-extrabold text-[#151513] dark:text-white">{t.orders}</p>
                    <p className="text-xs text-[#7b7b6f]">{fmt(t.revenue)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
