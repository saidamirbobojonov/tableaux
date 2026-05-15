"use client";

import { useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DaySchedule {
  day: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAY_NAMES.map((_, i) => ({
  day: i,
  is_closed: i === 6,
  open_time: "09:00",
  close_time: "22:00",
}));

export default function ScheduleTab() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.getSchedule(BRANCH_ID)
      .then((res) => {
        const data: DaySchedule[] = res.data;
        // Merge with defaults for any missing days
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const found = data.find((d) => d.day === def.day);
          return found ? { ...def, ...found } : def;
        });
        setSchedule(merged);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function updateDay(day: number, field: keyof DaySchedule, value: boolean | string) {
    setSchedule((prev) => prev.map((d) => d.day === day ? { ...d, [field]: value } : d));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await settingsApi.updateSchedule(BRANCH_ID, schedule);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-48 flex items-center justify-center text-[#7b7b6f]">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e2df] dark:border-[#3a3930] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#a7a66c] text-xl">schedule</span>
          <h3 className="font-bold text-[#151513] dark:text-white">Working Hours</h3>
        </div>

        <div className="divide-y divide-[#e2e2df] dark:divide-[#3a3930]">
          {schedule.map(({ day, is_closed, open_time, close_time }) => (
            <div key={day} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Day name + toggle */}
              <div className="flex items-center gap-3 sm:w-40">
                <button
                  type="button"
                  onClick={() => updateDay(day, "is_closed", !is_closed)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${is_closed ? "bg-[#e2e2df] dark:bg-[#3a3930]" : "bg-[#a7a66c]"}`}
                >
                  <span className={`absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform ${is_closed ? "left-0.5" : "left-5"}`} />
                </button>
                <span className={`text-sm font-bold ${is_closed ? "text-[#7b7b6f] line-through" : "text-[#151513] dark:text-white"}`}>
                  {DAY_NAMES[day]}
                </span>
              </div>

              {is_closed ? (
                <span className="text-sm text-[#7b7b6f] italic">Closed</span>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#7b7b6f] font-bold uppercase tracking-wide">Open</label>
                    <input
                      type="time"
                      value={open_time}
                      onChange={(e) => updateDay(day, "open_time", e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                    />
                  </div>
                  <span className="text-[#7b7b6f]">—</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#7b7b6f] font-bold uppercase tracking-wide">Close</label>
                    <input
                      type="time"
                      value={close_time}
                      onChange={(e) => updateDay(day, "close_time", e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-[#e2e2df] dark:border-[#3a3930] bg-[#f7f7f6] dark:bg-[#32312a] text-sm text-[#151513] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/40"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#a7a66c] hover:bg-[#a7a66c]/90 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Schedule"}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-bold">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Saved!
          </div>
        )}
      </div>
    </div>
  );
}
