"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/components/layout/RoleGuard";
import BranchTab from "@/components/settings/BranchTab";
import ScheduleTab from "@/components/settings/ScheduleTab";
import CategoriesTab from "@/components/settings/CategoriesTab";
import MenuItemsTab from "@/components/settings/MenuItemsTab";
import AllergensTab from "@/components/settings/AllergensTab";
import ModifiersTab from "@/components/settings/ModifiersTab";
import PaymentTab from "@/components/settings/PaymentTab";
import TablesTab from "@/components/settings/TablesTab";

const TABS = [
  { key: "branch", label: "Branch", icon: "store" },
  { key: "schedule", label: "Schedule", icon: "schedule" },
  { key: "tables", label: "Tables", icon: "table_bar" },
  { key: "categories", label: "Categories", icon: "category" },
  { key: "menu", label: "Menu Items", icon: "restaurant_menu" },
  { key: "allergens", label: "Allergens", icon: "no_food" },
  { key: "modifiers", label: "Modifiers", icon: "tune" },
  { key: "payment", label: "Payment", icon: "payments" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("branch");

  return (
    <RoleGuard allowedRoles={["OWNER", "REGIONAL", "BRANCH_MAN"]}>
      <AppShell title="Settings">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto mb-8 bg-white dark:bg-[#25241e] rounded-xl p-1.5 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === key
                    ? "bg-[#a7a66c] text-white shadow-sm"
                    : "text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white hover:bg-[#f7f7f6] dark:hover:bg-[#32312a]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "branch" && <BranchTab />}
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "menu" && <MenuItemsTab />}
          {activeTab === "tables" && <TablesTab />}
          {activeTab === "allergens" && <AllergensTab />}
          {activeTab === "modifiers" && <ModifiersTab />}
          {activeTab === "payment" && <PaymentTab />}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
