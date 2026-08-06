"use client";

import type { EdAssignment } from "@/lib/api";

const TYPE_BADGE: Record<string, string> = {
  ED: "bg-red-50 text-red-700 border-red-200",
  HED: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function EdPanel({ assignments }: { assignments: EdAssignment[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const todays = assignments.filter((a) => a.scheduled_for === today);
  const ed = todays.filter((a) => a.drill_type === "ED");
  const hed = todays.filter((a) => a.drill_type === "HED");

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
          ED {ed.length}
        </span>
        <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">
          HED {hed.length}
        </span>
        <span className="ml-auto text-sm text-slate-400">Today</span>
      </div>
      {todays.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          No cadets on drill duty today.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {todays.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[e.drill_type]}`}
              >
                {e.drill_type}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {e.cadet?.name ?? `Cadet #${e.cadet_id}`}
                </p>
                <p className="text-[11px] text-slate-400">
                  Assigned {new Date(e.created_at).toLocaleTimeString("en-IN")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {assignments.length > todays.length && (
        <p className="mt-3 border-t border-white/5 pt-2 text-[11px] text-slate-500">
          +{assignments.length - todays.length} earlier assignment
          {assignments.length - todays.length > 1 ? "s" : ""} this period
        </p>
      )}
    </div>
  );
}
