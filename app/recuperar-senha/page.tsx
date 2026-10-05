"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        setError("Não foi possível enviar o e-mail de recuperação. Confira o e-mail e tente novamente.");
        return;
      }

      setMessage("Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
    } catch (err) {
      console.error("Erro ao solicitar recuperação:", err);
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_#bfdbfe,_transparent_35%),linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#f8fafc_100%)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-3xl border bg-white p-7 shadow-xl">
          <h1 className="text-2xl font-black text-slate-950">Recuperar senha</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Informe o e-mail da sua conta. Enviaremos um link seguro para criar uma nova senha.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              E-mail
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:from-blue-900 hover:via-blue-700 hover:to-blue-600 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm font-bold text-blue-700 hover:text-blue-800">
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
