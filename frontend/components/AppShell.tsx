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
      const res = await fetch(`${serverUrl.replace(/\/+$/, "")}/api/health`);
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

  const navMain = [
    { href: "/", icon: "◧", label: "Dashboard" },
    { href: "/contacts", icon: "☎", label: "Contacts" },
    { href: "/cadets", icon: "✧", label: "Cadets" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0b1026] text-slate-200">
      <div
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-[#0e1430] transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-900/50">
            SSA
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-white">
              Sainik School
            </p>
            <p className="text-xs font-semibold text-cyan-400">Ambikapur</p>
            <p className="text-[10px] text-slate-500">
              Dormitory Discipline System
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Main
          </p>
          {navMain.map((n) => (
            <NavLink key={n.href} href={n.href} active={pathname === n.href} icon={n.icon}>
              {n.label}
            </NavLink>
          ))}

          <p className="px-2 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Flanks
          </p>
          {dorms.map((d) => (
            <NavLink
              key={d.id}
              href={`/dorms/${d.id}`}
              active={pathname === `/dorms/${d.id}`}
              icon="▦"
              badge={d.house.code}
            >
              {d.name}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 px-5 py-4">
          <a
            href="/HED.apk"
            className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            download
          >
            <span>📱 Android App</span>
            <span className="text-cyan-400">HED.apk</span>
          </a>
          <p className="text-[10px] text-slate-600">
            Character is the highest virtue
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/5 bg-[#0b1026]/85 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 lg:hidden"
              title="Menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-white md:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:gap-4">
            {actions}
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">
                LIVE
              </span>
            </div>
            <div className="hidden text-right text-xs text-slate-500 lg:block">
              <p className="font-semibold text-slate-300">
                {now.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="tabular-nums">{now.toLocaleTimeString("en-IN")}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-600 text-xs font-bold text-white">
              DR
            </span>
            <button
              onClick={() => setShowSettings(true)}
              title="Server settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-slate-300 transition-colors hover:bg-white/10"
            >
              ⚙
            </button>
          </div>
        </header>

        <main className="anim-fade-up flex-1 p-4 md:p-6">{children}</main>

        <footer className="border-t border-white/5 bg-[#0b1026] px-6 py-3 text-center text-[11px] text-slate-600">
          Sainik School Ambikapur · Digital Dormitory Discipline & Alert
          System · ED/HED + SMS alerts
        </footer>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11183a] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Server settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              Address of the school server running the alert system (example:
              http://192.168.1.39:8000)
            </p>
            <input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.39:8000"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={testConnection}
                disabled={testing}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                {testing ? "Testing…" : "Test connection"}
              </button>
              {testResult !== null && (
                <span
                  className={`text-xs font-semibold ${
                    testResult ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {testResult ? "✓ Connected" : "✕ Could not connect"}
                </span>
              )}
            </div>
            <button
              onClick={saveServerUrl}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 py-2 text-sm font-bold text-white hover:opacity-90"
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-cyan-500/20 to-indigo-600/20 text-white shadow-inner ring-1 ring-cyan-400/30"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-md text-sm ${
          active
            ? "bg-gradient-to-br from-cyan-400 to-indigo-600 text-white"
            : "bg-white/5 text-slate-400"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
          {badge}
        </span>
      )}
    </Link>
  );
}
