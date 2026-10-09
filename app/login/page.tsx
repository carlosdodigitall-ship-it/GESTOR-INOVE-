"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Erro no login:", err);
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_#bfdbfe,_transparent_35%),linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#f8fafc_100%)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center"><Logo /></div>
        <section className="rounded-3xl border border-blue-100 bg-white p-6 text-slate-900 shadow-xl shadow-blue-900/10 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">Área do cliente</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Entrar no CloudZap</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Acesse sua conta para continuar.</p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <label className="block text-sm font-bold text-slate-800">
              E-mail
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="email" placeholder="voce@email.com" className={fieldClass} />
            </label>
            <label className="block text-sm font-bold text-slate-800">
              <span className="flex items-center justify-between gap-3">
                <span>Senha</span>
                <Link href="/recuperar-senha" className="text-xs font-bold text-blue-700 hover:text-blue-900">Esqueci minha senha</Link>
              </span>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password" placeholder="Digite sua senha" className={fieldClass} />
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-800 via-blue-700 to-blue-500 py-3.5 font-extrabold text-white shadow-lg shadow-blue-700/20 transition hover:from-blue-900 hover:via-blue-800 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar na minha conta"}
            </button>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-600">Ainda não tem conta? <Link href="/cadastro" className="font-extrabold text-blue-700 hover:text-blue-900">Criar cadastro</Link></p>
            <p className="mt-3 text-xs text-slate-500">Precisa de ajuda? <a href="mailto:suporte@cloudzapweb.site" className="font-bold text-blue-700 hover:text-blue-900">suporte@cloudzapweb.site</a></p>
          </div>
        </section>
      </div>
    </main>
  );
}
