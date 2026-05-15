"use client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SalesChartProps {
  totalRevenue: string;
}

export default function SalesChart({ totalRevenue }: SalesChartProps) {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-[#25241e] rounded-xl border border-[#e2e2df] dark:border-[#3a3930] shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#f3f3f2] dark:border-[#3a3930] flex items-center justify-between">
        <div>
          <h3 className="text-[#151513] dark:text-white text-lg font-bold">
            Sales Performance Trends
          </h3>
          <p className="text-[#7b7b6f] text-sm">Revenue analytics for the current week</p>
        </div>
        <div className="flex bg-[#f7f7f6] dark:bg-[#32312a] rounded-lg p-1">
          {["Week", "Month", "Year"].map((period, i) => (
            <button
              key={period}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                i === 0
                  ? "bg-white dark:bg-[#25241e] shadow-sm text-[#151513] dark:text-white"
                  : "text-[#7b7b6f] hover:text-[#151513] dark:hover:text-white"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="mb-4">
          <p className="text-2xl font-bold text-[#151513] dark:text-white">{totalRevenue}</p>
          <p className="text-xs text-[#7b7b6f]">Total Period Revenue</p>
        </div>

        <div className="w-full h-64 relative">
          <svg
            className="w-full h-full"
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#a7a66c" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a7a66c" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path
              d="M0,150 Q50,120 100,130 T200,80 T300,100 T400,40 T500,70 T600,30 T700,50 T800,20 V200 H0 Z"
              fill="url(#chartGradient)"
            />
            {/* Line */}
            <path
              d="M0,150 Q50,120 100,130 T200,80 T300,100 T400,40 T500,70 T600,30 T700,50 T800,20"
              fill="none"
              stroke="#a7a66c"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <div className="flex justify-between mt-4 text-[10px] font-bold text-[#7b7b6f] uppercase tracking-widest px-1">
            {DAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
