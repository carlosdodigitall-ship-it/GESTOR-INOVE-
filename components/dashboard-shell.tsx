"use client";

import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { Sidebar } from "./sidebar";

export function DashboardShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="md:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#090e1a]/85 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:border-slate-700 hover:text-white transition md:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-black tracking-tight text-white">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              title="Notificações"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-blue-500/40 hover:text-blue-400 transition"
            >
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 py-1 px-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 text-xs font-black text-white shadow-md shadow-blue-500/20">
                CZ
              </div>
              <span className="hidden text-xs font-bold text-slate-300 sm:inline-block">
                CloudZap
              </span>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
