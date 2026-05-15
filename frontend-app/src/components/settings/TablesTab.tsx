"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tablesApi } from "@/lib/api";
import type { Table, TableShape } from "@/types";
import { Modal, ModalActions, EmptyState, ErrorBox } from "./CategoriesTab";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OCCUPIED:  "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  RESERVED:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

// Floor-plan status fill colours (Tailwind inline-style safe)
const FP_STATUS: Record<string, { bg: string; border: string; text: string }> = {
  AVAILABLE: { bg: "rgba(134,239,172,0.25)",  border: "#16a34a", text: "#15803d" },
  OCCUPIED:  { bg: "rgba(252,165,165,0.30)",  border: "#dc2626", text: "#b91c1c" },
  RESERVED:  { bg: "rgba(216,180,254,0.30)",  border: "#9333ea", text: "#7e22ce" },
};

const EMPTY_FORM = {
  number: "", name: "", capacity: 4,
  pos_x: 10, pos_y: 10, width: 9, height: 12,
  shape: "rect" as TableShape,
};

type ViewMode = "list" | "floorplan";

// ── Floor-plan component ──────────────────────────────────────────────────────
function FloorPlan({
  tables,
  onMove,
  onEdit,
  onDelete,
}: {
  tables: Table[];
  onMove: (id: string, pos_x: number, pos_y: number) => void;
  onEdit: (t: Table) => void;
  onDelete: (id: Table) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startPx: number;
    startPy: number;
  } | null>(null);

  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});

  // Sync localPos when tables change (e.g. after server save)
  useEffect(() => {
    setLocalPos((prev) => {
      const next = { ...prev };
      tables.forEach((t) => {
        if (!next[t.id]) next[t.id] = { x: t.pos_x, y: t.pos_y };
      });
      // remove stale
      Object.keys(next).forEach((k) => {
        if (!tables.find((t) => t.id === k)) delete next[k];
      });
      return next;
    });
  }, [tables]);

  function onMouseDown(e: React.MouseEvent, table: Table) {
    e.preventDefault();
    dragging.current = {
      id: table.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPx: localPos[table.id]?.x ?? table.pos_x,
      startPy: localPos[table.id]?.y ?? table.pos_y,
    };
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const { id, startMouseX, startMouseY, startPx, startPy } = dragging.current;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - startMouseX) / rect.width) * 100;
      const dy = ((e.clientY - startMouseY) / rect.height) * 100;
      const table = tables.find((t) => t.id === id);
      const newX = Math.max(0, Math.min(100 - (table?.width ?? 9), startPx + dx));
      const newY = Math.max(0, Math.min(100 - (table?.height ?? 12), startPy + dy));
      setLocalPos((prev) => ({ ...prev, [id]: { x: newX, y: newY } }));
    }

    function onMouseUp() {
      if (!dragging.current) return;
      const { id } = dragging.current;
      const pos = localPos[id];
      if (pos) onMove(id, pos.x, pos.y);
      dragging.current = null;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, localPos]);

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-[#7b7b6f]">
        {Object.entries(FP_STATUS).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border" style={{ background: c.bg, borderColor: c.border }} />
            {s.toLowerCase()}
          </span>
        ))}
        <span className="ml-auto italic opacity-70">Drag tables to reposition</span>
      </div>

      {/* Hall canvas */}
      <div
        ref={containerRef}
        className="relative w-full bg-[#f7f7f6] dark:bg-[#1c1b16] border-2 border-dashed border-[#c8c8c0] dark:border-[#3a3930] rounded-2xl overflow-hidden select-none"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="5%" height="5%" patternUnits="objectBoundingBox">
              <path d="M 0 0 L 0 1 M 0 0 L 1 0" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Entrance hint */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#7b7b6f] opacity-50">Entrance</span>
          <div className="w-16 h-1 bg-[#7b7b6f] rounded-full opacity-30" />
        </div>

        {tables.filter((t) => t.is_active).map((table) => {
          const pos = localPos[table.id] ?? { x: table.pos_x, y: table.pos_y };
          const fp = FP_STATUS[table.status] ?? FP_STATUS.AVAILABLE;
          const isRound = table.shape === "round";

          return (
            <div
              key={table.id}
              onMouseDown={(e) => onMouseDown(e, table)}
              className="absolute group cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-shadow hover:shadow-lg"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${table.width}%`,
                height: `${table.height}%`,
                background: fp.bg,
                border: `2px solid ${fp.border}`,
                borderRadius: isRound ? "50%" : table.shape === "square" ? "6px" : "8px",
                color: fp.text,
              }}
            >
              <span className="text-[clamp(8px,1.2vw,14px)] font-extrabold leading-tight">{table.number}</span>
              {table.name && (
                <span className="text-[clamp(6px,0.8vw,10px)] opacity-70 leading-none hidden group-hover:block">
                  {table.name}
                </span>
              )}
              <span className="text-[clamp(6px,0.8vw,9px)] opacity-60 leading-none">{table.capacity}p</span>

              {/* Action buttons (visible on hover) */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1 z-10">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onEdit(table); }}
                  className="size-6 bg-white dark:bg-[#25241e] border border-[#e2e2df] dark:border-[#3a3930] rounded-md flex items-center justify-center text-[#7b7b6f] hover:text-[#a7a66c] shadow"
                >
                  <span className="material-symbols-outlined text-[12px]">edit</span>
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onDelete(table); }}
                  className="size-6 bg-white dark:bg-[#25241e] border border-[#e2e2df] dark:border-[#3a3930] rounded-md flex items-center justify-center text-[#7b7b6f] hover:text-red-500 shadow"
                >
                  <span className="material-symbols-outlined text-[12px]">delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TablesTab() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("floorplan");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(() => {
    tablesApi.list(BRANCH_ID)
      .then((res) => setTables(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  function openCreate() {
    setEditing(null);
    // Stagger new table position based on count
    const offset = (tables.length % 8) * 12;
    setForm({ ...EMPTY_FORM, pos_x: 5 + offset, pos_y: 5 + (Math.floor(tables.length / 8) * 18) });
    setError(null);
    setShowModal(true);
  }

  function openEdit(t: Table) {
    setEditing(t);
    setForm({
      number: t.number, name: t.name, capacity: t.capacity,
      pos_x: t.pos_x, pos_y: t.pos_y, width: t.width, height: t.height,
      shape: t.shape,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await tablesApi.update(BRANCH_ID, editing.id, form);
      } else {
        await tablesApi.create(BRANCH_ID, form);
      }
      setShowModal(false);
      fetchTables();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { number?: string[] } } })?.response?.data?.number?.[0] ??
        "Failed to save table.";
      setError(detail);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(table: Table) {
    if (!confirm(`Delete Table ${table.number}?`)) return;
    try {
      await tablesApi.delete(BRANCH_ID, table.id);
      fetchTables();
    } catch { /* ignore */ }
  }

  async function handleMove(id: string, pos_x: number, pos_y: number) {
    try {
      await tablesApi.update(BRANCH_ID, id, { pos_x, pos_y });
      // optimistic — no full refetch needed
      setTables((prev) => prev.map((t) => t.id === id ? { ...t, pos_x, pos_y } : t));
    } catch { /* ignore silently */ }
  }

  const available = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupied  = tables.filter((t) => t.status === "OCCUPIED").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#151513] dark:text-white">Tables</h2>
          <p className="text-sm text-[#7b7b6f] mt-0.5">
            {tables.length} total · {available} available · {occupied} occupied
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#f7f7f6] dark:bg-[#32312a] rounded-xl p-1 border border-[#e2e2df] dark:border-[#3a3930]">
            {(["floorplan", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode
                    ? "bg-white dark:bg-[#25241e] text-[#151513] dark:text-white shadow-sm"
                    : "text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {mode === "floorplan" ? "grid_view" : "list"}
                </span>
                {mode === "floorplan" ? "Floor Plan" : "List"}
              </button>
            ))}
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Table
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>
      ) : tables.length === 0 ? (
        <EmptyState icon="table_bar" text="No tables configured yet" />
      ) : viewMode === "floorplan" ? (
        <FloorPlan
          tables={tables}
          onMove={handleMove}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        /* List view */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                table.status === "OCCUPIED"
                  ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
                  : table.status === "RESERVED"
                  ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10"
                  : "border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e]"
              }`}
            >
              <p className="text-3xl font-black text-[#151513] dark:text-white">{table.number}</p>
              {table.name && <p className="text-xs text-[#7b7b6f] mt-0.5 truncate">{table.name}</p>}
              <p className="text-xs text-[#7b7b6f] mt-0.5">{table.capacity} seats</p>
              <span className={`mt-2 inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_COLORS[table.status] ?? ""}`}>
                {table.status.toLowerCase()}
              </span>
              <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                <button
                  onClick={() => openEdit(table)}
                  className="p-1 rounded-lg text-[#7b7b6f] hover:text-[#a7a66c] hover:bg-[#a7a66c]/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(table)}
                  className="p-1 rounded-lg text-[#7b7b6f] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <Modal title={editing ? "Edit Table" : "Add Table"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorBox msg={error} />}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Table Number *</label>
                <input
                  required
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="1, 2, VIP1, A3…"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">Display Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Window, Bar, Terrace…"
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Seats</label>
                <input
                  type="number" min={1} max={50}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">Shape</label>
                <select
                  value={form.shape}
                  onChange={(e) => setForm({ ...form, shape: e.target.value as TableShape })}
                  className="input w-full"
                >
                  <option value="rect">Rectangle</option>
                  <option value="square">Square</option>
                  <option value="round">Round</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Size on floor plan (%)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#7b7b6f] uppercase tracking-wide">Width</label>
                  <input
                    type="number" min={4} max={40} step={0.5}
                    value={form.width}
                    onChange={(e) => setForm({ ...form, width: Number(e.target.value) })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#7b7b6f] uppercase tracking-wide">Height</label>
                  <input
                    type="number" min={4} max={40} step={0.5}
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            <ModalActions saving={saving} onCancel={() => setShowModal(false)} label={editing ? "Save" : "Create"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
