"use client";

import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import { useAppData } from "@/lib/AppDataContext";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  REGIONAL: "Regional Manager",
  BRANCH_MAN: "Branch Manager",
  ACCOUNTANT: "Accountant",
  WAITER: "Waiter",
  CHEF: "Chef",
};

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { user } = useAppData();

  const fullName =
    user?.first_name || user?.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.email ?? "—";

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-8 py-4 bg-white/80 dark:bg-[#25241e]/80 backdrop-blur-md border-b border-[#e2e2df] dark:border-[#3a3930]">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg bg-[#f7f7f6] dark:bg-[#32312a] text-[#151513] dark:text-[#a3a396] hover:bg-[#a7a66c]/10 hover:text-[#a7a66c] transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <h2 className="text-[#151513] dark:text-white text-base md:text-lg font-bold tracking-tight truncate">
          {title}
        </h2>

        <div className="relative w-48 md:w-64 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7b6f] text-xl">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-[#f7f7f6] dark:bg-[#32312a] border-none rounded-lg focus:outline-none focus:ring-1 focus:ring-[#a7a66c] text-sm placeholder:text-[#7b7b6f] text-[#151513] dark:text-white"
            placeholder="Search data..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <ThemeToggle />

        <button className="md:hidden p-2 rounded-lg bg-[#f7f7f6] dark:bg-[#32312a] text-[#151513] dark:text-[#a3a396] hover:bg-[#a7a66c]/10 hover:text-[#a7a66c] transition-all">
          <span className="material-symbols-outlined">search</span>
        </button>

        <button className="p-2 rounded-lg bg-[#f7f7f6] dark:bg-[#32312a] text-[#151513] dark:text-[#a3a396] hover:bg-[#a7a66c]/10 hover:text-[#a7a66c] transition-all">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <button className="hidden sm:block p-2 rounded-lg bg-[#f7f7f6] dark:bg-[#32312a] text-[#151513] dark:text-[#a3a396] hover:bg-[#a7a66c]/10 hover:text-[#a7a66c] transition-all">
          <span className="material-symbols-outlined">chat_bubble</span>
        </button>

        <div className="hidden sm:block h-8 w-px bg-[#e2e2df] dark:bg-[#3a3930] mx-1" />

        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-[#151513] dark:text-white">{fullName}</p>
            <p className="text-[10px] text-[#7b7b6f] dark:text-[#a3a396] font-medium uppercase tracking-wider">
              {roleLabel}
            </p>
          </div>

          {/* Avatar: real image or initials */}
          <div className="size-9 md:size-10 rounded-full overflow-hidden bg-[#a7a66c] flex items-center justify-center text-white font-bold text-sm border-2 border-white dark:border-[#3a3930] shadow-sm flex-shrink-0">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={fullName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              initials || "?"
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
