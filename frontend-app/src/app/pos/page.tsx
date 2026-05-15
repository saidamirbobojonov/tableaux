"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import RoleGuard from "@/components/layout/RoleGuard";
import api, { shiftsApi, tablesApi, ordersApi } from "@/lib/api";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import type { Table } from "@/types";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";

type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
type PayMethod = "CASH" | "CARD" | "QR";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  image: string | null;
  slug: string;
  variants?: { id: string; name: string; price_override: string | null }[];
}
interface Category { id: string; name: string; items: MenuItem[]; }
interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  variantId?: string;
  variantName?: string;
  notes: string;
}
interface ReadyOrder {
  id: string;
  table_number: string | null;
  order_type: string;
  total_amount: string;
}

interface Receipt {
  orderId: string;
  orderType: string;
  tableLabel: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discountAmount: number;
  tipAmount: number;
  total: number;
  dateStr: string;
  timeStr: string;
  notes: string;
}

const ORDER_TYPES: { key: OrderType; label: string; icon: string }[] = [
  { key: "DINE_IN",  label: "Dine In",  icon: "restaurant" },
  { key: "TAKEAWAY", label: "Takeaway", icon: "takeout_dining" },
  { key: "DELIVERY", label: "Delivery", icon: "delivery_dining" },
];

const FP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  AVAILABLE: { bg: "rgba(134,239,172,0.25)", border: "#16a34a", text: "#15803d" },
  OCCUPIED:  { bg: "rgba(252,165,165,0.30)", border: "#dc2626", text: "#b91c1c" },
  RESERVED:  { bg: "rgba(216,180,254,0.30)", border: "#9333ea", text: "#7e22ce" },
};

// ── POS Floor Plan ────────────────────────────────────────────────────────────
function POSFloorPlan({
  tables,
  selectedTable,
  onSelect,
}: {
  tables: Table[];
  selectedTable: Table | null;
  onSelect: (t: Table) => void;
}) {
  const active = tables.filter((t) => t.is_active);
  const available = active.filter((t) => t.status === "AVAILABLE").length;

  return (
    <div className="p-3 flex flex-col gap-3 h-full">
      <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] flex items-center justify-between shrink-0">
        <span>Hall</span>
        <span className="text-green-600">{available} free</span>
      </p>

      {active.length === 0 ? (
        <p className="text-xs text-[#7b7b6f] italic">No tables. Add them in Settings.</p>
      ) : (
        <div
          className="relative flex-1 bg-[#f7f7f6] dark:bg-[#1c1b16] border border-dashed border-[#c8c8c0] dark:border-[#3a3930] rounded-xl overflow-hidden"
          style={{ minHeight: 180 }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
            <defs>
              <pattern id="pg" width="10%" height="10%" patternUnits="objectBoundingBox">
                <path d="M 0 0 L 0 1 M 0 0 L 1 0" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pg)" />
          </svg>

          {/* Entrance */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <span className="text-[7px] font-black uppercase tracking-widest text-[#7b7b6f] opacity-40">In</span>
            <div className="w-8 h-0.5 bg-[#7b7b6f] opacity-20 rounded-full" />
          </div>

          {active.map((table) => {
            const fp = FP_COLORS[table.status] ?? FP_COLORS.AVAILABLE;
            const isSelected = selectedTable?.id === table.id;
            const isOccupied = table.status === "OCCUPIED";
            const isRound = table.shape === "round";

            return (
              <button
                key={table.id}
                disabled={isOccupied}
                onClick={() => !isOccupied && onSelect(table)}
                className="absolute flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
                style={{
                  left: `${table.pos_x}%`,
                  top: `${table.pos_y}%`,
                  width: `${table.width}%`,
                  height: `${table.height}%`,
                  background: isSelected ? "rgba(167,166,108,0.3)" : fp.bg,
                  border: `2px solid ${isSelected ? "#a7a66c" : fp.border}`,
                  borderRadius: isRound ? "50%" : table.shape === "square" ? "6px" : "8px",
                  color: isSelected ? "#a7a66c" : fp.text,
                  opacity: isOccupied ? 0.7 : 1,
                }}
              >
                <span className="text-[clamp(7px,1.1vw,13px)] font-extrabold leading-tight">{table.number}</span>
                <span className="text-[clamp(5px,0.7vw,8px)] opacity-60 leading-none">{table.capacity}p</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedTable && (
        <div className="shrink-0 p-2.5 bg-[#a7a66c]/10 rounded-xl border border-[#a7a66c]/30">
          <p className="text-xs font-bold text-[#a7a66c] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Table {selectedTable.number}
          </p>
          {selectedTable.name && (
            <p className="text-[10px] text-[#7b7b6f] mt-0.5">{selectedTable.name}</p>
          )}
          <p className="text-[10px] text-[#7b7b6f]">{selectedTable.capacity} seats</p>
        </div>
      )}
    </div>
  );
}

function showToast(
  setFn: (v: { msg: string; type: "success" | "error" } | null) => void,
  msg: string,
  type: "success" | "error",
) {
  setFn({ msg, type });
  setTimeout(() => setFn(null), 3_000);
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{time}</span>;
}

// ── Numpad ────────────────────────────────────────────────────────────────────
const NUMPAD_KEYS = ["7","8","9","4","5","6","1","2","3",".","0","⌫"];

function Numpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {NUMPAD_KEYS.map((k) => (
        <button
          key={k}
          onClick={() => onKey(k)}
          className={`py-3.5 rounded-xl text-lg font-extrabold transition-all active:scale-95 select-none ${
            k === "⌫"
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
              : "bg-[#f7f7f6] dark:bg-[#32312a] text-[#151513] dark:text-white hover:bg-[#e2e2df] dark:hover:bg-[#3a3930]"
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ── Main POS page ─────────────────────────────────────────────────────────────
export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Cash register state
  const [payMethod, setPayMethod] = useState<PayMethod>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountIsPercent, setDiscountIsPercent] = useState(true);
  const [tipValue, setTipValue] = useState("");
  const [tipIsPercent, setTipIsPercent] = useState(true);

  // Pay READY order modal
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [payingOrder, setPayingOrder] = useState<ReadyOrder | null>(null);
  const [payingSubmitting, setPayingSubmitting] = useState(false);
  const [payModalCashInput, setPayModalCashInput] = useState("");
  const [payModalMethod, setPayModalMethod] = useState<PayMethod>("CASH");

  // Receipt / check modal
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Date for receipt header
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-GB"));
  }, []);

  // ── Cart persistence (survive page refresh) ────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_cart");
      if (saved) setCart(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
    } catch { /* ignore */ }
  }, [cart]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadShift = useCallback(() => {
    shiftsApi.current(BRANCH_ID)
      .then((res) => setShiftOpen(res.data.open))
      .catch(() => setShiftOpen(false));
  }, []);

  const loadTables = useCallback(() => {
    tablesApi.list(BRANCH_ID).then((res) => setTables(res.data)).catch(console.error);
  }, []);

  const loadReadyOrders = useCallback(() => {
    ordersApi.list(BRANCH_ID, { status: "READY" })
      .then((res) => setReadyOrders(res.data.results ?? res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadShift();
    api.get(`/catalog/branches/${BRANCH_ID}/menu/`)
      .then((res) => setCategories(res.data.results ?? res.data))
      .catch(console.error);
    loadTables();
    loadReadyOrders();
  }, [loadShift, loadTables, loadReadyOrders]);

  usePageRefresh(loadTables, 15_000);
  usePageRefresh(loadReadyOrders, 10_000);
  usePageRefresh(loadShift, 60_000);

  // ── Computed values ─────────────────────────────────────────────────────────
  const visibleItems = useMemo(() => {
    const q = search.toLowerCase();
    return categories
      .filter((c) => activeCategory === null || c.id === activeCategory)
      .flatMap((c) => c.items)
      .filter((item) => !q || item.name.toLowerCase().includes(q));
  }, [categories, activeCategory, search]);

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const discountAmount = useMemo(() => {
    const v = parseFloat(discountValue) || 0;
    if (v <= 0) return 0;
    return discountIsPercent ? subtotal * (v / 100) : Math.min(v, subtotal);
  }, [discountValue, discountIsPercent, subtotal]);

  const tipAmount = useMemo(() => {
    const v = parseFloat(tipValue) || 0;
    if (v <= 0) return 0;
    const afterDiscount = subtotal - discountAmount;
    return tipIsPercent ? afterDiscount * (v / 100) : v;
  }, [tipValue, tipIsPercent, subtotal, discountAmount]);

  const total = subtotal - discountAmount + tipAmount;
  const cashReceived = parseFloat(cashInput) || 0;
  const change = Math.max(cashReceived - total, 0);

  // ── Cart helpers ────────────────────────────────────────────────────────────
  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id && !c.variantId);
      if (existing)
        return prev.map((c) =>
          c.menuItemId === item.id && !c.variantId ? { ...c, qty: c.qty + 1 } : c,
        );
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), qty: 1, notes: "" }];
    });
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.menuItemId !== menuItemId) return [c];
        const newQty = c.qty + delta;
        return newQty <= 0 ? [] : [{ ...c, qty: newQty }];
      }),
    );
  }

  // ── Numpad handler for cash input ───────────────────────────────────────────
  function handleNumpadKey(k: string) {
    setCashInput((prev) => {
      if (k === "⌫") return prev.slice(0, -1);
      if (k === "." && prev.includes(".")) return prev;
      if (prev === "0" && k !== ".") return k;
      return prev + k;
    });
  }

  function handlePayModalNumpadKey(k: string) {
    setPayModalCashInput((prev) => {
      if (k === "⌫") return prev.slice(0, -1);
      if (k === "." && prev.includes(".")) return prev;
      if (prev === "0" && k !== ".") return k;
      return prev + k;
    });
  }

  // ── Quick cash presets ──────────────────────────────────────────────────────
  function quickCashPresets(amt: number): number[] {
    const base = Math.ceil(amt);
    const options: number[] = [base];
    const roundings = [5, 10, 20, 50, 100];
    for (const r of roundings) {
      const rounded = Math.ceil(base / r) * r;
      if (rounded !== base && !options.includes(rounded)) options.push(rounded);
      if (options.length >= 4) break;
    }
    return options.slice(0, 4);
  }

  // ── Place order ─────────────────────────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!shiftOpen) return showToast(setToast, "No active shift. Open a shift first.", "error");
    if (cart.length === 0) return showToast(setToast, "Cart is empty.", "error");
    if (orderType === "DINE_IN" && !selectedTable)
      return showToast(setToast, "Select a table.", "error");
    if (orderType === "DELIVERY" && (!deliveryAddress || !customerPhone))
      return showToast(setToast, "Address and phone required for delivery.", "error");

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      branch_id: BRANCH_ID,
      order_type: orderType,
      notes,
      tip_amount: tipAmount > 0 ? parseFloat(tipAmount.toFixed(2)) : 0,
      discount_amount: discountAmount > 0 ? parseFloat(discountAmount.toFixed(2)) : 0,
      items: cart.map((c) => ({
        menu_item_id: c.menuItemId,
        quantity: c.qty,
        ...(c.variantId ? { variant_id: c.variantId } : {}),
        notes: c.notes,
      })),
    };
    if (orderType === "DINE_IN" && selectedTable) {
      payload.table_id = selectedTable.id;
      payload.table_number = selectedTable.number;
    }
    if (orderType === "DELIVERY") {
      payload.delivery_address = deliveryAddress;
      payload.customer_phone = customerPhone;
    }
    if (orderType === "TAKEAWAY" && customerPhone) {
      payload.customer_phone = customerPhone;
    }

    try {
      const res = await api.post("/orders/", payload);
      const orderId: string = res.data?.id ?? "—";
      loadTables();

      // Build and show receipt
      const now = new Date();
      setReceipt({
        orderId,
        orderType: orderType,
        tableLabel:
          orderType === "DINE_IN" && selectedTable
            ? `Table ${selectedTable.number}`
            : orderType === "TAKEAWAY"
            ? "Takeaway"
            : "Delivery",
        items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
        subtotal,
        discountAmount,
        tipAmount,
        total,
        dateStr: now.toLocaleDateString("en-GB"),
        timeStr: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        notes,
      });

      setCart([]);
      setSelectedTable(null);
      setNotes("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setCashInput("");
      setDiscountValue("");
      setTipValue("");
      showToast(setToast, "Order sent to kitchen!", "success");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string; shift?: string[] } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { shift?: string[] } } })?.response?.data?.shift?.[0] ??
        "Failed to place order.";
      showToast(setToast, detail, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Pay READY order ─────────────────────────────────────────────────────────
  async function handlePayOrder() {
    if (!payingOrder) return;
    setPayingSubmitting(true);
    try {
      await ordersApi.pay(payingOrder.id, payModalMethod);
      loadTables();
      loadReadyOrders();
      setPayingOrder(null);
      setPayModalCashInput("");
      showToast(setToast, "Payment complete!", "success");
    } catch {
      showToast(setToast, "Payment failed.", "error");
    } finally {
      setPayingSubmitting(false);
    }
  }

  // ── Open shift ──────────────────────────────────────────────────────────────
  async function handleOpenShift() {
    try {
      await shiftsApi.open(BRANCH_ID, 0);
      setShiftOpen(true);
      showToast(setToast, "Shift opened!", "success");
    } catch {
      showToast(setToast, "Failed to open shift.", "error");
    }
  }

  const payModalOrderTotal = payingOrder ? Number(payingOrder.total_amount) : 0;
  const payModalCash = parseFloat(payModalCashInput) || 0;
  const payModalChange = Math.max(payModalCash - payModalOrderTotal, 0);

  return (
    <RoleGuard allowedRoles={["OWNER", "BRANCH_MAN", "WAITER"]}>
      <div className="bg-[#f7f7f6] dark:bg-[#1c1b16] text-[#151513] dark:text-white min-h-screen flex flex-col">

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#25241e]/90 backdrop-blur-md border-b border-[#e2e2df] dark:border-[#3a3930] px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#a7a66c] text-2xl">point_of_sale</span>
            <h1 className="text-base font-extrabold">Cash Register</h1>
            <span className="hidden sm:block text-sm text-[#7b7b6f] font-mono ml-2">
              <LiveClock />
            </span>
          </div>

          {/* Shift badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            shiftOpen === null
              ? "bg-gray-100 text-gray-500"
              : shiftOpen
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            <span className={`size-2 rounded-full ${shiftOpen ? "bg-green-500 animate-pulse" : "bg-red-400"}`} />
            {shiftOpen === null ? "Checking…" : shiftOpen ? "Shift Open" : "No Shift"}
            {!shiftOpen && shiftOpen !== null && (
              <button onClick={handleOpenShift} className="ml-2 underline hover:no-underline">
                Open now
              </button>
            )}
          </div>

          {/* Order type */}
          <div className="flex gap-1">
            {ORDER_TYPES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => { setOrderType(key); setSelectedTable(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  orderType === key
                    ? "bg-[#a7a66c] text-white"
                    : "bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Ready orders indicator */}
          {readyOrders.length > 0 && (
            <button
              onClick={() => readyOrders[0] && setPayingOrder(readyOrders[0])}
              className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse hover:animate-none hover:bg-green-600 transition-colors"
            >
              <span className="material-symbols-outlined text-base">notifications_active</span>
              {readyOrders.length} ready
            </button>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT — Hall / Customer ── */}
          <div className="w-64 lg:w-72 shrink-0 border-r border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e] flex flex-col overflow-hidden">
            {orderType === "DINE_IN" ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <POSFloorPlan
                  tables={tables}
                  selectedTable={selectedTable}
                  onSelect={(t) => setSelectedTable(selectedTable?.id === t.id ? null : t)}
                />
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f]">Customer Info</p>
                <div>
                  <label className="text-[9px] font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Phone</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+992 900 000 000"
                    className="w-full px-2.5 py-2 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-xs text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                  />
                </div>
                {orderType === "DELIVERY" && (
                  <div>
                    <label className="text-[9px] font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Address *</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      placeholder="Street, building..."
                      className="w-full px-2.5 py-2 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-xs text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40 resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="p-3 border-t border-[#e2e2df] dark:border-[#3a3930] shrink-0">
              <label className="text-[9px] font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Allergies, requests..."
                className="w-full px-2.5 py-2 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-xs text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40 resize-none"
              />
            </div>
          </div>

          {/* ── CENTER — Menu ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + category pills */}
            <div className="bg-white dark:bg-[#25241e] border-b border-[#e2e2df] dark:border-[#3a3930] px-4 py-3 flex flex-col gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7b6f] text-xl">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search menu..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    activeCategory === null ? "bg-[#a7a66c] text-white" : "bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c]"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      activeCategory === c.id ? "bg-[#a7a66c] text-white" : "bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu items grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start">
              {visibleItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`relative flex flex-col bg-white dark:bg-[#25241e] rounded-xl border overflow-hidden shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] text-left ${
                      inCart ? "border-[#a7a66c]" : "border-[#e2e2df] dark:border-[#3a3930]"
                    }`}
                  >
                    <div className="aspect-square bg-[#a7a66c]/10 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={120}
                          height={120}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[#a7a66c] text-3xl">restaurant_menu</span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-[#151513] dark:text-white leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-xs font-extrabold text-[#a7a66c] mt-1">{Number(item.price).toFixed(2)}</p>
                    </div>
                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 bg-[#a7a66c] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                        {inCart.qty}
                      </div>
                    )}
                  </button>
                );
              })}
              {visibleItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-48 gap-3 text-[#7b7b6f]">
                  <span className="material-symbols-outlined text-4xl">search_off</span>
                  <p className="text-sm font-bold">No items found</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT — Cash Register ── */}
          <div className="w-80 xl:w-96 shrink-0 border-l border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e] flex flex-col overflow-y-auto">

            {/* Receipt header */}
            <div className="px-4 pt-4 pb-3 border-b border-dashed border-[#e2e2df] dark:border-[#3a3930]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Receipt</p>
                  <p className="font-extrabold text-sm text-[#151513] dark:text-white">
                    {orderType === "DINE_IN" && selectedTable
                      ? `Table ${selectedTable.number}`
                      : orderType === "TAKEAWAY"
                      ? "Takeaway"
                      : "Delivery"}
                  </p>
                  <p className="text-[10px] text-[#7b7b6f] mt-0.5 font-mono">
                    {dateStr} · <LiveClock />
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Receipt line items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 gap-2 text-[#7b7b6f]">
                  <span className="material-symbols-outlined text-4xl">receipt_long</span>
                  <p className="text-xs font-bold">No items added</p>
                </div>
              ) : (
                <div className="px-4 py-2 space-y-0">
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-2 py-2.5 border-b border-dashed border-[#e2e2df] dark:border-[#3a3930] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#151513] dark:text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-[#7b7b6f]">
                          {item.price.toFixed(2)} × {item.qty}
                        </p>
                      </div>
                      <p className="text-xs font-extrabold text-[#151513] dark:text-white shrink-0">
                        {(item.price * item.qty).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => updateQty(item.menuItemId, -1)}
                          className="size-5 rounded bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c] text-xs font-bold flex items-center justify-center"
                        >−</button>
                        <span className="w-4 text-center text-[10px] font-bold">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.menuItemId, 1)}
                          className="size-5 rounded bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c] text-xs font-bold flex items-center justify-center"
                        >+</button>
                        <button
                          onClick={() => removeFromCart(item.menuItemId)}
                          className="size-5 ml-0.5 text-[#7b7b6f] hover:text-red-500 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals + discount */}
            <div className="border-t border-[#e2e2df] dark:border-[#3a3930] px-4 pt-3 pb-2 space-y-1.5">
              <div className="flex justify-between text-xs text-[#7b7b6f]">
                <span>Subtotal</span>
                <span className="font-bold">{subtotal.toFixed(2)} TJS</span>
              </div>

              {/* Discount row */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7b7b6f] w-14 shrink-0">Discount</span>
                <button
                  onClick={() => setDiscountIsPercent((v) => !v)}
                  className="text-[10px] font-black text-[#a7a66c] border border-[#a7a66c]/40 px-1.5 py-0.5 rounded hover:bg-[#a7a66c]/10 transition-colors shrink-0"
                >
                  {discountIsPercent ? "%" : "TJS"}
                </button>
                <input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="w-16 px-2 py-0.5 rounded border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-xs text-right text-[#151513] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#a7a66c]/40"
                />
                {discountAmount > 0 && (
                  <span className="ml-auto text-xs font-bold text-red-500">
                    −{discountAmount.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Tip row */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7b7b6f] w-14 shrink-0">Tip</span>
                <button
                  onClick={() => setTipIsPercent((v) => !v)}
                  className="text-[10px] font-black text-green-600 border border-green-500/40 px-1.5 py-0.5 rounded hover:bg-green-500/10 transition-colors shrink-0"
                >
                  {tipIsPercent ? "%" : "TJS"}
                </button>
                {/* Quick tip % presets */}
                {tipIsPercent && (
                  <div className="flex gap-1">
                    {[5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setTipValue(tipValue === String(pct) ? "" : String(pct))}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black transition-colors ${
                          tipValue === String(pct)
                            ? "bg-green-500 text-white"
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="number"
                  min={0}
                  value={tipValue}
                  onChange={(e) => setTipValue(e.target.value)}
                  placeholder="0"
                  className="w-14 ml-auto px-2 py-0.5 rounded border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-xs text-right text-[#151513] dark:text-white focus:outline-none focus:ring-1 focus:ring-green-500/40"
                />
                {tipAmount > 0 && (
                  <span className="text-xs font-bold text-green-600 shrink-0">
                    +{tipAmount.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-[#e2e2df] dark:border-[#3a3930]">
                <span className="text-sm font-black uppercase tracking-wide">Total</span>
                <span className="text-2xl font-black text-[#a7a66c]">{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="px-4 pt-2 pb-3 border-t border-[#e2e2df] dark:border-[#3a3930]">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] mb-2">Payment</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["CASH", "CARD", "QR"] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      payMethod === m
                        ? "border-[#a7a66c] bg-[#a7a66c]/10 text-[#a7a66c]"
                        : "border-[#e2e2df] dark:border-[#3a3930] text-[#7b7b6f] hover:border-[#a7a66c]/50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {m === "CASH" ? "payments" : m === "CARD" ? "credit_card" : "qr_code"}
                    </span>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash numpad (shown when CASH) */}
            {payMethod === "CASH" && (
              <div className="px-4 pb-3 border-t border-[#e2e2df] dark:border-[#3a3930] pt-3">
                {/* Cash received display */}
                <div className="bg-[#f7f7f6] dark:bg-[#32312a] rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Cash received</span>
                  <span className="text-xl font-black text-[#151513] dark:text-white font-mono tabular-nums">
                    {cashInput || "0"} <span className="text-sm font-bold text-[#7b7b6f]">TJS</span>
                  </span>
                </div>

                {/* Quick presets */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {quickCashPresets(total).map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashInput(String(amt))}
                      className="py-2 rounded-lg text-[11px] font-black bg-[#a7a66c]/10 text-[#a7a66c] hover:bg-[#a7a66c]/20 transition-colors"
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                <Numpad onKey={handleNumpadKey} />

                {/* Change */}
                {cashReceived > 0 && (
                  <div className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${
                    cashReceived >= total
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}>
                    <span className={`text-xs font-black uppercase tracking-wide ${cashReceived >= total ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                      {cashReceived >= total ? "Change" : "Shortfall"}
                    </span>
                    <span className={`text-xl font-black font-mono tabular-nums ${cashReceived >= total ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                      {cashReceived >= total ? change.toFixed(2) : (total - cashReceived).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Place order button */}
            <div className="px-4 pb-4 pt-2 sticky bottom-0 bg-white dark:bg-[#25241e] border-t border-[#e2e2df] dark:border-[#3a3930]">
              <button
                onClick={handlePlaceOrder}
                disabled={
                  submitting ||
                  cart.length === 0 ||
                  !shiftOpen ||
                  (payMethod === "CASH" && cashReceived > 0 && cashReceived < total)
                }
                className="w-full py-4 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white font-extrabold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                {submitting ? "Sending…" : "Send to Kitchen"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Pay READY order modal ── */}
        {payingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setPayingOrder(null)} />
            <div className="relative bg-white dark:bg-[#25241e] rounded-2xl w-full max-w-sm border border-[#e2e2df] dark:border-[#3a3930] shadow-2xl overflow-hidden">
              {/* Modal header */}
              <div className="px-5 py-4 border-b border-[#e2e2df] dark:border-[#3a3930] flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-base text-[#151513] dark:text-white">
                    {payingOrder.order_type === "DINE_IN"
                      ? `Table ${payingOrder.table_number}`
                      : payingOrder.order_type}
                  </p>
                  <p className="text-xs text-[#7b7b6f] mt-0.5">#{payingOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setPayingOrder(null)}
                  className="size-8 flex items-center justify-center rounded-full hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors text-[#7b7b6f]"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Order total */}
                <div className="flex justify-between items-center bg-[#f7f7f6] dark:bg-[#32312a] rounded-xl px-4 py-3">
                  <span className="text-sm font-bold text-[#7b7b6f]">Total</span>
                  <span className="text-2xl font-black text-[#a7a66c]">
                    {payModalOrderTotal.toFixed(2)} <span className="text-sm">TJS</span>
                  </span>
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "CARD", "QR"] as PayMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayModalMethod(m)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                        payModalMethod === m
                          ? "border-[#a7a66c] bg-[#a7a66c]/10 text-[#a7a66c]"
                          : "border-[#e2e2df] dark:border-[#3a3930] text-[#7b7b6f] hover:border-[#a7a66c]/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {m === "CASH" ? "payments" : m === "CARD" ? "credit_card" : "qr_code"}
                      </span>
                      {m}
                    </button>
                  ))}
                </div>

                {/* Cash numpad in modal */}
                {payModalMethod === "CASH" && (
                  <div className="space-y-3">
                    <div className="bg-[#f7f7f6] dark:bg-[#32312a] rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Cash received</span>
                      <span className="text-xl font-black text-[#151513] dark:text-white font-mono tabular-nums">
                        {payModalCashInput || "0"} TJS
                      </span>
                    </div>

                    {/* Quick presets */}
                    <div className="grid grid-cols-4 gap-1">
                      {quickCashPresets(payModalOrderTotal).map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setPayModalCashInput(String(amt))}
                          className="py-2 rounded-lg text-[11px] font-black bg-[#a7a66c]/10 text-[#a7a66c] hover:bg-[#a7a66c]/20"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>

                    <Numpad onKey={handlePayModalNumpadKey} />

                    {payModalCash > 0 && (
                      <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                        payModalCash >= payModalOrderTotal
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}>
                        <span className={`text-xs font-black uppercase ${payModalCash >= payModalOrderTotal ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                          {payModalCash >= payModalOrderTotal ? "Change" : "Shortfall"}
                        </span>
                        <span className={`text-xl font-black font-mono ${payModalCash >= payModalOrderTotal ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                          {payModalCash >= payModalOrderTotal
                            ? payModalChange.toFixed(2)
                            : (payModalOrderTotal - payModalCash).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Ready orders list for quick switching */}
                {readyOrders.length > 1 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] mb-2">Other Ready Orders</p>
                    <div className="space-y-1">
                      {readyOrders.filter((o) => o.id !== payingOrder.id).slice(0, 3).map((o) => (
                        <button
                          key={o.id}
                          onClick={() => { setPayingOrder(o); setPayModalCashInput(""); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#f7f7f6] dark:bg-[#32312a] hover:bg-[#e2e2df] dark:hover:bg-[#3a3930] transition-colors text-left"
                        >
                          <span className="text-xs font-bold text-[#151513] dark:text-white">
                            {o.order_type === "DINE_IN" ? `Table ${o.table_number}` : o.order_type}
                          </span>
                          <span className="text-xs font-bold text-[#a7a66c]">{Number(o.total_amount).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={handlePayOrder}
                  disabled={
                    payingSubmitting ||
                    (payModalMethod === "CASH" && payModalCash > 0 && payModalCash < payModalOrderTotal)
                  }
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-extrabold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  {payingSubmitting ? "Processing…" : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Receipt / Check modal ── */}
        {receipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setReceipt(null)} />
            <div className="relative bg-white dark:bg-[#25241e] rounded-2xl w-full max-w-sm border border-[#e2e2df] dark:border-[#3a3930] shadow-2xl overflow-hidden">
              {/* Print-friendly receipt area */}
              <div id="receipt-print" className="px-6 py-5">
                {/* Header */}
                <div className="text-center border-b border-dashed border-[#e2e2df] dark:border-[#3a3930] pb-4 mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Order Receipt</p>
                  <p className="text-2xl font-black text-[#151513] dark:text-white mt-1">{receipt.tableLabel}</p>
                  <p className="text-xs text-[#7b7b6f] mt-1 font-mono">
                    #{receipt.orderId.slice(0, 8).toUpperCase()} · {receipt.dateStr} {receipt.timeStr}
                  </p>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {receipt.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[#a7a66c] font-extrabold text-xs">{item.qty}×</span>
                        <span className="font-medium text-[#151513] dark:text-white">{item.name}</span>
                      </div>
                      <span className="font-bold text-[#151513] dark:text-white tabular-nums">
                        {(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-[#e2e2df] dark:border-[#3a3930] pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-[#7b7b6f]">
                    <span>Subtotal</span>
                    <span className="font-bold tabular-nums">{receipt.subtotal.toFixed(2)}</span>
                  </div>
                  {receipt.discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Discount</span>
                      <span className="font-bold tabular-nums">−{receipt.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {receipt.tipAmount > 0 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Tip / Gratuity</span>
                      <span className="font-bold tabular-nums">+{receipt.tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-[#e2e2df] dark:border-[#3a3930]">
                    <span className="font-black uppercase tracking-wide text-sm">Total</span>
                    <span className="text-2xl font-black text-[#a7a66c] tabular-nums">
                      {receipt.total.toFixed(2)} <span className="text-sm">TJS</span>
                    </span>
                  </div>
                </div>

                {receipt.notes && (
                  <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Note: {receipt.notes}
                  </div>
                )}

                <p className="text-center text-[10px] text-[#7b7b6f] mt-4 italic">
                  Order sent to kitchen — payment on completion
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-6 pb-5">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-[#e2e2df] dark:border-[#3a3930] rounded-xl text-xs font-bold text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Print
                </button>
                <button
                  onClick={() => setReceipt(null)}
                  className="flex-[2] py-2.5 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-bold z-50 transition-all ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}>
            {toast.msg}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
