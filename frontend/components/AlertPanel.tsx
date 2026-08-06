"use client";

import type { Alert } from "@/lib/api";

const TYPE_BADGE: Record<string, string> = {
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

export default function AlertPanel({
  alerts,
  onResolve,
}: {
  alerts: Alert[];
  onResolve: (id: number) => void;
}) {
  if (alerts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        No alerts logged yet.
      </p>
    );
  }
  return (
    <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
      {alerts.map((a) => (
        <li key={a.id} className="flex items-start gap-3 py-3">
          <span
            className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_BADGE[a.type]}`}
          >
            {a.type}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-700">
              {a.cadet?.name ?? `Cadet #${a.cadet_id}`}
            </p>
            <p className="truncate text-xs text-slate-400">{a.message}</p>
            <p className="text-[11px] text-slate-400">
              {new Date(a.created_at).toLocaleString("en-IN")}
              {a.resolved_at ? " · resolved" : ""}
            </p>
          </div>
          {!a.resolved_at && (
            <button
              onClick={() => onResolve(a.id)}
              className="shrink-0 rounded border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100"
            >
              Resolve
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
