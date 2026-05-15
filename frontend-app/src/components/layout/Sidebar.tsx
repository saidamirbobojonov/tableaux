"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppData } from "@/lib/AppDataContext";

const NAV_ITEMS: { href: string; label: string; icon: string; roles: string[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["OWNER", "REGIONAL", "BRANCH_MAN", "ACCOUNTANT"] },
  { href: "/pos", label: "POS", icon: "point_of_sale", roles: ["OWNER", "BRANCH_MAN", "WAITER"] },
  { href: "/kitchen", label: "Kitchen", icon: "skillet", roles: ["OWNER", "BRANCH_MAN", "CHEF"] },
  { href: "/orders", label: "Orders", icon: "receipt_long", roles: ["OWNER", "REGIONAL", "BRANCH_MAN", "ACCOUNTANT", "WAITER", "CHEF"] },
  { href: "/inventory", label: "Inventory", icon: "inventory_2", roles: ["OWNER", "REGIONAL", "BRANCH_MAN"] },
  { href: "/staff", label: "Staff", icon: "groups", roles: ["OWNER", "REGIONAL"] },
  { href: "/settings", label: "Settings", icon: "settings", roles: ["OWNER", "REGIONAL", "BRANCH_MAN"] },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { branch, user } = useAppData();
  const role = user?.role ?? "";
  const visibleNav = NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    // Clear auth cookie so middleware redirects to /login
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 h-full flex flex-col bg-white dark:bg-[#25241e] border-r border-[#e2e2df] dark:border-[#3a3930]">
      <div className="p-6 flex flex-col h-full justify-between">
        <div className="flex flex-col gap-8">

          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo: real image or fallback icon */}
              <div className="size-10 rounded-full overflow-hidden bg-[#a7a66c] flex items-center justify-center text-white flex-shrink-0">
                {branch?.logo ? (
                  <Image
                    src={branch.logo}
                    alt={branch.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined">restaurant</span>
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-[#151513] dark:text-white text-base font-bold leading-tight">
                  {branch?.name ?? "—"}
                </h1>
                <p className="text-[#7b7b6f] dark:text-[#a3a396] text-xs truncate max-w-[130px]">
                  {branch?.address ?? ""}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-[#7b7b6f] hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {visibleNav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    active
                      ? "bg-[#a7a66c]/10 text-[#a7a66c]"
                      : "text-[#7b7b6f] dark:text-[#a3a396] hover:bg-[#f7f7f6] dark:hover:bg-[#32312a]"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-4">
          <button className="w-full bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white text-sm font-bold py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            New Report
          </button>
          <div className="flex flex-col gap-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#7b7b6f] dark:text-[#a3a396] hover:bg-[#f7f7f6] dark:hover:bg-[#32312a] transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-red-500">logout</span>
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
