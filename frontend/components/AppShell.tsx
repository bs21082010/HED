"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, getApiUrl, setApiUrl, type Dorm } from "@/lib/api";

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | boolean>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const load = async () => {
      try {
        setDorms(await api.dorms());
      } catch {
        /* offline badge shows in pages */
      }
    };
    load();
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (showSettings) {
      setServerUrl(getApiUrl());
      setTestResult(null);
    }
  }, [showSettings]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${serverUrl.replace(/\/+$/, "")}/api/dorms`);
      setTestResult(res.ok);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const saveServerUrl = () => {
    setApiUrl(serverUrl);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen">
      <div
        className={`fixed inset-0 z-30 bg-slate-900/60 transition-opacity lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-black text-slate-900 shadow-lg">
            SSA
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-white">
              Sainik School
            </p>
            <p className="text-xs font-semibold text-amber-400">Ambikapur</p>
            <p className="text-[10px] text-slate-500">
              Dormitory Discipline System
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Main
          </p>
          <NavLink href="/" active={pathname === "/"} icon="◧">
            Dashboard
          </NavLink>
          <NavLink
            href="/contacts"
            active={pathname === "/contacts"}
            icon="☎"
          >
            Contacts
          </NavLink>
          <NavLink href="/cadets" active={pathname === "/cadets"} icon="✧">
            Cadets
          </NavLink>

          <p className="px-2 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Flanks
          </p>
          {dorms.map((d) => (
            <NavLink
              key={d.id}
              href={`/dorms/${d.id}`}
              active={pathname === `/dorms/${d.id}`}
              icon="▦"
              badge={d.house.name.split(" ")[0]}
            >
              {d.name}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4">
          <p className="text-[10px] text-slate-600">
            Character is the highest virtue
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden"
              title="Menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-800 md:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:gap-4">
            {actions}
            <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-700">
                LIVE
              </span>
            </div>
            <div className="hidden text-right text-xs text-slate-500 lg:block">
              <p className="font-semibold text-slate-700">
                {now.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="tabular-nums">{now.toLocaleTimeString("en-IN")}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-bold text-white">
              DR
            </span>
            <button
              onClick={() => setShowSettings(true)}
              title="Server settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base text-slate-600 transition-colors hover:bg-slate-100"
            >
              ⚙
            </button>
          </div>
        </header>

        <main className="anim-fade-up flex-1 p-4 md:p-6">{children}</main>

        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-[11px] text-slate-400">
          Sainik School Ambikapur · Digital Dormitory Discipline & Alert
          System · ED/HED + SMS alerts
        </footer>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                Server settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Address of the school server that runs the alert system
              (example: http://192.168.1.34:8000)
            </p>
            <input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.34:8000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={testConnection}
                disabled={testing}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {testing ? "Testing…" : "Test connection"}
              </button>
              {testResult !== null && (
                <span
                  className={`text-xs font-semibold ${
                    testResult ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {testResult ? "✓ Connected" : "✕ Could not connect"}
                </span>
              )}
            </div>
            <button
              onClick={saveServerUrl}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Save & reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  badge,
  children,
}: {
  href: string;
  active: boolean;
  icon: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white shadow"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">
          {badge}
        </span>
      )}
    </Link>
  );
}
