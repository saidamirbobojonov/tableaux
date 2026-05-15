"use client";

interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  active: string | null;
  onChange: (id: string | null) => void;
}

export default function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div className="px-6 pt-4 shrink-0 bg-white dark:bg-[#252420] border-b border-[#e2e2df] dark:border-[#333]">
      <div className="flex gap-8 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {/* All Items tab */}
        <button
          onClick={() => onChange(null)}
          className={`flex items-center pb-3 pt-2 whitespace-nowrap border-b-[3px] transition-colors text-sm font-bold uppercase tracking-wider ${
            active === null
              ? "border-[#a7a66c] text-[#a7a66c]"
              : "border-transparent text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white"
          }`}
        >
          All Items
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex items-center pb-3 pt-2 whitespace-nowrap border-b-[3px] transition-colors text-sm font-bold uppercase tracking-wider ${
              active === cat.id
                ? "border-[#a7a66c] text-[#a7a66c]"
                : "border-transparent text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
