"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { settingsApi } from "@/lib/api";
import { Modal, ModalActions, EmptyState, ErrorBox } from "./CategoriesTab";

interface Category { id: string; name: string; }
interface Allergen { id: string; name: string; }
interface ModifierGroup { id: number; name: string; }
interface Variant { id?: string; name: string; price_override: string; }

interface MenuItem {
  id: string;
  name: string;
  description: string;
  base_price: string;
  category: string;
  category_name: string;
  status: string;
  status_display: string;
  image: string | null;
  slug: string;
  allergen_ids: string[];
  modifier_group_ids: number[];
  variants: Variant[];
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const EMPTY_FORM = {
  name: "", description: "", base_price: "", category: "",
  status: "DRAFT", image: null as string | null,
  allergen_ids: [] as string[], modifier_group_ids: [] as number[],
  variants: [] as Variant[],
};

export default function MenuItemsTab() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("ALL");
  const imgRef = useRef<HTMLInputElement>(null);

  function fetchAll() {
    Promise.all([
      settingsApi.getItems(),
      settingsApi.getCategories(),
      settingsApi.getAllergens(),
      settingsApi.getModifierGroups(),
    ]).then(([items, cats, allergens, mods]) => {
      setItems(items.data);
      setCategories(cats.data);
      setAllergens(allergens.data);
      setModifierGroups(mods.data);
    }).catch(console.error).finally(() => setLoading(false));
  }
  useEffect(() => { fetchAll(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: categories[0]?.id ?? "" });
    setImageFile(null);
    setError(null);
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name, description: item.description, base_price: item.base_price,
      category: item.category, status: item.status, image: item.image,
      allergen_ids: item.allergen_ids ?? [],
      modifier_group_ids: item.modifier_group_ids ?? [],
      variants: item.variants ?? [],
    });
    setImageFile(null);
    setError(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("base_price", form.base_price);
    fd.append("category", form.category);
    fd.append("status", form.status);
    form.allergen_ids.forEach((id) => fd.append("allergen_ids", id));
    form.modifier_group_ids.forEach((id) => fd.append("modifier_group_ids", String(id)));
    // Variants as JSON
    fd.append("variants", JSON.stringify(form.variants));
    if (imageFile) fd.append("image", imageFile);
    try {
      if (editing) {
        await settingsApi.updateItem(editing.id, fd);
      } else {
        await settingsApi.createItem(fd);
      }
      setShowModal(false);
      fetchAll();
    } catch {
      setError("Failed to save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this menu item?")) return;
    try {
      await settingsApi.deleteItem(id);
      fetchAll();
    } catch { /* ignore */ }
  }

  function toggleId<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: "", price_override: "" }] }));
  }
  function updateVariant(i: number, field: keyof Variant, val: string) {
    setForm((f) => {
      const v = [...f.variants];
      v[i] = { ...v[i], [field]: val };
      return { ...f, variants: v };
    });
  }
  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  const filtered = filterCat === "ALL" ? items : items.filter((i) => i.category === filterCat);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#151513] dark:text-white">Menu Items</h2>
          <p className="text-sm text-[#7b7b6f] mt-0.5">{items.length} items</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto mb-5">
        <Chip active={filterCat === "ALL"} onClick={() => setFilterCat("ALL")}>All</Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={filterCat === c.id} onClick={() => setFilterCat(c.id)}>{c.name}</Chip>
        ))}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="restaurant_menu" text="No menu items" />
      ) : (
        <div className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden">
          <div className="divide-y divide-[#e2e2df] dark:divide-[#3a3930]">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                <div className="size-12 rounded-xl overflow-hidden bg-[#a7a66c]/10 flex items-center justify-center shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#a7a66c]">restaurant_menu</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#151513] dark:text-white text-sm">{item.name}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[item.status] ?? ""}`}>
                      {item.status_display}
                    </span>
                  </div>
                  <p className="text-xs text-[#7b7b6f]">{item.category_name} · {Number(item.base_price).toFixed(2)} TJS</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c] transition-colors">
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#7b7b6f] hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Item" : "Add Menu Item"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorBox msg={error} />}

            {/* Image */}
            <div>
              <label className="label">Photo</label>
              <div className="size-20 rounded-xl overflow-hidden bg-[#a7a66c]/10 flex items-center justify-center cursor-pointer border-2 border-dashed border-[#e2e2df] dark:border-[#3a3930] hover:border-[#a7a66c] transition-colors"
                onClick={() => imgRef.current?.click()}>
                {imageFile ? (
                  <Image src={URL.createObjectURL(imageFile)} alt="" width={80} height={80} className="w-full h-full object-cover" />
                ) : form.image ? (
                  <Image src={form.image} alt="" width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[#a7a66c] text-2xl">add_photo_alternate</span>
                )}
              </div>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>

            <div>
              <label className="label">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Base Price *</label>
                <input required type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="input w-full" />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input w-full">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Category *</label>
              <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input w-full">
                <option value="">— Select —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Variants</label>
                <button type="button" onClick={addVariant} className="text-xs text-[#a7a66c] font-bold hover:underline">+ Add</button>
              </div>
              {form.variants.map((v, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input placeholder="Name (e.g. Large)" value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)} className="input flex-1 text-sm" />
                  <input placeholder="Price" type="number" step="0.01" value={v.price_override} onChange={(e) => updateVariant(i, "price_override", e.target.value)} className="input w-24 text-sm" />
                  <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Allergens */}
            {allergens.length > 0 && (
              <div>
                <label className="label">Allergens</label>
                <div className="flex flex-wrap gap-2">
                  {allergens.map((a) => (
                    <button
                      key={a.id} type="button"
                      onClick={() => setForm((f) => ({ ...f, allergen_ids: toggleId(f.allergen_ids, a.id) }))}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                        form.allergen_ids.includes(a.id)
                          ? "bg-[#a7a66c] text-white border-[#a7a66c]"
                          : "border-[#e2e2df] dark:border-[#3a3930] text-[#7b7b6f]"
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modifier Groups */}
            {modifierGroups.length > 0 && (
              <div>
                <label className="label">Modifier Groups</label>
                <div className="flex flex-wrap gap-2">
                  {modifierGroups.map((g) => (
                    <button
                      key={g.id} type="button"
                      onClick={() => setForm((f) => ({ ...f, modifier_group_ids: toggleId(f.modifier_group_ids, g.id) }))}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                        form.modifier_group_ids.includes(g.id)
                          ? "bg-[#a7a66c] text-white border-[#a7a66c]"
                          : "border-[#e2e2df] dark:border-[#3a3930] text-[#7b7b6f]"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ModalActions saving={saving} onCancel={() => setShowModal(false)} label={editing ? "Save" : "Create"} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
        active ? "bg-[#a7a66c] text-white" : "bg-white dark:bg-[#25241e] border border-[#e2e2df] dark:border-[#3a3930] text-[#7b7b6f] hover:border-[#a7a66c] hover:text-[#a7a66c]"
      }`}
    >
      {children}
    </button>
  );
}
