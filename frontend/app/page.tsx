"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type Alert, type Dorm, type DormMap } from "@/lib/api";
import AppShell from "@/components/AppShell";
import EdOverview from "@/components/EdOverview";

function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    if (target === from) {
      setVal(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

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
    bar: "from-cyan-400 to-indigo-600",
    chip: "bg-cyan-500/15 text-cyan-300",
    total: (): number => EMPTY_STATS.cadets,
  },
  {
    key: "normal" as const,
    label: "Green · Normal",
    icon: "✓",
    bar: "from-emerald-400 to-green-600",
    chip: "bg-emerald-500/15 text-emerald-300",
  },
  {
    key: "warning" as const,
    label: "Yellow · Warnings",
    icon: "⚠",
    bar: "from-amber-300 to-amber-500",
    chip: "bg-amber-500/15 text-amber-300",
  },
  {
    key: "red" as const,
    label: "Red · Extra Drill",
    icon: "⛔",
    bar: "from-red-500 to-rose-600",
    chip: "bg-red-500/15 text-red-300",
  },
  {
    key: "empty" as const,
    label: "Empty beds",
    icon: "▢",
    bar: "from-slate-400 to-slate-600",
    chip: "bg-slate-500/15 text-slate-300",
  },
];

const HOUSE_COLORS: Record<number, string> = {
  1: "from-cyan-500 to-blue-700",
  2: "from-emerald-400 to-green-700",
  3: "from-amber-400 to-orange-700",
  4: "from-rose-400 to-red-700",
  5: "from-violet-400 to-purple-700",
  6: "from-fuchsia-400 to-pink-700",
};

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
  const totalBeds = Math.max(stats.normal + stats.warning + stats.red + stats.empty, 1);

  const TYPE_BADGE: Record<string, string> = {
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle="Sainik School Ambikapur · Dormitory Discipline Command Centre"
    >
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          ⚠ Backend unreachable: {error} — open the ⚙ gear and set the school
          server address.
        </div>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {KPI_CARDS.map((k, i) => (
          <KpiCard
            key={k.key}
            k={k}
            value={stats[k.key]}
            delay={i * 0.08}
            totalBeds={totalBeds}
          />
        ))}
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Dormitories</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400">
            {dorms.length} flanks
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dorms.map((d, i) => {
            const m = maps.find((x) => x.id === d.id);
            const reds = m?.beds.filter((b) => b.status === "red").length ?? 0;
            const warns = m?.beds.filter((b) => b.status === "warning").length ?? 0;
            const greens = m?.beds.filter((b) => b.status === "normal").length ?? 0;
            const occ = m?.beds.filter((b) => b.cadet).length ?? 0;
            const ac = HOUSE_COLORS[d.house.id] ?? "from-cyan-500 to-indigo-700";
            const fill = (n: number) =>
              `${((n / Math.max(occ, 1)) * 100).toFixed(0)}%`;
            return (
              <Link
                key={d.id}
                href={`/dorms/${d.id}`}
                className="anim-fade-up group relative overflow-hidden rounded-xl border border-white/5 bg-[#11183a] p-5 shadow-lg shadow-black/20 transition-all hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-cyan-900/20"
                style={{ animationDelay: `${0.15 + i * 0.07}s` }}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ac}`}
                />
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-cyan-300">
                      {d.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {d.house.name} · {d.rows}×{d.cols}
                    </p>
                  </div>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-slate-300">
                    {occ}
                    {reds > 0 && (
                      <span className="anim-pulse-soft absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#11183a]" />
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Pill color="green" count={greens} />
                  <Pill color="amber" count={warns} />
                  <Pill color="red" count={reds} />
                </div>

                <div className="mt-4">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
                    {greens > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: fill(greens) }}
                      />
                    )}
                    {warns > 0 && (
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: fill(warns) }}
                      />
                    )}
                    {reds > 0 && (
                      <div
                        className="h-full bg-red-500"
                        style={{ width: fill(reds) }}
                      />
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs font-semibold text-cyan-400">
                  Open map →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <EdOverview />

        <section className="rounded-xl border border-white/5 bg-[#11183a] p-5 shadow-lg shadow-black/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Recent alerts</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400">
              {alerts.length} logged
            </span>
          </div>
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No alerts yet. Open a flank and click a bed.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {alerts.slice(0, 7).map((a, i) => (
                <li
                  key={a.id}
                  className="anim-slide flex items-center gap-3 py-2.5"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_BADGE[a.type]}`}
                  >
                    {a.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {a.cadet?.name ?? `Cadet #${a.cadet_id}`}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {a.message} ·{" "}
                      {new Date(a.created_at).toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                  {a.cadet?.dorm_id && (
                    <Link
                      href={`/dorms/${a.cadet.dorm_id}`}
                      className="text-[11px] font-semibold text-cyan-400 hover:underline"
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

function Pill({ color, count }: { color: "green" | "amber" | "red"; count: number }) {
  const styles = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
  }[color];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${styles} ${
        color === "red" && count > 0 ? "anim-pulse-soft" : ""
      }`}
    >
      {count}
    </span>
  );
}

function KpiCard({
  k,
  value,
  delay,
  totalBeds,
}: {
  k: (typeof KPI_CARDS)[number];
  value: number;
  delay: number;
  totalBeds: number;
}) {
  const n = useCountUp(value);
  const live = k.key === "red" && value > 0;
  return (
    <div
      className={`anim-fade-up relative overflow-hidden rounded-xl border bg-[#11183a] p-4 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 ${
        live ? "anim-glow-red border-red-500/40" : "border-white/5 hover:border-cyan-400/30"
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.bar}`} />
      <div className="flex items-start justify-between pt-2">
        <p
          className={`text-3xl font-black tabular-nums ${
            live ? "text-red-300" : "text-white"
          }`}
        >
          {n}
          {live && (
            <span className="anim-pulse-soft ml-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
        </p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${k.chip}`}
        >
          {k.icon}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-400">{k.label}</p>
      {k.key !== "cadets" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full bg-gradient-to-r ${k.bar}`}
            style={{ width: `${(value / totalBeds) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}