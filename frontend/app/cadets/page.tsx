"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Cadet, type Dorm } from "@/lib/api";
import AppShell from "@/components/AppShell";

type FormState = { name: string; house_id: number; cadet_class: string };
const EMPTY_FORM: FormState = { name: "", house_id: 0, cadet_class: "" };

export default function CadetsPage() {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Cadet | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Cadet | null>(null);

  const houses = Array.from(
    new Map(dorms.map((d) => [d.house.id, d.house])).values(),
  );

  const refresh = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([api.cadets(), api.dorms()]);
      setCadets(c);
      setDorms(d);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      house_id: houses[0]?.id ?? 0,
    });
    setModalOpen(true);
  };

  const openEdit = (c: Cadet) => {
    setEditing(c);
    setForm({ name: c.name, house_id: c.house_id, cadet_class: c.cadet_class });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.house_id) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        house_id: form.house_id,
        cadet_class: form.cadet_class.trim(),
      };
      if (editing) {
        await api.updateCadet(editing.id, payload);
      } else {
        await api.createCadet(payload);
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteCadet(deleting.id);
      setDeleting(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const houseName = (id: number) =>
    houses.find((h) => h.id === id)?.name ?? "—";

  return (
    <AppShell
      title="Cadets"
      subtitle="Student register — names, classes and houses"
      actions={
        <button
          onClick={openAdd}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + Add cadet
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="anim-fade-up overflow-hidden rounded-xl border border-white/5 bg-[#11183a] shadow-lg shadow-black/20">
        <div className="border-b border-white/5 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Student register · {cadets.length} cadets
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Class</th>
                <th className="px-5 py-3 font-semibold">House</th>
                <th className="px-5 py-3 font-semibold">Flank</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cadets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No cadets yet — add cadets and assign beds in each flank.
                  </td>
                </tr>
              )}
              {cadets.map((c) => {
                const dorm = dorms.find((d) => d.id === c.dorm_id);
                return (
                  <tr key={c.id} className="transition-colors hover:bg-white/5">
                    <td className="px-5 py-3 font-semibold text-slate-700">
                      {c.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.cadet_class}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                        {houseName(c.house_id)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {dorm?.name ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded px-2 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleting(c)}
                        className="ml-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="anim-pop w-full max-w-md rounded-2xl border border-white/10 bg-[#151d42] p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-bold text-white">
              {editing ? "Edit cadet" : "Add cadet"}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Full name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Cadet Aditya Singh"
              className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Class
            </label>
            <input
              value={form.cadet_class}
              onChange={(e) => setForm({ ...form, cadet_class: e.target.value })}
              placeholder="e.g. IX-B"
              className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              House
            </label>
            <select
              value={form.house_id}
              onChange={(e) =>
                setForm({ ...form, house_id: Number(e.target.value) })
              }
              className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            >
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
            <p className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-300">
              Tip: assign this cadet to a bed by editing the flank map.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy || !form.name.trim() || !form.house_id}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="anim-pop w-full max-w-sm rounded-2xl border border-white/10 bg-[#151d42] p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-white">
              Delete {deleting.name}?
            </h3>
            <p className="mb-5 text-sm text-slate-500">
              Their bed will be freed and their records removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
