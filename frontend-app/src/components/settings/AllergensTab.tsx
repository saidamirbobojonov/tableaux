"use client";

import { useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";
import { EmptyState } from "./CategoriesTab";

interface Allergen { id: number; name: string; }

export default function AllergensTab() {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  function fetch() {
    settingsApi.getAllergens()
      .then((res) => setAllergens(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetch(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await settingsApi.createAllergen({ name: newName.trim() });
      setNewName("");
      fetch();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return;
    try {
      await settingsApi.updateAllergen(id, { name: editName.trim() });
      setEditingId(null);
      fetch();
    } catch { /* ignore */ }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this allergen?")) return;
    try {
      await settingsApi.deleteAllergen(id);
      fetch();
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#151513] dark:text-white">Allergens</h2>
          <p className="text-sm text-[#7b7b6f] mt-0.5">{allergens.length} total</p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Gluten, Nuts, Dairy..."
          className="input flex-1 max-w-sm"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="flex items-center gap-2 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add
        </button>
      </form>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>
      ) : allergens.length === 0 ? (
        <EmptyState icon="no_food" text="No allergens yet" />
      ) : (
        <div className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden">
          <div className="divide-y divide-[#e2e2df] dark:divide-[#3a3930]">
            {allergens.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                <span className="material-symbols-outlined text-[#a7a66c] text-xl">warning</span>

                {editingId === a.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(a.id); if (e.key === "Escape") setEditingId(null); }}
                    className="input flex-1"
                  />
                ) : (
                  <span className="flex-1 font-bold text-[#151513] dark:text-white text-sm">{a.name}</span>
                )}

                {editingId === a.id ? (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleUpdate(a.id)} className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                      <span className="material-symbols-outlined text-xl">check</span>
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] text-[#7b7b6f] transition-colors">
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(a.id); setEditName(a.name); }} className="p-2 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c] transition-colors">
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#7b7b6f] hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
