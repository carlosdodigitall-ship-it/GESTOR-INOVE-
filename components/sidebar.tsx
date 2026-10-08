"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Repeat2,
  WalletCards,
  X,
  Tag,
  Layers3,
  LogOut,
  ChevronDown,
  PlugZap,
  ShieldCheck,
  BarChart3,
  MessageCircle,
  Settings,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Logo } from "./logo";
import { createClient } from "@/lib/supabase/client";

interface SubItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

interface MenuItem {
  key: string;
  label: string;
  href?: string;
  icon: any;
  badge?: string;
  subItems?: SubItem[];
}

interface NavSection {
  title: string;
  items: MenuItem[];
}

const navSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        key: "clientes",
        label: "Clientes",
        href: "/clientes",
        icon: Users,
      },
    ],
  },
  {
    title: "Financeiro & Vendas",
    items: [
      {
        key: "financeiro_group",
        label: "Cobranças & Caixa",
        icon: ReceiptText,
        subItems: [
          { label: "Cobranças", href: "/cobrancas", icon: ReceiptText },
          { label: "Recorrências", href: "/recorrencias", icon: Repeat2 },
          { label: "Fluxo Financeiro", href: "/financeiro", icon: WalletCards },
          { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
        ],
      },
      {
        key: "catalogo_group",
        label: "Planos & Catálogo",
        icon: Layers3,
        subItems: [
          { label: "Planos", href: "/planos", icon: Layers3 },
          { label: "Categorias", href: "/categorias", icon: Tag },
        ],
      },
    ],
  },
  {
    title: "Comunicação & Conexões",
    items: [
      {
        key: "whatsapp",
        label: "WhatsApp",
        href: "/whatsapp",
        icon: MessageCircle,
        badge: "Z-API",
      },
      {
        key: "integracoes",
        label: "Integrações",
        href: "/integracoes",
        icon: PlugZap,
      },
    ],
  },
  {
    title: "Sistema & Suporte",
    items: [
      {
        key: "configuracoes",
        label: "Configurações",
        href: "/configuracoes",
        icon: Settings,
      },
      {
        key: "tutoriais",
        label: "Tutoriais & Ajuda",
        href: "/tutoriais",
        icon: HelpCircle,
      },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    financeiro_group: true,
    catalogo_group: false,
  });

  useEffect(() => {
    fetch("/api/admin", { cache: "no-store" })
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, []);

  // Abre automaticamente o submenu correspondente à rota atual
  useEffect(() => {
    navSections.forEach((section) => {
      section.items.forEach((item) => {
        if (
          item.subItems &&
          item.subItems.some((sub) => path === sub.href || path.startsWith(sub.href + "/"))
        ) {
          setOpenSubmenus((prev) => ({ ...prev, [item.key]: true }));
        }
      });
    });
  }, [path]);

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function logout() {
    setLoading(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      {/* Overlay Mobile */}
      <div
        onClick={onClose}
        className={
          "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity md:hidden " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      {/* Sidebar Container */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col border-r border-slate-800/80 bg-[#090e1a] text-slate-200 transition-transform duration-300 md:translate-x-0 " +
          (open ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full")
        }
      >
        {/* Header com Logo */}
        <div className="flex h-[72px] items-center justify-between border-b border-slate-800/80 bg-[#070b14]/60 px-5">
          <Logo dark />
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800/60 hover:text-white transition md:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de Navegação com Grupos e Submenus */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {section.title}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon;

                // Item COM submenu
                if (item.subItems) {
                  const isOpen = !!openSubmenus[item.key];
                  const hasActiveChild = item.subItems.some(
                    (sub) => path === sub.href || path.startsWith(sub.href + "/")
                  );

                  return (
                    <div key={item.key} className="space-y-1">
                      <button
                        onClick={() => toggleSubmenu(item.key)}
                        className={
                          "group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-[14px] font-semibold transition " +
                          (hasActiveChild
                            ? "bg-blue-950/40 text-blue-300 border border-blue-900/40"
                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition " +
                              (hasActiveChild
                                ? "bg-blue-600/20 text-blue-400"
                                : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-700/60 group-hover:text-blue-400")
                            }
                          >
                            <Icon size={18} strokeWidth={2.1} />
                          </span>
                          <span>{item.label}</span>
                        </div>

                        <ChevronDown
                          size={16}
                          className={
                            "transition-transform duration-200 " +
                            (isOpen ? "rotate-180 text-blue-400" : "text-slate-500")
                          }
                        />
                      </button>

                      {/* Submenu retrátil com setinha e linha guia */}
                      {isOpen && (
                        <div className="ml-4 pl-3.5 border-l border-slate-800/80 space-y-1 pt-0.5 pb-1">
                          {item.subItems.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive =
                              path === sub.href || path.startsWith(sub.href + "/");

                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onClose}
                                className={
                                  "group flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition " +
                                  (isSubActive
                                    ? "bg-gradient-to-r from-blue-600/30 to-blue-500/10 text-white font-bold border-l-2 border-blue-400 shadow-sm"
                                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200")
                                }
                              >
                                <SubIcon
                                  size={15}
                                  strokeWidth={2}
                                  className={
                                    isSubActive
                                      ? "text-blue-400"
                                      : "text-slate-500 group-hover:text-slate-300"
                                  }
                                />
                                <span className="flex-1">{sub.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Item SEM submenu
                const isActive = item.href ? path === item.href || path.startsWith(item.href + "/") : false;

                return (
                  <Link
                    key={item.key}
                    href={item.href || "#"}
                    onClick={onClose}
                    className={
                      "group flex min-h-[44px] items-center justify-between rounded-xl px-3 text-[14px] font-semibold transition " +
                      (isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-bold"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition " +
                          (isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-700/60 group-hover:text-blue-400")
                        }
                      >
                        <Icon size={18} strokeWidth={2.1} />
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={
                          "rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide uppercase transition " +
                          (isActive
                            ? "bg-white/25 text-white"
                            : "bg-blue-500/20 text-blue-400 border border-blue-400/30")
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Painel Administrativo caso o usuário seja Admin */}
          {isAdmin && (
            <div className="pt-2">
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Super Admin
              </div>
              <Link
                href="/admin"
                onClick={onClose}
                className={
                  "group flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition " +
                  (path.startsWith("/admin")
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white")
                }
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-950/60 text-purple-400">
                  <ShieldCheck size={18} />
                </span>
                <span className="flex-1">Administração</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Card CloudZap Pro em degradê azul escuro */}
        <div className="px-3.5 pb-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/90 via-blue-900/50 to-slate-900/90 border border-blue-500/30 p-3.5 text-white shadow-xl shadow-blue-950/40">
            <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-blue-500/15 blur-lg pointer-events-none" />
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-black tracking-tight">CloudZap Gestor</p>
                <p className="text-[10px] text-blue-200/80">Painel & WhatsApp Z-API</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com botão Sair */}
        <div className="border-t border-slate-800/80 p-3">
          <button
            onClick={() => setConfirm(true)}
            className="group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-transparent hover:border-red-900/30 transition"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-950/40 text-red-400 group-hover:bg-red-900/50 group-hover:text-red-300 transition">
              <LogOut size={16} />
            </span>
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Modal de Confirmação de Saída com Tema Escuro */}
      {confirm && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#0c1222] p-6 text-white shadow-2xl">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-950/60 text-red-400 border border-red-900/50">
              <LogOut size={22} />
            </div>
            <h2 className="mt-5 text-xl font-black text-white">Sair da plataforma?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Tem certeza que deseja sair? Sua sessão será finalizada com segurança.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                disabled={loading}
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                disabled={loading}
                onClick={logout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 transition shadow-lg shadow-red-600/30"
              >
                {loading ? "Saindo..." : "Sim, sair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
