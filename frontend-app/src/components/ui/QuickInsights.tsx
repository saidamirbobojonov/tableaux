interface InsightItem {
  icon: string;
  label: string;
  value: string;
}

const INSIGHTS: InsightItem[] = [
  { icon: "timer", label: "Peak Hour", value: "7:00 PM - 9:00 PM" },
  { icon: "star", label: "Top Category", value: "Main Course (42%)" },
  { icon: "loyalty", label: "Returning Customers", value: "58% of Today's Traffic" },
];

interface QuickInsightsProps {
  goalCurrent: number;
  goalTarget: number;
}

export default function QuickInsights({ goalCurrent, goalTarget }: QuickInsightsProps) {
  const pct = Math.min(100, Math.round((goalCurrent / goalTarget) * 100));

  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl border border-[#e2e2df] dark:border-[#3a3930] shadow-sm p-6 flex flex-col gap-6">
      <h3 className="text-[#151513] dark:text-white text-base font-bold">Quick Insights</h3>

      <div className="space-y-4">
        {INSIGHTS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-4 p-4 bg-[#f7f7f6] dark:bg-[#32312a] rounded-lg border-l-4 border-[#a7a66c]"
          >
            <div className="p-2 bg-white dark:bg-[#25241e] rounded-full text-[#a7a66c]">
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#7b7b6f] uppercase">{item.label}</p>
              <p className="text-sm font-bold text-[#151513] dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Goal */}
      <div className="mt-auto p-4 bg-[#a7a66c] text-white rounded-xl">
        <p className="text-xs font-medium opacity-90">Daily Goal Progress</p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-xl font-bold">
            ${(goalCurrent / 1000).toFixed(1)}k / ${(goalTarget / 1000).toFixed(0)}k
          </p>
          <p className="text-xs font-bold">{pct}%</p>
        </div>
        <div className="mt-3 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div className="bg-white h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
