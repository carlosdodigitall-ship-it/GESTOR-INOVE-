"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export default function Cadastro() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanPhone = phone.trim();

      if (!cleanName || !cleanPhone || !cleanEmail || password.length < 6) {
        setError("Preencha todos os campos. A senha deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            organization_name: cleanName || "Minha empresa",
          },
        },
      });

      if (signUpError) {
        const msg = String(signUpError.message || "").toLowerCase();
        if (
          msg.includes("user already registered") ||
          msg.includes("already registered") ||
          msg.includes("already exists")
        ) {
          setError("Este e-mail já possui uma conta no CloudZap. Entre com seus dados na página de login.");
        } else {
          setError("Não foi possível criar a conta: " + signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Envio de boas-vindas assíncrono best-effort
      fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail }),
      }).catch(() => {});

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        // Conta criada, aguardando confirmação ou login direto
        setSuccess(true);
      }
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      setError("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#bfdbfe,_transparent_32%),linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <section className="hidden rounded-[2.5rem] bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6] p-10 text-white shadow-2xl shadow-blue-900/15 lg:block">
          <Logo />
          <div className="mt-20">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              <Sparkles size={16} /> Comece sua organização
            </span>
            <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight">
              Seu negócio mais organizado começa aqui.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-blue-50">
              Clientes, cobranças, recorrências e WhatsApp Z-API integrados em uma experiência profissional.
            </p>
            <div className="mt-8 space-y-4 text-sm font-semibold">
              <p>
                <Check className="mr-2 inline text-blue-200" /> Cadastro rápido e seguro
              </p>
              <p>
                <Check className="mr-2 inline text-blue-200" /> Dashboard com dados em tempo real
              </p>
              <p>
                <Check className="mr-2 inline text-blue-200" /> WhatsApp Z-API e cobranças automáticas
              </p>
            </div>
          </div>
        </section>

        <section className="w-full rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5 sm:p-9">
          <div className="mb-7 flex justify-center lg:hidden">
            <Logo />
          </div>

          {success ? (
            <div className="py-8 text-center space-y-5">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Conta criada com sucesso!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Sua conta foi cadastrada no CloudZap. Se a confirmação de e-mail estiver ativada no seu Supabase,
                verifique sua caixa de entrada. Você já pode fazer login para acessar o painel.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-blue-700 py-4 font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 transition"
                >
                  <span>Ir para o Login</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-extrabold uppercase tracking-widest text-blue-700">CloudZap</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Crie sua conta</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Configure seu acesso e comece a organizar sua operação e cobranças.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <label className="block text-sm font-bold text-slate-700">
                  Nome
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={field}
                    placeholder="Seu nome completo"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  WhatsApp
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    type="tel"
                    className={field}
                    placeholder="(75) 99999-9999"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  E-mail
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    autoComplete="email"
                    className={field}
                    placeholder="voce@email.com"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Senha
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    type="password"
                    autoComplete="new-password"
                    className={field}
                    placeholder="Mínimo de 6 caracteres"
                  />
                </label>

                <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-500">
                  <input type="checkbox" required className="mt-1 accent-blue-600" />
                  <span>Concordo com os termos de uso do CloudZap.</span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
                  >
                    <p>{error}</p>
                    {error.includes("já possui uma conta") && (
                      <Link href="/login" className="mt-2 inline-flex font-black text-red-800 underline">
                        Ir para o login
                      </Link>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500 py-4 font-black text-white shadow-lg shadow-blue-700/20 transition hover:from-blue-900 hover:via-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Criando sua conta..." : "Criar minha conta"}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                <ShieldCheck size={15} className="text-blue-600" /> Seus dados são protegidos
              </div>

              <div className="mt-5 text-center">
                <p className="text-sm text-slate-500">
                  Já possui conta?{" "}
                  <Link href="/login" className="font-black text-blue-700 hover:text-blue-800">
                    Entrar
                  </Link>
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Suporte:{" "}
                  <a href="mailto:suporte@cloudzapweb.site" className="font-bold text-blue-700">
                    suporte@cloudzapweb.site
                  </a>
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
