"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, Search, X, Loader2, TrendingUp, DollarSign } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";

type Deal = { id: string; title: string; company_name: string | null; contact_name: string | null; contact_phone: string | null; value: number; stage: string; source: string | null; next_action: string | null; created_at: string };
const stages = [{id:"lead",label:"Novo lead"},{id:"qualified",label:"Qualificado"},{id:"proposal",label:"Proposta"},{id:"negotiation",label:"Negociação"},{id:"won",label:"Ganho"},{id:"lost",label:"Perdido"}];
const blank = {title:"",company_name:"",contact_name:"",contact_phone:"",value:"0",stage:"lead",source:"",next_action:""};
const money=(n:number)=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function CrmFunnelPage() {
  const [rows,setRows]=useState<Deal[]>([]); const [orgId,setOrgId]=useState(""); const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const [query,setQuery]=useState("");
  const [modal,setModal]=useState(false); const [form,setForm]=useState(blank);
  const supabase=createClient();
  async function load(){
    setLoading(true);setError("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setError("Faça login para acessar o funil.");setLoading(false);return;}
    const {data:member,error:memberError}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
    if(memberError||!member){setError(memberError?.message||"Organização não encontrada.");setLoading(false);return;}
    setOrgId(member.organization_id);
    const {data,error:dealError}=await supabase.from("crm_deals").select("id,title,company_name,contact_name,contact_phone,value,stage,source,next_action,created_at").eq("organization_id",member.organization_id).order("created_at",{ascending:false});
    if(dealError)setError(dealError.message);else setRows((data||[]) as Deal[]);
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);
  async function createDeal(e:FormEvent){
    e.preventDefault();if(!orgId)return;setSaving(true);setError("");
    const {data:{user}}=await supabase.auth.getUser();
    const {error:saveError}=await supabase.from("crm_deals").insert({organization_id:orgId,owner_id:user?.id||null,title:form.title.trim(),company_name:form.company_name||null,contact_name:form.contact_name||null,contact_phone:form.contact_phone||null,value:Number(form.value)||0,stage:form.stage,source:form.source||null,next_action:form.next_action||null});
    if(saveError)setError(saveError.message);else{setModal(false);setForm(blank);await load();}
    setSaving(false);
  }
  async function changeStage(id:string,stage:string){const {error:e}=await supabase.from("crm_deals").update({stage,updated_at:new Date().toISOString()}).eq("id",id);if(e)setError(e.message);else setRows(old=>old.map(r=>r.id===id?{...r,stage}:r));}
  const visible=rows.filter(r=>[r.title,r.company_name,r.contact_name,r.contact_phone].some(v=>(v||"").toLowerCase().includes(query.toLowerCase())));
  const total=visible.filter(r=>r.stage!=="won"&&r.stage!=="lost").reduce((s,r)=>s+Number(r.value||0),0);
  const won=visible.filter(r=>r.stage==="won").reduce((s,r)=>s+Number(r.value||0),0);
  return <DashboardShell title="CRM · Funil de vendas">
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-sm text-slate-400">Acompanhe oportunidades desde o primeiro contato até o fechamento.</p><h2 className="mt-1 text-2xl font-black text-white">Funil comercial</h2></div>
        <div className="flex gap-2"><button onClick={()=>void load()} className="rounded-xl border border-slate-700 px-3 py-2.5 text-slate-300 hover:bg-slate-800" title="Atualizar"><RefreshCw size={17}/></button><button onClick={()=>setModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-500"><Plus size={18}/> Nova oportunidade</button></div>
      </div>
      {error&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><TrendingUp size={16}/> Pipeline em aberto</div><p className="mt-2 text-2xl font-black text-white">{money(total)}</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><DollarSign size={16}/> Vendas ganhas</div><p className="mt-2 text-2xl font-black text-emerald-400">{money(won)}</p></div></div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3"><Search size={17} className="text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar oportunidade, empresa ou contato..." className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"/></div>
      {loading?<div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={24}/></div>:<div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">{stages.map(stage=>{const items=visible.filter(r=>r.stage===stage.id);return <section key={stage.id} className="min-h-64 rounded-2xl border border-slate-800 bg-slate-950/40 p-3"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-200">{stage.label}</h3><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{items.length}</span></div><div className="space-y-3">{items.map(item=><article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3"><p className="font-bold text-white">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.company_name||item.contact_name||"Sem empresa/contato"}</p><p className="mt-3 text-lg font-black text-blue-300">{money(Number(item.value))}</p>{item.contact_phone&&<p className="mt-1 text-xs text-slate-500">{item.contact_phone}</p>}<select value={item.stage} onChange={e=>void changeStage(item.id,e.target.value)} className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300">{stages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></article>)}{items.length===0&&<p className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">Nenhuma oportunidade</p>}</div></section>})}</div>}
    </div>
    {modal&&<div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4"><form onSubmit={createDeal} className="my-8 w-full max-w-xl space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black text-white">Nova oportunidade</h3><button type="button" onClick={()=>setModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X size={18}/></button></div><div><label className="mb-1 block text-sm text-slate-300">Título *</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"/></div><div className="grid gap-3 sm:grid-cols-2">{([["company_name","Empresa"],["contact_name","Nome do contato"],["contact_phone","WhatsApp"],["source","Origem"]] as const).map(([key,label])=><div key={key}><label className="mb-1 block text-sm text-slate-300">{label}</label><input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"/></div>)}</div><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm text-slate-300">Valor potencial (R$)</label><input type="number" min="0" step="0.01" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"/></div><div><label className="mb-1 block text-sm text-slate-300">Etapa</label><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white">{stages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div></div><div><label className="mb-1 block text-sm text-slate-300">Próxima ação</label><input value={form.next_action} onChange={e=>setForm({...form,next_action:e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"/></div><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-50">{saving&&<Loader2 size={17} className="animate-spin"/>}Salvar oportunidade</button></form></div>}
  </DashboardShell>;
}
