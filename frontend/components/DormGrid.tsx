"use client";

import { useRef, useState } from "react";
import type { AlertType, BedWithCadet } from "@/lib/api";
import Bed from "./Bed";

export default function DormGrid({
  beds,
  busy,
  editing,
  onAlert,
  onMoveBed,
  onSwapBeds,
  onAddBed,
  onRemoveBed,
  onEditLocation,
}: {
  beds: BedWithCadet[];
  busy: boolean;
  editing: boolean;
  onAlert: (bed: BedWithCadet, type: AlertType, drillType: "ED" | "HED") => void;
  onMoveBed: (bedId: number, row: number, col: number) => void;
  onSwapBeds: (sourceId: number, targetId: number) => void;
  onAddBed: (row: number, col: number) => void;
  onRemoveBed: (bedId: number) => void;
  onEditLocation: (bedId: number, location: string) => void;
}) {
  const rows = Math.max(...beds.map((b) => b.row), 1);
  const cols = Math.max(...beds.map((b) => b.col), 1);
  const [confirm, setConfirm] = useState<BedWithCadet | null>(null);
  const [drillType, setDrillType] = useState<"ED" | "HED">("ED");
  const [overEmpty, setOverEmpty] = useState<string | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const dragId = useRef<number | null>(null);

  const byPos = new Map(beds.map((b) => [`${b.row}:${b.col}`, b]));

  const handleTapBed = (bed: BedWithCadet) => {
    if (selId === null) {
      setSelId(bed.id);
    } else if (selId === bed.id) {
      setSelId(null);
    } else {
      onSwapBeds(selId, bed.id);
      setSelId(null);
    }
  };

  const handleTapEmpty = (row: number, col: number) => {
    if (selId !== null) {
      onMoveBed(selId, row, col);
      setSelId(null);
    } else {
      onAddBed(row, col);
    }
  };

  const handleAlert = (bed: BedWithCadet, type: AlertType) => {
    if (type === "red") {
      setDrillType("ED");
      setConfirm(bed);
      return;
    }
    onAlert(bed, type, "ED");
  };

  const dropOnCell = (row: number, col: number) => {
    if (dragId.current === null) return;
    if (byPos.has(`${row}:${col}`)) {
      // occupied by a bed -> swap
      const target = byPos.get(`${row}:${col}`);
      if (target && target.id !== dragId.current) onSwapBeds(dragId.current, target.id);
    } else {
      // empty cell -> move there
      if (dragId.current) onMoveBed(dragId.current, row, col);
    }
    dragId.current = null;
    setOverEmpty(null);
  };

  const cells = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const bed = byPos.get(`${r}:${c}`);
      if (bed) {
        cells.push(
          <Bed
            key={bed.id}
            bed={bed}
            busy={busy}
            editing={editing}
            selected={selId === bed.id}
            onTapEdit={() => handleTapBed(bed)}
            onAlert={handleAlert}
            onDragStart={(id) => {
              dragId.current = id;
            }}
            onDragEnd={() => {
              dragId.current = null;
            }}
            onDropOnBed={(targetId) => {
              if (dragId.current !== null && dragId.current !== targetId) {
                onSwapBeds(dragId.current, targetId);
              }
              dragId.current = null;
            }}
            onRemove={onRemoveBed}
            onEditLocation={onEditLocation}
          />,
        );
      } else if (editing) {
        cells.push(
          <button
            key={`${r}:${c}`}
            type="button"
            title={
              selId !== null
                ? "Click to move the selected bed here"
                : "Click to add a bed"
            }
            onClick={() => handleTapEmpty(r, c)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              dropOnCell(r, c);
            }}
            onDragEnter={() => {
              if (dragId.current !== null) setOverEmpty(`${r}:${c}`);
            }}
            onDragLeave={() => setOverEmpty(null)}
            className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-2 transition-colors ${
              overEmpty === `${r}:${c}` && dragId.current !== null
                ? "border-cyan-400 bg-cyan-500/15"
                : selId !== null
                  ? "border-cyan-400/50 bg-cyan-500/5 text-cyan-300 hover:border-cyan-400"
                  : "border-white/10 text-slate-500 hover:border-cyan-400/40 hover:text-cyan-300"
            }`}
          >
            <span className="text-[10px] font-semibold">R{r}C{c}</span>
            <span className="text-xs font-semibold">
              {selId !== null ? "move here" : "+ add bed"}
            </span>
          </button>,
        );
      }
    }
  }

  return (
    <>
      <div className="rounded-xl border border-white/5 bg-[#11183a] p-4 shadow-lg shadow-black/20">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cells}
        </div>
      </div>

      {confirm && confirm.cadet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151d42] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Confirm Red Alert
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                {confirm.cadet.name}
              </span>{" "}
              will be assigned drill duty and an SMS will be sent to
              supervisors and drill instructors.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["ED", "HED"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDrillType(t)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    drillType === t
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-white/10 text-slate-500 hover:border-cyan-400/40"
                  }`}
                >
                  {t === "ED" ? "Extra Drill" : "House Extra Drill"}
                  <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                    {t === "ED" ? "Regular ED" : "HED with house detail"}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAlert(confirm, "red", drillType);
                  setConfirm(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Confirm {drillType}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
