"use client";

import { useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";
import { Modal, ModalActions, EmptyState, ErrorBox } from "./CategoriesTab";

interface ModifierEntry { id?: number; name: string; price: string; }
interface ModifierGroup { id: number; name: string; allow_multiple: boolean; modifiers: ModifierEntry[]; }

const EMPTY_FORM = { name: "", allow_multiple: true, modifiers: [] as ModifierEntry[] };

export default function ModifiersTab() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  function fetch() {
    settingsApi.getModifierGroups()
      .then((res) => setGroups(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetch(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  }

  function openEdit(g: ModifierGroup) {
    setEditing(g);
    setForm({ name: g.name, allow_multiple: g.allow_multiple, modifiers: g.modifiers.map((m) => ({ ...m, price: String(m.price) })) });
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      allow_multiple: form.allow_multiple,
      modifiers: form.modifiers.map((m) => ({ ...(m.id ? { id: m.id } : {}), name: m.name, price: m.price || "0" })),
    };
    try {
      if (editing) {
        await settingsApi.updateModifierGroup(editing.id, payload);
      } else {
        await settingsApi.createModifierGroup(payload);
      }
      setShowModal(false);
      fetch();
    } catch {
      setError("Failed to save modifier group.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this modifier group?")) return;
    try {
      await settingsApi.deleteModifierGroup(id);
      fetch();
    } catch { /* ignore */ }
  }

  function addModifier() {
    setForm((f) => ({ ...f, modifiers: [...f.modifiers, { name: "", price: "0" }] }));
  }

  function updateModifier(i: number, field: keyof ModifierEntry, val: string) {
    setForm((f) => {
      const mods = [...f.modifiers];
      mods[i] = { ...mods[i], [field]: val };
      return { ...f, modifiers: mods };
    });
  }

  function removeModifier(i: number) {
    setForm((f) => ({ ...f, modifiers: f.modifiers.filter((_, idx) => idx !== i) }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#151513] dark:text-white">Modifier Groups</h2>
          <p className="text-sm text-[#7b7b6f] mt-0.5">{groups.length} groups</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Group
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>
      ) : groups.length === 0 ? (
        <EmptyState icon="tune" text="No modifier groups yet" />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <button
                  onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <span className="material-symbols-outlined text-[#a7a66c] text-xl">tune</span>
                  <div>
                    <p className="font-bold text-[#151513] dark:text-white text-sm">{g.name}</p>
                    <p className="text-xs text-[#7b7b6f]">
                      {g.modifiers.length} options · {g.allow_multiple ? "Multiple choice" : "Single choice"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#7b7b6f] text-xl ml-auto">
                    {expanded === g.id ? "expand_less" : "expand_more"}
                  </span>
                </button>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(g)} className="p-2 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c] transition-colors">
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#7b7b6f] hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>

              {/* Modifiers list */}
              {expanded === g.id && g.modifiers.length > 0 && (
                <div className="border-t border-[#e2e2df] dark:border-[#3a3930] divide-y divide-[#e2e2df] dark:divide-[#3a3930]">
                  {g.modifiers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3 bg-[#f7f7f6] dark:bg-[#32312a]/30">
                      <span className="material-symbols-outlined text-[#7b7b6f] text-sm">subdirectory_arrow_right</span>
                      <span className="flex-1 text-sm text-[#151513] dark:text-white">{m.name}</span>
                      <span className="text-sm font-bold text-[#a7a66c]">
                        {Number(m.price) > 0 ? `+${Number(m.price).toFixed(2)}` : "Free"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Modifier Group" : "Add Modifier Group"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorBox msg={error} />}

            <div>
              <label className="label">Group Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sauce, Size, Extras" className="input w-full" />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, allow_multiple: !f.allow_multiple }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.allow_multiple ? "bg-[#a7a66c]" : "bg-[#e2e2df] dark:bg-[#3a3930]"}`}
              >
                <span className={`absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform ${form.allow_multiple ? "left-5" : "left-0.5"}`} />
              </button>
              <span className="text-sm text-[#151513] dark:text-white font-medium">Allow multiple selections</span>
            </div>

            {/* Modifiers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Options</label>
                <button type="button" onClick={addModifier} className="text-xs text-[#a7a66c] font-bold hover:underline">+ Add option</button>
              </div>
              {form.modifiers.length === 0 && (
                <p className="text-xs text-[#7b7b6f] italic">No options yet — click &quot;+ Add option&quot;</p>
              )}
              {form.modifiers.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    placeholder="Option name"
                    value={m.name}
                    onChange={(e) => updateModifier(i, "name", e.target.value)}
                    className="input flex-1 text-sm"
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={m.price}
                    onChange={(e) => updateModifier(i, "price", e.target.value)}
                    className="input w-24 text-sm"
                  />
                  <button type="button" onClick={() => removeModifier(i)} className="text-red-400 hover:text-red-600 p-1">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              ))}
            </div>

            <ModalActions saving={saving} onCancel={() => setShowModal(false)} label={editing ? "Save" : "Create"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
