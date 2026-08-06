"use client";

import { useEffect, useState } from "react";

export type Toast = { id: number; kind: "ok" | "error" | "info"; text: string };

export default function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), 4200);
    const remove = setTimeout(() => onDismiss(toast.id), 4600);
    return () => {
      clearTimeout(leave);
      clearTimeout(remove);
    };
  }, [toast.id, onDismiss]);

  const styles = {
    ok: "border-emerald-400/30 bg-[#11183a] text-emerald-300",
    error: "border-red-500/30 bg-[#11183a] text-red-300",
    info: "border-white/10 bg-[#11183a] text-slate-200",
  }[toast.kind];

  return (
    <div
      className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg transition-all duration-300 ${styles} ${
        leaving ? "translate-x-4 opacity-0" : ""
      }`}
    >
      {toast.text}
    </div>
  );
}
