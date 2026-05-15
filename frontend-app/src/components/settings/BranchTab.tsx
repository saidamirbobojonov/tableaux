"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { settingsApi } from "@/lib/api";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";

const TIMEZONES = [
  "Asia/Dushanbe", "Asia/Tashkent", "Asia/Almaty", "Asia/Bishkek",
  "Asia/Kabul", "Europe/Moscow", "UTC",
];
const CURRENCIES = ["TJS", "USD", "EUR", "RUB", "UZS", "KZT"];

interface BranchForm {
  name: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  timezone: string;
  currency: string;
  primary_color: string;
  secondary_color: string;
  default_delivery_fee: string;
  default_tip_percent: number;
  logo: string | null;
  cover_image: string | null;
}

const EMPTY: BranchForm = {
  name: "", description: "", address: "", phone: "",
  whatsapp: "", instagram: "", timezone: "Asia/Dushanbe", currency: "TJS",
  primary_color: "#a7a66c", secondary_color: "#151513",
  default_delivery_fee: "0", default_tip_percent: 10,
  logo: null, cover_image: null,
};

export default function BranchTab() {
  const [form, setForm] = useState<BranchForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsApi.getBranch(BRANCH_ID)
      .then((res) => setForm({ ...EMPTY, ...res.data }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const fd = new FormData();
    (Object.keys(form) as (keyof BranchForm)[]).forEach((k) => {
      if (k === "logo" || k === "cover_image") return;
      fd.append(k, String(form[k] ?? ""));
    });
    if (logoFile) fd.append("logo", logoFile);
    if (coverFile) fd.append("cover_image", coverFile);
    try {
      const res = await settingsApi.updateBranch(BRANCH_ID, fd);
      setForm((prev) => ({ ...prev, logo: res.data.logo, cover_image: res.data.cover_image }));
      setLogoFile(null);
      setCoverFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Images */}
      <Section title="Branding" icon="image">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-4">
              <div
                className="size-20 rounded-xl overflow-hidden bg-[#a7a66c]/10 flex items-center justify-center cursor-pointer border-2 border-dashed border-[#e2e2df] dark:border-[#3a3930] hover:border-[#a7a66c] transition-colors"
                onClick={() => logoRef.current?.click()}
              >
                {logoFile ? (
                  <Image src={URL.createObjectURL(logoFile)} alt="logo" width={80} height={80} className="w-full h-full object-cover" />
                ) : form.logo ? (
                  <Image src={form.logo} alt="logo" width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[#a7a66c] text-2xl">add_photo_alternate</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => logoRef.current?.click()} className="text-xs text-[#a7a66c] font-bold hover:underline">
                  {form.logo || logoFile ? "Change logo" : "Upload logo"}
                </button>
                {(form.logo || logoFile) && (
                  <button type="button" onClick={() => { setLogoFile(null); setForm((f) => ({ ...f, logo: null })); }} className="text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {/* Cover */}
          <div>
            <label className="label">Cover Image</label>
            <div
              className="h-20 rounded-xl overflow-hidden bg-[#a7a66c]/10 flex items-center justify-center cursor-pointer border-2 border-dashed border-[#e2e2df] dark:border-[#3a3930] hover:border-[#a7a66c] transition-colors"
              onClick={() => coverRef.current?.click()}
            >
              {coverFile ? (
                <Image src={URL.createObjectURL(coverFile)} alt="cover" width={400} height={80} className="w-full h-full object-cover" />
              ) : form.cover_image ? (
                <Image src={form.cover_image} alt="cover" width={400} height={80} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[#a7a66c] text-2xl">add_photo_alternate</span>
              )}
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      </Section>

      {/* Basic info */}
      <Section title="Basic Info" icon="info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Branch Name *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input resize-none"
            />
          </Field>
        </div>
      </Section>

      {/* Social */}
      <Section title="Social Media" icon="share">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="WhatsApp">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7b6f] text-sm font-bold">+</span>
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input pl-6" placeholder="992900000000" />
            </div>
          </Field>
          <Field label="Instagram">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7b6f] text-sm">@</span>
              <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="input pl-7" placeholder="yourrestaurant" />
            </div>
          </Field>
        </div>
      </Section>

      {/* Brand Colors */}
      <Section title="Brand Colors & Fees" icon="palette">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Primary Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] cursor-pointer p-0.5"
              />
              <input
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="input flex-1"
                maxLength={7}
                placeholder="#a7a66c"
              />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] cursor-pointer p-0.5"
              />
              <input
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                className="input flex-1"
                maxLength={7}
                placeholder="#151513"
              />
            </div>
          </Field>
          <Field label="Default Delivery Fee">
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.default_delivery_fee}
                onChange={(e) => setForm({ ...form, default_delivery_fee: e.target.value })}
                className="input"
              />
            </div>
          </Field>
          <Field label="Suggested Tip % (0 = disabled)">
            <input
              type="number"
              min={0}
              max={50}
              value={form.default_tip_percent}
              onChange={(e) => setForm({ ...form, default_tip_percent: Number(e.target.value) })}
              className="input"
            />
          </Field>
        </div>
      </Section>

      {/* Locale */}
      <Section title="Regional Settings" icon="language">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Timezone">
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="input">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-bold">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Saved!
          </div>
        )}
      </div>
    </form>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#e2e2df] dark:border-[#3a3930] flex items-center gap-2">
        <span className="material-symbols-outlined text-[#a7a66c] text-xl">{icon}</span>
        <h3 className="font-bold text-[#151513] dark:text-white">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
