"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function RedefinirSenha() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setError("");
      }
    });

    const timer = window.setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setReady(true);
      } else {
        setError("O link de recuperação é inválido ou expirou. Solicite um novo link.");
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
        return;
      }

      setMessage("Senha atualizada com sucesso! Você já pode entrar com a nova senha.");
      window.setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
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
          <h1 className="text-2xl font-black text-slate-950">Criar nova senha</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Defina uma nova senha para voltar a acessar sua conta CloudZap.
          </p>

          {!ready && !error && (
            <div className="mt-7 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">
              Validando o link de recuperação...
            </div>
          )}

          {ready && (
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Nova senha
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Confirmar nova senha
                <input
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          )}

          {error && !ready && (
            <div className="mt-6">
              <Link href="/recuperar-senha" className="text-sm font-bold text-blue-700 hover:text-blue-800">
                Solicitar novo link
              </Link>
            </div>
          )}

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
