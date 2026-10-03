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

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-3xl border bg-white p-7 shadow-xl">
          <h1 className="text-2xl font-black">Entrar no CloudZap</h1>
          <p className="mt-2 text-sm text-slate-500">Acesse sua conta.</p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold">
              E-mail
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="email" className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" />
            </label>
            <label className="block text-sm font-semibold">
              Senha
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password" className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Não tem conta? <Link href="/cadastro" className="font-bold text-blue-600">Criar cadastro</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
