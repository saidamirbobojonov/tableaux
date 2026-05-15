"use client";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/layout/RoleGuard";

export default function InventoryPage() {
  return (
    <RoleGuard allowedRoles={["OWNER", "REGIONAL", "BRANCH_MAN"]}>
    <AppShell title="Inventory">
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-96 gap-4 text-[#7b7b6f]">
        <span className="material-symbols-outlined text-6xl">inventory_2</span>
        <p className="text-xl font-bold">Inventory Management</p>
        <p className="text-sm">Coming soon — stock tracking and purchase orders</p>
      </div>
    </AppShell>
    </RoleGuard>
  );
}
