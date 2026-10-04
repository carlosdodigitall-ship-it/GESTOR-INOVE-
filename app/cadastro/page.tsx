"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

export default function Cadastro() {
  const router=useRouter();
  const [name,setName]=useState(""); const [phone,setPhone]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [loading,setLoading]=useState(false);
  async function handleSubmit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(loading)return; setError("");setNotice("");setLoading(true);
    try{
      const supabase=createClient(); const cleanEmail=email.trim().toLowerCase(),cleanName=name.trim(),cleanPhone=phone.trim();
      if(!cleanName||!cleanPhone||!cleanEmail||password.length<6){setError("Preencha todos os campos. A senha deve ter pelo menos 6 caracteres.");return;}
      const {data,error}=await supabase.auth.signUp({email:cleanEmail,password,options:{data:{full_name:cleanName,phone:cleanPhone,organization_name:cleanName||"Minha empresa"}}});
      if(error){
        const msg=String(error.message||"").toLowerCase();
        if(msg.includes("user already registered")||msg.includes("already registered")||msg.includes("already exists")){
          setError("Este e-mail já possui uma conta no CloudZap. Entre com seus dados na página de login.");
        }else{
          setError("Não foi possível criar a conta: "+error.message);
        }
        return;
      }
      if(!data.session){setError("A conta foi criada, mas o login automático não foi liberado. Confirme que 'Confirm email' está desativado no Supabase.");return;}
      try{const r=await fetch("/api/email/welcome",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:cleanName,email:cleanEmail})});if(!r.ok)console.warn("Conta criada, mas o e-mail de boas-vindas não foi enviado.");}catch(err){console.warn("Conta criada, mas o envio do e-mail falhou:",err);}
      router.replace("/dashboard");router.refresh();
    }catch(err){console.error("Erro no cadastro:",err);setError("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");}
    finally{setLoading(false);}
  }
  const field="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#bbf7d0,_transparent_32%),linear-gradient(135deg,#ecfdf5_0%,#ffffff_55%,#f7fee7_100%)] px-4 py-8 md:px-8">
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden rounded-[2.5rem] bg-gradient-to-br from-[#022c22] via-[#047857] to-[#84cc16] p-10 text-white shadow-2xl shadow-emerald-900/15 lg:block">
        <Logo/>
        <div className="mt-20"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold"><Sparkles size={16}/> Comece sua organização</span>
        <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight">Seu negócio mais organizado começa aqui.</h2>
        <p className="mt-5 max-w-md text-lg leading-8 text-emerald-50">Clientes, cobranças, recorrências e financeiro em uma experiência simples e profissional.</p>
        <div className="mt-8 space-y-4 text-sm font-semibold"><p><Check className="mr-2 inline text-emerald-200"/> Cadastro rápido e seguro</p><p><Check className="mr-2 inline text-emerald-200"/> Dashboard com dados reais</p><p><Check className="mr-2 inline text-emerald-200"/> Acesso online pelo navegador</p></div></div>
      </section>
      <section className="w-full rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-900/5 sm:p-9">
        <div className="mb-7 flex justify-center lg:hidden"><Logo/></div>
        <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-700">CloudZap</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Crie sua conta</h1><p className="mt-2 text-sm leading-6 text-slate-500">Configure seu acesso e comece a organizar sua operação.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-sm font-bold text-slate-700">Nome<input value={name} onChange={e=>setName(e.target.value)} required className={field} placeholder="Seu nome completo"/></label>
          <label className="block text-sm font-bold text-slate-700">WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} required type="tel" className={field} placeholder="(75) 99999-9999"/></label>
          <label className="block text-sm font-bold text-slate-700">E-mail<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email" className={field} placeholder="voce@email.com"/></label>
          <label className="block text-sm font-bold text-slate-700">Senha<input value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} type="password" autoComplete="new-password" className={field} placeholder="Mínimo de 6 caracteres"/></label>
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-500"><input type="checkbox" required className="mt-1 accent-emerald-600"/><span>Concordo com os termos de uso do CloudZap.</span></label>
          {error&&<div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"><p>{error}</p>{error.includes("já possui uma conta")&&<Link href="/login" className="mt-2 inline-flex font-black text-red-800 underline">Ir para o login</Link>}</div>}
          {notice&&<p role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-600 to-lime-500 py-4 font-black text-white shadow-lg shadow-emerald-700/20 transition hover:from-emerald-900 hover:via-emerald-700 hover:to-lime-600 disabled:cursor-not-allowed disabled:opacity-60">{loading?"Criando sua conta...":"Criar minha conta"}</button>
        </form>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400"><ShieldCheck size={15} className="text-emerald-600"/> Seus dados são protegidos</div>
        <div className="mt-5 text-center">
          <p className="text-sm text-slate-500">Já possui conta? <Link href="/login" className="font-black text-emerald-700 hover:text-emerald-800">Entrar</Link></p>
          <p className="mt-3 text-xs text-slate-400">Suporte: <a href="mailto:suporte@cloudzapweb.site" className="font-bold text-emerald-700">suporte@cloudzapweb.site</a></p>
        </div>
      </section>
    </div>
  </main>;
}