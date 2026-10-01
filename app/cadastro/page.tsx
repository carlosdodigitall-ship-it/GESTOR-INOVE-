export const dynamic = "force-dynamic";

"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Cadastro() {
  const router = useRouter();
  const supabase = createClient();
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [loading,setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone, organization_name: name || "Minha empresa" } }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setNotice("Cadastro criado. Se a confirmação de e-mail estiver ativada no Supabase, confirme o e-mail antes de entrar.");
    setLoading(false);
  }

  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8">
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center"><Logo/></div>
      <div className="rounded-3xl border bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-black">Criar sua conta</h1>
        <p className="mt-2 text-sm text-slate-500">Comece com seus dados básicos.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-sm font-semibold">Nome<input value={name} onChange={e=>setName(e.target.value)} required className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Seu nome"/></label>
          <label className="block text-sm font-semibold">WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} required type="tel" className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="(75) 99999-9999"/></label>
          <label className="block text-sm font-semibold">E-mail<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email" className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="voce@email.com"/></label>
          <label className="block text-sm font-semibold">Senha<input value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} type="password" autoComplete="new-password" className="mt-2 w-full rounded-xl border px-4 py-3" placeholder="Mínimo de 6 caracteres"/></label>
          <label className="flex gap-2 text-xs text-slate-500"><input type="checkbox" required/> Concordo com os termos.</label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
          {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white disabled:opacity-60">{loading ? "Criando..." : "Criar minha conta"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Já possui conta? <Link href="/login" className="font-bold text-blue-600">Entrar</Link></p>
      </div>
    </div>
  </main>;
}
