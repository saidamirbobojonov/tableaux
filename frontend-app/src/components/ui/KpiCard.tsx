interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
  subtitle?: string;
}

export default function KpiCard({ label, value, trend, subtitle = "v.s. last 7 days" }: KpiCardProps) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-white dark:bg-[#25241e] rounded-xl p-6 border border-[#e2e2df] dark:border-[#3a3930] shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[#7b7b6f] dark:text-[#a3a396] text-sm font-medium">{label}</p>
        <span
          className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
            isPositive
              ? "text-[#078816] bg-[#078816]/10"
              : "text-[#e71708] bg-[#e71708]/10"
          }`}
        >
          <span className="material-symbols-outlined text-xs mr-1">
            {isPositive ? "trending_up" : "trending_down"}
          </span>
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-[#151513] dark:text-white text-3xl font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-[#7b7b6f] mt-2">{subtitle}</p>
    </div>
  );
}
