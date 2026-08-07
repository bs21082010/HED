"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  type Alert,
  type AlertType,
  type BedWithCadet,
  type DormMap,
  type EdAssignment,
} from "@/lib/api";
import AppShell from "@/components/AppShell";
import DormGrid from "@/components/DormGrid";
import AlertPanel from "@/components/AlertPanel";
import EdPanel from "@/components/EdPanel";
import Scanner from "@/components/Scanner";
import ToastHost, { type Toast } from "@/components/ToastHost";

export default function DormPage() {
  const params = useParams<{ id: string }>();
  const dormId = params.id;

  const [map, setMap] = useState<DormMap | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ed, setEd] = useState<EdAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastSms, setLastSms] = useState<string | null>(null);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsSent, setSmsSent] = useState<string | null>(null);
  const toastId = useRef(0);

  const pushToast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    if (!dormId) return;
    try {
      const [m, a, e] = await Promise.all([
        api.dormMap(dormId),
        api.alerts(Number(dormId)),
        api.edSchedule(),
      ]);
      setMap(m);
      setAlerts(a);
      setEd(e);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [dormId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAlert = async (
    bed: BedWithCadet,
    type: AlertType,
    drillType: "ED" | "HED" = "ED",
  ) => {
    if (!bed.cadet) return;
    setBusy(true);
    try {
      const alert = await api.raiseAlert(bed.id, type, "", drillType);
      pushToast(
        type === "red" ? "error" : "info",
        type === "red"
          ? `Red alert: ${bed.cadet.name} — ${drillType} assigned, SMS dispatched.`
          : `Yellow warning logged for ${bed.cadet.name}.`,
      );
      setLastSms(
        type === "red"
          ? `SMS sent for ${bed.cadet.name} (${drillType}, alert #${alert.id}). Check backend sms_outbox.log (mock provider).`
          : null,
      );
      await refresh();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Failed to raise alert",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await api.resolveAlert(alertId);
      pushToast("ok", `Alert #${alertId} marked resolved.`);
      await refresh();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Failed to resolve alert",
      );
    }
  };

  const withLayout = async (fn: () => Promise<unknown>, okMsg: string) => {
    setLayoutBusy(true);
    try {
      await fn();
      pushToast("ok", okMsg);
      await refresh();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Layout change failed",
      );
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleMoveBed = (bedId: number, row: number, col: number) =>
    withLayout(() => api.updateBed(bedId, { row, col }), `Bed moved to R${row}C${col}.`);

  const handleSwapBeds = (aId: number, bId: number) =>
    withLayout(async () => {
      const a = map?.beds.find((b) => b.id === aId);
      const b = map?.beds.find((x) => x.id === bId);
      if (!a || !b) return;
      await Promise.all([
        api.updateBed(aId, { row: b.row, col: b.col }),
        api.updateBed(bId, { row: a.row, col: a.col }),
      ]);
    }, "Beds swapped.");

  const handleAddBed = (row: number, col: number) =>
    withLayout(
      () => api.addBed(Number(dormId), { row, col, location: "" }),
      `Empty bed added at R${row}C${col}.`,
    );

  const handleRemoveBed = (bedId: number) =>
    withLayout(() => api.deleteBed(bedId), "Bed removed.");

  const handleEditLocation = (bedId: number, location: string) =>
    withLayout(() => api.updateBed(bedId, { location }), "Location updated.");

  const onLayoutApplied = (summary: string) => {
    setScanOpen(false);
    pushToast("ok", summary);
    refresh();
  };

  const handleSendSms = async () => {
    const phone = smsPhone.trim();
    if (!phone) {
      pushToast("error", "Enter a school phone number first.");
      return;
    }
    setSmsBusy(true);
    try {
      const latestRed = alerts.find((a) => a.type === "red" && !a.resolved_at);
      const result = await api.sendSms(phone, latestRed?.id);
      setSmsSent(result.body);
      pushToast("ok", `SMS sent to ${result.to_phone} (${result.status}).`);
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error ? err.message : "Failed to send SMS",
      );
    } finally {
      setSmsBusy(false);
    }
  };

  const counts = { normal: 0, warning: 0, red: 0, empty: 0 };
  for (const b of map?.beds ?? []) counts[b.status] += 1;

  return (
    <AppShell
      title={map?.name ?? "Flank"}
      subtitle={
        map ? `${map.house.name} · ${map.rows}×${map.cols} grid` : undefined
      }
      actions={
        <>
          <button
            onClick={() => setScanOpen(true)}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            📷 Scan room
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              editing
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            {editing ? "Done editing" : "✎ Edit layout"}
          </button>
        </>
      }
    >
      <div className="anim-fade-up mb-5 flex flex-wrap gap-2">
        {(
          [
            ["normal", "Normal", "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"],
            ["warning", "Warning", "border-amber-500/20 bg-amber-500/10 text-amber-300"],
            ["red", "Extra Drill", "border-red-500/20 bg-red-500/10 text-red-300"],
            ["empty", "Empty", "border-white/10 bg-white/5 text-slate-400"],
          ] as const
        ).map(([key, label, cls], i) => (
          <span
            key={key}
            className={`anim-pop rounded-full border px-3 py-1.5 text-xs font-bold ${cls} ${
              key === "red" && counts[key] > 0 ? "anim-pulse-soft" : ""
            }`}
            style={{ animationDelay: `${0.05 + i * 0.06}s` }}
          >
            {label} · {counts[key]}
          </span>
        ))}
        <span className="rounded-full border border-white/5 bg-[#11183a] px-3 py-1.5 text-xs font-semibold text-slate-400">
          {map ? `${map.beds.filter((b) => b.cadet).length} cadets` : "—"}
        </span>
      </div>

      {editing && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
          Tap a bed to select it · tap a dashed cell to move there · tap another
          bed to swap · click dashed cell to add · ✕ removes empty beds · edit
          location inline · mouse drag also works
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {map && (
            <DormGrid
              beds={map.beds}
              busy={busy || layoutBusy}
              editing={editing}
              onAlert={handleAlert}
              onMoveBed={handleMoveBed}
              onSwapBeds={handleSwapBeds}
              onAddBed={handleAddBed}
              onRemoveBed={handleRemoveBed}
              onEditLocation={handleEditLocation}
            />
          )}
          <p className="mt-3 text-xs text-slate-400">
            Single click → Yellow warning · Double click → Red alert (ED/HED +
            SMS). Dashboard auto-refreshes every 5 seconds. Each bed shows its
            dormitory location; layout is fluctuable via Edit layout or a room
            scan.
          </p>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-white/5 bg-[#11183a] p-5 shadow-sm">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Alert log
            </h2>
            <AlertPanel alerts={alerts} onResolve={handleResolve} />
          </section>

          <section className="rounded-xl border border-white/5 bg-[#11183a] p-5 shadow-sm">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Extra Drill schedule
            </h2>
            <EdPanel assignments={ed} />
          </section>

          <section className="rounded-xl border border-white/5 bg-[#11183a] p-5 shadow-sm">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Send alert SMS
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              Enter a school phone number only — the message is built from the
              database (latest active red alert: cadet, dorm, ED/HED, time).
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="School number, e.g. +9198…"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSendSms}
                disabled={smsBusy}
                className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {smsBusy ? "Sending…" : "Send"}
              </button>
            </div>
            {smsSent && (
              <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-[11px] leading-relaxed text-green-700">
                <span className="font-semibold">Message sent:</span> {smsSent}
              </p>
            )}
          </section>

          {lastSms && (
            <section className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-700">
              {lastSms}
            </section>
          )}
        </aside>
      </div>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      {scanOpen && (
        <Scanner
          dormId={dormId}
          onApplied={onLayoutApplied}
          onClose={() => setScanOpen(false)}
        />
      )}
    </AppShell>
  );
}
