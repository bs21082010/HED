"use client";

import { useRef, useState } from "react";
import { api, type LayoutItem } from "@/lib/api";

type Detection = {
  bbox: [number, number, number, number];
  score: number;
};

let modelPromise: Promise<any> | null = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      return cocoSsd.load();
    })();
  }
  return modelPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function locationLabel(xFrac: number, yFrac: number): string {
  const vertical = yFrac < 0.33 ? "Window side" : yFrac > 0.66 ? "Door side" : "Centre";
  const horizontal = xFrac < 0.35 ? "· left wall" : xFrac > 0.65 ? "· right wall" : "";
  return `${vertical}${horizontal}`;
}

function analyse(img: HTMLImageElement, detections: Detection[]) {
  const items = detections.map((d) => ({
    x: d.bbox[0] + d.bbox[2] / 2,
    y: d.bbox[1] + d.bbox[3] / 2,
    h: d.bbox[3],
  }));
  items.sort((a, b) => a.y - b.y);

  const avgH = items.reduce((s, it) => s + it.h, 0) / items.length;
  const tolerance = Math.max(img.height * 0.05, avgH * 0.45);

  const rows: { x: number; y: number }[][] = [];
  for (const it of items) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(it.y - last[0].y) <= tolerance && it.y - last[last.length - 1].y <= tolerance) {
      last.push(it);
    } else {
      rows.push([it]);
    }
  }

  const layout: LayoutItem[] = [];
  let cols = 0;
  rows.forEach((rowItems, r) => {
    rowItems.sort((a, b) => a.x - b.x);
    rowItems.forEach((it, c) => {
      layout.push({
        row: r + 1,
        col: c + 1,
        location: locationLabel(it.x / img.width, it.y / img.height),
      });
    });
    cols = Math.max(cols, rowItems.length);
  });

  return { beds: layout, rows: rows.length, cols: Math.max(cols, 1) };
}

export default function Scanner({
  dormId,
  onApplied,
  onClose,
}: {
  dormId: string | number;
  onApplied: (summary: string) => void;
  onClose: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<Detection[]>([]);
  const [layout, setLayout] = useState<{ rows: number; cols: number; beds: LayoutItem[] } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setBoxes([]);
    setLayout(null);
    setSummary(null);
    setError(null);
  };

  const scan = async () => {
    if (!image) return;
    setBusy(true);
    setError(null);
    try {
      const img = await loadImage(image);
      const model = await getModel();
      const predictions = await model.detect(img);

      const beds = (predictions as any[])
        .filter((p) => p.class === "bed" && p.score >= 0.25)
        .map((p) => ({ bbox: p.bbox as [number, number, number, number], score: p.score }));

      if (beds.length === 0) {
        setBoxes([]);
        setLayout(null);
        setError(
          "No beds detected in the photo. Try a clearer top-down shot with the whole room visible.",
        );
        return;
      }

      setBoxes(beds);
      const result = analyse(img, beds);
      setLayout(result);
      setSummary(
        `Detected ${beds.length} bed${beds.length > 1 ? "s" : ""} → arranged as ${result.rows} row${result.rows > 1 ? "s" : ""} × ${result.cols} col${result.cols > 1 ? "s" : ""}.`,
      );

      const canvas = canvasRef.current;
      if (canvas && img.complete) {
        canvas.width = 800;
        canvas.height = Math.round((800 / (img.width || 1)) * img.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const scale = canvas.width / (img.width || 1);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3;
          ctx.font = "bold 18px sans-serif";
          for (const d of beds) {
            const [x, y, w, h] = d.bbox;
            ctx.strokeRect(x * scale, y * scale, w * scale, h * scale);
            ctx.fillStyle = "#ef4444";
            ctx.fillText(`${Math.round(d.score * 100)}%`, x * scale + 4, y * scale - 6);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed (model load may need internet)");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!layout) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitLayout(Number(dormId), layout.rows, layout.cols, layout.beds);
      onApplied(`Layout updated: ${layout.rows}×${layout.cols} grid from room scan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply layout");
    } finally {
      setBusy(false);
    }
  };

  const maxW = layout ? Math.max(...layout.beds.map((b) => b.col)) : 1;
  const grid: (LayoutItem | null)[][] = [];
  for (let r = 1; r <= (layout?.rows ?? 0); r++) {
    grid.push(
      Array.from({ length: maxW }, (_, c) =>
        layout?.beds.find((b) => b.row === r && b.col === c + 1) ?? null,
      ),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Scan dorm room</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-blue-400">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span className="text-sm font-semibold text-slate-600">
            {image ? "Choose a different photo…" : "Upload a room photo"}
          </span>
          <span className="mt-1 text-xs text-slate-400">
            A top-down or wide shot works best. Beds are detected in the browser — nothing is uploaded.
          </span>
        </label>

        {image && (
          <button
            onClick={scan}
            disabled={busy}
            className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Analysing…" : layout ? "Re-analyse" : "Analyse room"}
          </button>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {boxes.length > 0 && <canvas ref={canvasRef} className="mb-4 w-full rounded-lg border border-slate-200" />}

        {summary && <p className="mb-3 text-sm font-semibold text-green-700">{summary}</p>}

        {layout && (
          <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Generated layout
              </p>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${maxW}, minmax(0,1fr))` }}>
                {grid.flat().map((item, i) =>
                  item ? (
                    <span
                      key={i}
                      title={item.location}
                      className="rounded bg-blue-100 px-1 py-2 text-center text-[10px] font-semibold text-blue-700"
                    >
                      R{item.row}C{item.col}
                    </span>
                  ) : (
                    <span key={i} className="rounded border border-dashed border-slate-300 py-2" />
                  ),
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={busy}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                Apply layout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}