"use client";

import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useAppData } from "@/lib/AppDataContext";

interface POSHeaderProps {
  search: string;
  onSearch: (v: string) => void;
}

export default function POSHeader({ search, onSearch }: POSHeaderProps) {
  const { user } = useAppData();
  const name = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.email ?? "Staff";

  return (
    <header className="flex items-center justify-between border-b border-[#e2e2df] dark:border-[#333] bg-white dark:bg-[#252420] px-6 py-3 shrink-0 gap-4">
      {/* Left: logo + search */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 text-[#a7a66c] shrink-0">
          <span className="material-symbols-outlined text-2xl">restaurant</span>
          <h2 className="text-base font-bold tracking-tight hidden sm:block">Premium POS</h2>
        </div>

        <div className="flex items-center h-10 rounded-lg overflow-hidden bg-[#f3f3f2] dark:bg-[#333] w-48 md:w-64">
          <div className="flex items-center justify-center pl-3 text-[#7b7b6f]">
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <input
            className="flex-1 min-w-0 border-none bg-transparent focus:outline-none text-[#151513] dark:text-white placeholder:text-[#7b7b6f] pl-2 text-sm"
            placeholder="Quick find item..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Center: nav links */}
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/dashboard" className="text-[#151513] dark:text-white text-sm font-medium hover:text-[#a7a66c] transition-colors">
          Dashboard
        </Link>
        <Link href="/orders" className="text-[#151513] dark:text-white text-sm font-medium hover:text-[#a7a66c] transition-colors">
          Orders
        </Link>
        <span className="text-[#a7a66c] text-sm font-bold border-b-2 border-[#a7a66c] pb-0.5">
          Tables
        </span>
        <Link href="/dashboard" className="text-[#151513] dark:text-white text-sm font-medium hover:text-[#a7a66c] transition-colors">
          Reports
        </Link>
      </nav>

      {/* Right: theme + server + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <button className="flex items-center justify-center rounded-lg h-10 px-3 bg-[#a7a66c] text-white text-sm font-bold tracking-wide shadow-sm hover:bg-[#a7a66c]/90 transition-all max-w-[140px] truncate">
          {name}
        </button>
        <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-[#f3f3f2] dark:bg-[#333] text-[#151513] dark:text-white hover:bg-[#e2e2df] dark:hover:bg-[#444] transition-all">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <button className="relative flex items-center justify-center rounded-lg h-10 w-10 bg-[#f3f3f2] dark:bg-[#333] text-[#151513] dark:text-white hover:bg-[#e2e2df] dark:hover:bg-[#444] transition-all">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
