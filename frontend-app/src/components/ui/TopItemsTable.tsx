import type { TopItem } from "@/types";

interface TopItemsTableProps {
  items: TopItem[];
  maxQty: number;
}

export default function TopItemsTable({ items, maxQty }: TopItemsTableProps) {
  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl border border-[#e2e2df] dark:border-[#3a3930] shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-[#f3f3f2] dark:border-[#3a3930] flex items-center justify-between">
        <h3 className="text-[#151513] dark:text-white text-base md:text-lg font-bold">Popular Dishes</h3>
        <button className="text-[#a7a66c] text-xs font-bold hover:underline whitespace-nowrap">
          View All
        </button>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden divide-y divide-[#f3f3f2] dark:divide-[#3a3930]">
        {items.map((item) => {
          const pct = maxQty > 0 ? Math.round((item.total_qty / maxQty) * 100) : 0;
          return (
            <div key={item.menu_item__name} className="px-4 py-3 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[#a7a66c]/10 flex items-center justify-center text-[#a7a66c] flex-shrink-0">
                <span className="material-symbols-outlined text-lg">restaurant_menu</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#151513] dark:text-white truncate">
                  {item.menu_item__name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-[#f7f7f6] dark:bg-[#32312a] h-1 rounded-full">
                    <div className="bg-[#a7a66c] h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-[#7b7b6f]">{item.total_qty} sold</span>
                </div>
              </div>
              <p className="text-sm font-bold text-[#151513] dark:text-white flex-shrink-0">
                {Number(item.total_money).toLocaleString()} TJS
              </p>
            </div>
          );
        })}
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#f7f7f6] dark:bg-[#32312a] border-b border-[#e2e2df] dark:border-[#3a3930]">
            <tr>
              {["Item Name", "Sold", "Performance", "Revenue"].map((col) => (
                <th
                  key={col}
                  className={`px-6 py-3.5 text-[10px] font-bold text-[#7b7b6f] uppercase tracking-widest ${
                    col === "Revenue" ? "text-right" : ""
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f3f2] dark:divide-[#3a3930]">
            {items.map((item) => {
              const pct = maxQty > 0 ? Math.round((item.total_qty / maxQty) * 100) : 0;
              return (
                <tr
                  key={item.menu_item__name}
                  className="hover:bg-[#f7f7f6]/50 dark:hover:bg-[#32312a]/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-[#a7a66c]/10 flex items-center justify-center text-[#a7a66c]">
                        <span className="material-symbols-outlined text-lg">restaurant_menu</span>
                      </div>
                      <span className="text-sm font-bold text-[#151513] dark:text-white">
                        {item.menu_item__name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#151513] dark:text-white font-medium">
                    {item.total_qty} units
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32 bg-[#f7f7f6] dark:bg-[#32312a] h-1.5 rounded-full">
                      <div className="bg-[#a7a66c] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-[#151513] dark:text-white">
                    {Number(item.total_money).toLocaleString()} TJS
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
