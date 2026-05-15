"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/layout/RoleGuard";
import { staffApi } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  REGIONAL: "Regional Manager",
  BRANCH_MAN: "Branch Manager",
  ACCOUNTANT: "Accountant",
  WAITER: "Waiter",
  CHEF: "Chef",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-[#a7a66c]/15 text-[#a7a66c]",
  REGIONAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  BRANCH_MAN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACCOUNTANT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WAITER: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CHEF: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

interface StaffMember {
  id: string;
  membership_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar: string | null;
  role: string;
  is_active: boolean;
  date_joined: string;
}

const EMPTY_FORM = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  role: "WAITER",
  password: "",
};

function initials(m: StaffMember) {
  const full = `${m.first_name} ${m.last_name}`.trim() || m.email;
  return full.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function fullName(m: StaffMember) {
  return `${m.first_name} ${m.last_name}`.trim() || m.email;
}

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  function fetchStaff() {
    staffApi.list()
      .then((res) => setMembers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchStaff(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await staffApi.invite(form);
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchStaff();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; email?: string[] } } })
          ?.response?.data?.detail ??
        (err as { response?: { data?: { email?: string[] } } })
          ?.response?.data?.email?.[0] ??
        "Failed to invite member.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(membership_id: string, role: string) {
    try {
      const updated = await staffApi.update(membership_id, { role });
      setMembers((prev) =>
        prev.map((m) => (m.membership_id === membership_id ? { ...m, ...updated.data } : m))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleActive(membership_id: string, is_active: boolean) {
    try {
      await staffApi.update(membership_id, { is_active: !is_active });
      setMembers((prev) =>
        prev.map((m) =>
          m.membership_id === membership_id ? { ...m, is_active: !is_active } : m
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemove(membership_id: string) {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await staffApi.remove(membership_id);
      setMembers((prev) => prev.filter((m) => m.membership_id !== membership_id));
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = members.filter((m) => {
    const matchRole = filterRole === "ALL" || m.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.email.toLowerCase().includes(q) ||
      fullName(m).toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <RoleGuard allowedRoles={["OWNER", "REGIONAL"]}>
      <AppShell title="Staff">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">

          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-[#151513] dark:text-white">Team Members</h1>
              <p className="text-sm text-[#7b7b6f] mt-0.5">
                {activeCount} active · {members.length} total
              </p>
            </div>
            <button
              onClick={() => { setShowModal(true); setFormError(null); setForm(EMPTY_FORM); }}
              className="flex items-center gap-2 bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              Invite Member
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7b6f] text-xl">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e] text-sm focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40 text-[#151513] dark:text-white placeholder:text-[#7b7b6f]"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-white dark:bg-[#25241e] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
            >
              <option value="ALL">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48 text-[#7b7b6f]">Loading staff...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#7b7b6f]">
              <span className="material-symbols-outlined text-5xl">group_off</span>
              <p className="font-bold">No members found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden shadow-sm">
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a]/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Member</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Contact</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Role</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Status</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7b7b6f]">Actions</p>
              </div>

              <div className="divide-y divide-[#e2e2df] dark:divide-[#3a3930]">
                {filtered.map((member) => (
                  <div
                    key={member.membership_id}
                    className={`px-4 md:px-6 py-4 md:grid md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:gap-4 md:items-center ${
                      !member.is_active ? "opacity-50" : ""
                    }`}
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 mb-3 md:mb-0">
                      <div className="size-10 rounded-full overflow-hidden bg-[#a7a66c] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {member.avatar ? (
                          <Image src={member.avatar} alt={fullName(member)} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          initials(member)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#151513] dark:text-white text-sm truncate">{fullName(member)}</p>
                        <p className="text-xs text-[#7b7b6f] truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="mb-3 md:mb-0">
                      {member.phone ? (
                        <p className="text-sm text-[#7b7b6f] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">phone</span>
                          {member.phone}
                        </p>
                      ) : (
                        <p className="text-sm text-[#7b7b6f] italic">No phone</p>
                      )}
                    </div>

                    {/* Role selector */}
                    <div className="mb-3 md:mb-0">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.membership_id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40 ${ROLE_COLORS[member.role] ?? ""}`}
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status toggle */}
                    <div className="mb-3 md:mb-0">
                      <button
                        onClick={() => handleToggleActive(member.membership_id, member.is_active)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                          member.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-red-100 hover:text-red-600"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-green-100 hover:text-green-700"
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {member.is_active ? "check_circle" : "cancel"}
                        </span>
                        {member.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {/* Actions */}
                    <div>
                      <button
                        onClick={() => handleRemove(member.membership_id)}
                        className="p-2 rounded-lg text-[#7b7b6f] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove from organization"
                      >
                        <span className="material-symbols-outlined text-xl">person_remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white dark:bg-[#25241e] rounded-2xl shadow-2xl w-full max-w-md border border-[#e2e2df] dark:border-[#3a3930]">
              <div className="p-6 border-b border-[#e2e2df] dark:border-[#3a3930] flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#151513] dark:text-white">Invite Team Member</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors">
                  <span className="material-symbols-outlined text-[#7b7b6f]">close</span>
                </button>
              </div>

              <form onSubmit={handleInvite} className="p-6 flex flex-col gap-4">
                {formError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">First Name</label>
                    <input
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="Jane"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Last Name</label>
                    <input
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Doe"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@restaurant.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+992 900 000000"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Role *</label>
                  <select
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wide mb-1 block">Temporary Password *</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl border border-[#e2e2df] dark:border-[#3a3930] text-sm font-bold text-[#7b7b6f] hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-3 rounded-xl bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                  >
                    {submitting ? "Inviting..." : "Invite Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppShell>
    </RoleGuard>
  );
}
