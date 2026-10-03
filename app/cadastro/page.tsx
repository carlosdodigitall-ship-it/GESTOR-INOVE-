"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Cadastro() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanPhone = phone.trim();

      if (!cleanName || !cleanPhone || !cleanEmail || password.length < 6) {
        setError("Preencha todos os campos corretamente. A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
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

      if (error) {
        setError(`Não foi possível criar a conta: ${error.message}`);
        return;
      }

      if (!data.session) {
        setError("A conta foi criada, mas o login automático não foi liberado. Confirme que 'Confirm email' está desativado no Supabase.");
        return;
      }

      // O envio é separado da criação da conta: uma falha no e-mail não apaga o cadastro.
      try {
        const emailResponse = await fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName, email: cleanEmail }),
        });

        if (!emailResponse.ok) {
          console.warn("Conta criada, mas o e-mail de boas-vindas não foi enviado.");
        }
      } catch (emailError) {
        console.warn("Conta criada, mas o envio do e-mail falhou:", emailError);
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Erro no cadastro:", err);
      setError("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-3xl border bg-white p-7 shadow-xl">
          <h1 className="text-2xl font-black">Criar sua conta no Gestor Zap V2</h1>
          <p className="mt-2 text-sm text-slate-500">Comece agora no Gestor Zap V2.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold">
              Nome
              <input value={name} onChange={e => setName(e.target.value)} required className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Seu nome" />
            </label>

            <label className="block text-sm font-semibold">
              WhatsApp
              <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="(75) 99999-9999" />
            </label>

            <label className="block text-sm font-semibold">
              E-mail
              <input value={email} onChange={e => setEmail(e.target.value)} required type="email" autoComplete="email" className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="voce@email.com" />
            </label>

            <label className="block text-sm font-semibold">
              Senha
              <input value={password} onChange={e => setPassword(e.target.value)} required minLength={6} type="password" autoComplete="new-password" className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Mínimo de 6 caracteres" />
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-500">
              <input type="checkbox" required className="mt-0.5" />
              <span>Concordo com os termos.</span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Criando conta..." : "Criar minha conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já possui conta? <Link href="/login" className="font-bold text-blue-600">Entrar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
