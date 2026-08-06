"use client";

import { useCallback, useRef, useState } from "react";
import type { AlertType, BedWithCadet } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  empty:
    "border-dashed border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed",
  normal:
    "border-green-300 bg-green-50 text-green-900 hover:bg-green-100",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
  red: "border-red-300 bg-red-50 text-red-900 hover:bg-red-100",
};

const STATUS_DOT: Record<string, string> = {
  empty: "bg-slate-300",
  normal: "bg-green-500",
  warning: "bg-amber-400",
  red: "bg-red-500 animate-pulse",
};

export default function Bed({
  bed,
  busy,
  editing,
  onAlert,
  onDragStart,
  onDragEnd,
  onDropOnBed,
  onRemove,
  onEditLocation,
}: {
  bed: BedWithCadet;
  busy: boolean;
  editing?: boolean;
  onAlert: (bed: BedWithCadet, type: AlertType) => void;
  onDragStart?: (bedId: number) => void;
  onDragEnd?: () => void;
  onDropOnBed?: (bedId: number) => void;
  onRemove?: (bedId: number) => void;
  onEditLocation?: (bedId: number, location: string) => void;
}) {
  const [pending, setPending] = useState<"warning" | "red" | null>(null);
  const [locDraft, setLocDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clicks = useRef(0);

  const fire = useCallback(
    (type: AlertType) => {
      if (!bed.cadet || busy || editing) return;
      setPending(type);
      onAlert(bed, type);
    },
    [bed, busy, editing, onAlert],
  );

  const handleClick = () => {
    if (!bed.cadet || busy || editing) return;
    clicks.current += 1;
    if (clicks.current === 2) {
      if (timer.current) clearTimeout(timer.current);
      fire("red");
      clicks.current = 0;
      return;
    }
    timer.current = setTimeout(() => {
      clicks.current = 0;
      fire("warning");
    }, 260);
  };

  const occupied = bed.cadet !== null;
  const styles = STATUS_STYLES[bed.status];
  const label = bed.cadet ? `${bed.cadet.name} (${bed.cadet.cadet_class})` : "Empty bed";
  const location = locDraft ?? bed.location;

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={handleClick}
      disabled={(!occupied || busy) && !editing}
      draggable={editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(bed.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(bed.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (editing) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (editing) onDropOnBed?.(bed.id);
      }}
      title={
        editing
          ? "Drag to move · drop on another bed to swap · drop on an empty cell to place"
          : occupied
            ? `${label} — click: Yellow warning · double-click: Red alert (ED/HED)`
            : "Unoccupied bed"
      }
      aria-label={label}
      className={`relative flex h-24 flex-col items-center justify-center rounded-lg border-2 p-2 transition-colors shadow-sm ${
        editing ? "cursor-grab active:cursor-grabbing ring-2 ring-blue-200" : ""
      } ${styles}`}
    >
      <span className="pointer-events-none absolute left-1.5 top-1.5 text-[10px] font-semibold text-slate-400">
        B{bed.row}-{bed.col}
      </span>

      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(bed.id);
          }}
          className="absolute right-1 top-1 z-10 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-red-500 shadow hover:bg-red-50"
          title={occupied ? "Occupied — cannot remove" : "Remove bed"}
        >
          {occupied ? "✱" : "✕"}
        </button>
      )}

      <span
        className={`pointer-events-none mb-1 h-2.5 w-2.5 rounded-full ${STATUS_DOT[bed.status]} ${
          editing ? "opacity-40" : ""
        }`}
      />
      {occupied ? (
        <>
          <span className="pointer-events-none text-center text-xs font-bold leading-tight">
            {bed.cadet!.name}
          </span>
          <span className="pointer-events-none text-[10px] text-slate-400">
            {bed.cadet!.cadet_class}
          </span>
        </>
      ) : (
        <span className="pointer-events-none text-xs text-slate-400">—</span>
      )}

      {editing ? (
        <input
          type="text"
          value={location}
          placeholder="Location"
          maxLength={100}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setLocDraft(e.target.value)}
          onBlur={() => {
            if (locDraft !== null && locDraft !== bed.location) {
              onEditLocation?.(bed.id, locDraft.trim());
            }
            setLocDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="pointer-events-auto mt-1 w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[9px] text-slate-600 outline-none focus:border-blue-500"
        />
      ) : (
        bed.location && (
          <span className="pointer-events-none text-[9px] text-slate-400">
            {bed.location}
          </span>
        )
      )}

      {pending && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          {pending === "red" ? "ED/HED" : "Warning"}
        </span>
      )}
    </button>
  );
}
