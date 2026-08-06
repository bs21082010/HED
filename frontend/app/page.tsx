"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Alert, type Dorm, type DormMap } from "@/lib/api";
import AppShell from "@/components/AppShell";
import EdOverview from "@/components/EdOverview";

type Stats = {
  cadets: number;
  normal: number;
  warning: number;
  red: number;
  empty: number;
};

const EMPTY_STATS: Stats = { cadets: 0, normal: 0, warning: 0, red: 0, empty: 0 };

const KPI_CARDS = [
  {
    key: "cadets" as const,
    label: "Cadets under watch",
    icon: "🪖",
    classes: "from-blue-600 to-blue-800",
    bar: "bg-blue-600",
  },
  {
    key: "normal" as const,
    label: "Green · Normal",
    icon: "✓",
    classes: "from-green-500 to-green-700",
    bar: "bg-green-500",
  },
  {
    key: "warning" as const,
    label: "Yellow · Warnings",
    icon: "⚠",
    classes: "from-amber-400 to-amber-600",
    bar: "bg-amber-400",
  },
  {
    key: "red" as const,
    label: "Red · On Extra Drill",
    icon: "⛔",
    classes: "from-red-500 to-red-700",
    bar: "bg-red-500",
  },
  {
    key: "empty" as const,
    label: "Empty beds",
    icon: "▢",
    classes: "from-slate-500 to-slate-700",
    bar: "bg-slate-500",
  },
];

export default function Home() {
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [maps, setMaps] = useState<DormMap[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const ds = await api.dorms();
      setDorms(ds);
      const ms = await Promise.all(ds.map((d) => api.dormMap(d.id)));
      setMaps(ms);
      setAlerts(await api.alerts());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats: Stats = { ...EMPTY_STATS };
  for (const m of maps) {
    for (const b of m.beds) {
      if (b.cadet) stats.cadets += 1;
      if (b.status === "normal") stats.normal += 1;
      else if (b.status === "warning") stats.warning += 1;
      else if (b.status === "red") stats.red += 1;
      else stats.empty += 1;
    }
  }

  const TYPE_BADGE: Record<string, string> = {
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle="Sainik School Ambikapur · Dormitory Discipline Command Centre"
    >
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Backend unreachable: {error}
        </div>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_CARDS.map((k) => (
          <div
            key={k.key}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className={`h-1.5 bg-gradient-to-r ${k.classes}`} />
            <div className="p-4">
              <p className="text-3xl font-black text-slate-800">
                {stats[k.key]}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded ${k.bar} text-[10px] font-bold text-white`}
                >
                  {k.icon}
                </span>
                {k.label}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Dormitories</h2>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {dorms.length} flanks
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dorms.map((d) => {
            const m = maps.find((x) => x.id === d.id);
            const reds = m?.beds.filter((b) => b.status === "red").length ?? 0;
            const warns = m?.beds.filter((b) => b.status === "warning").length ?? 0;
            const greens = m?.beds.filter((b) => b.status === "normal").length ?? 0;
            const occ = m?.beds.filter((b) => b.cadet).length ?? 0;
            return (
              <Link
                key={d.id}
                href={`/dorms/${d.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700">
                      {d.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {d.house.name}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {occ}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <StatusPill color="green" count={greens} />
                  <StatusPill color="amber" count={warns} />
                  <StatusPill color="red" count={reds} />
                </div>
                <p className="mt-3 text-xs font-semibold text-blue-600">
                  Open map →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <EdOverview />

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Recent alerts
            </h2>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {alerts.length} logged
            </span>
          </div>
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No alerts yet. Open a flank and click a bed.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.slice(0, 7).map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_BADGE[a.type]}`}
                  >
                    {a.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">
                      {a.cadet?.name ?? `Cadet #${a.cadet_id}`}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {a.message} ·{" "}
                      {new Date(a.created_at).toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                  {a.cadet?.dorm_id && (
                    <Link
                      href={`/dorms/${a.cadet.dorm_id}`}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function StatusPill({ color, count }: { color: "green" | "amber" | "red"; count: number }) {
  const styles = {
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }[color];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${styles}`}>
      {count}
    </span>
  );
}
