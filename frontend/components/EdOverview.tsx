"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type EdAssignment } from "@/lib/api";

const TYPE_BADGE: Record<string, string> = {
  ED: "bg-red-50 text-red-700 border-red-200",
  HED: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function EdOverview() {
  const [items, setItems] = useState<EdAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setItems(await api.edSchedule());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todays = items.filter((a) => a.scheduled_for === today);
  const ed = todays.filter((a) => a.drill_type === "ED");
  const hed = todays.filter((a) => a.drill_type === "HED");

  return (
    <section className="rounded-xl border border-white/5 bg-[#11183a] p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">ED / HED today</h2>
        <div className="flex gap-2">
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
            ED {ed.length}
          </span>
          <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
            HED {hed.length}
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600">Backend unreachable: {error}</p>
      )}

      {todays.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No drill duty assigned today. Open a flank and double-click a bed for
          a red alert to assign ED/HED.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {todays.slice(0, 12).map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
            >
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[e.drill_type]}`}
              >
                {e.drill_type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {e.cadet?.name ?? `Cadet #${e.cadet_id}`}
                </p>
                <p className="text-[11px] text-slate-400">
                  {e.cadet
                    ? `Assigned ${new Date(e.created_at).toLocaleTimeString("en-IN")}`
                    : "â€”"}
                </p>
              </div>
              {e.cadet?.dorm_id && (
                <Link
                  href={`/dorms/${e.cadet.dorm_id}`}
                  className="shrink-0 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Dorm â†’
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
