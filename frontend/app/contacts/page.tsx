"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Contact } from "@/lib/api";
import AppShell from "@/components/AppShell";

type FormState = { name: string; role: string; phone: string };
const EMPTY_FORM: FormState = { name: "", role: "supervisor", phone: "" };
const ROLES = [
  ["supervisor", "Supervisor"],
  ["drill_instructor", "Drill Instructor"],
  ["admin", "Admin"],
] as const;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const refresh = useCallback(async () => {
    try {
      setContacts(await api.contacts());
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
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, role: c.role, phone: c.phone });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await api.updateContact(editing.id, form);
      } else {
        await api.createContact(form);
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
      await api.deleteContact(deleting.id);
      setDeleting(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Contacts"
      subtitle="Staff phone numbers used for ED/HED alert SMS"
      actions={
        <button
          onClick={openAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          + Add contact
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="anim-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Staff directory · {contacts.length} entries
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                    No contacts yet — add the school duty staff.
                  </td>
                </tr>
              )}
              {contacts.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {c.name}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold capitalize text-blue-700">
                      {c.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-slate-600">
                    {c.phone}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="anim-pop w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-bold text-slate-800">
              {editing ? "Edit contact" : "Add contact"}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Full name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Capt. R. Sharma"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Phone (with country code)
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy || !form.name.trim() || !form.phone.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="anim-pop w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-800">
              Delete {deleting.name}?
            </h3>
            <p className="mb-5 text-sm text-slate-500">
              They will no longer receive alert SMS messages.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
