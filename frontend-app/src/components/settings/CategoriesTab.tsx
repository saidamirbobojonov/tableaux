"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { settingsApi } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  image: string | null;
  parent: string | null;
  item_count: number;
}

const EMPTY_FORM = { name: "", description: "", sort_order: 0, image: null as string | null };

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  function fetch() {
    settingsApi.getCategories()
      .then((res) => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetch(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setError(null);
    setShowModal(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description, sort_order: cat.sort_order, image: cat.image });
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
    fd.append("sort_order", String(form.sort_order));
    if (imageFile) fd.append("image", imageFile);
    try {
      if (editing) {
        await settingsApi.updateCategory(editing.id, fd);
      } else {
        await settingsApi.createCategory(fd);
      }
      setShowModal(false);
      fetch();
    } catch {
      setError("Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Items in it will be unlinked.")) return;
    try {
      await settingsApi.deleteCategory(id);
      fetch();
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#151513] dark:text-white">Categories</h2>
          <p className="text-sm text-[#7b7b6f] mt-0.5">{categories.length} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>
      ) : categories.length === 0 ? (
        <EmptyState icon="category" text="No categories yet" />
      ) : (
        <div className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden">
          <div className="divide-y divide-[#e2e2df] dark:divide-[#3a3930]">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-4">
                <div className="size-12 rounded-xl overflow-hidden bg-[#a7a66c]/10 flex items-center justify-center shrink-0">
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#a7a66c]">category</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#151513] dark:text-white text-sm">{cat.name}</p>
                  <p className="text-xs text-[#7b7b6f]">{cat.item_count} items · order {cat.sort_order}</p>
                  {cat.description && <p className="text-xs text-[#7b7b6f] truncate mt-0.5">{cat.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] text-[#7b7b6f] hover:text-[#a7a66c] transition-colors">
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#7b7b6f] hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Category" : "Add Category"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ErrorBox msg={error} />}
            {/* Image */}
            <div>
              <label className="label">Image</label>
              <div
                className="size-20 rounded-xl overflow-hidden bg-[#a7a66c]/10 flex items-center justify-center cursor-pointer border-2 border-dashed border-[#e2e2df] dark:border-[#3a3930] hover:border-[#a7a66c] transition-colors"
                onClick={() => imgRef.current?.click()}
              >
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
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="input w-24" />
            </div>
            <ModalActions saving={saving} onCancel={() => setShowModal(false)} label={editing ? "Save" : "Create"} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---- Shared helpers ----
export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#7b7b6f]">
      <span className="material-symbols-outlined text-5xl">{icon}</span>
      <p className="font-bold">{text}</p>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#25241e] rounded-2xl shadow-2xl w-full max-w-md border border-[#e2e2df] dark:border-[#3a3930] max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-[#e2e2df] dark:border-[#3a3930] flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#151513] dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors">
            <span className="material-symbols-outlined text-[#7b7b6f]">close</span>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ModalActions({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] text-sm font-bold text-[#7b7b6f] hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="flex-[2] py-3 rounded-xl bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60">
        {saving ? "Saving..." : label}
      </button>
    </div>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  );
}
