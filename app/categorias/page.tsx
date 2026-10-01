export const dynamic = "force-dynamic";

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Tag, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/dashboard-shell";

type Category = { id:string; name:string; description:string|null; color:string|null; status:string; created_at:string };
const supabase=createClient();

export default function CategoriasPage(){
  const [categories,setCategories]=useState<Category[]>([]);
  const [orgId,setOrgId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [query,setQuery]=useState("");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Category|null>(null);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [color,setColor]=useState("#2563eb");
  const [error,setError]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return;}
    const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
    if(!member){setError("Sua organização ainda não foi criada.");setLoading(false);return;}
    setOrgId(member.organization_id);
    const {data,error}=await supabase.from("plan_categories").select("id,name,description,color,status,created_at").eq("organization_id",member.organization_id).order("created_at",{ascending:false});
    if(error)setError(error.message); else setCategories(data||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  function openNew(){setEditing(null);setName("");setDescription("");setColor("#2563eb");setError("");setModal(true)}
  function openEdit(c:Category){setEditing(c);setName(c.name);setDescription(c.description||"");setColor(c.color||"#2563eb");setError("");setModal(true)}
  async function save(e:FormEvent){
    e.preventDefault(); if(!orgId||!name.trim()){setError("Informe o nome da categoria.");return}
    setSaving(true);setError("");
    const payload={organization_id:orgId,name:name.trim(),description:description.trim()||null,color,status:"active"};
    const result=editing
      ? await supabase.from("plan_categories").update(payload).eq("id",editing.id)
      : await supabase.from("plan_categories").insert(payload);
    if(result.error)setError(result.error.message); else {setModal(false);await load()}
    setSaving(false);
  }
  async function remove(id:string){
    if(!confirm("Excluir esta categoria? Os planos vinculados ficarão sem categoria."))return;
    const {error}=await supabase.from("plan_categories").delete().eq("id",id);
    if(error)setError(error.message);else await load();
  }
  const filtered=useMemo(()=>categories.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())),[categories,query]);

  return <DashboardShell title="Categorias">
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h2 className="text-2xl font-black text-slate-950">Categorias de planos</h2><p className="mt-1 text-sm text-slate-500">Organize seus planos IPTV por categoria.</p></div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"><Plus size={18}/> Nova categoria</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Categorias</p><p className="mt-2 text-2xl font-black">{categories.length}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Ativas</p><p className="mt-2 text-2xl font-black">{categories.filter(c=>c.status==="active").length}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Organização</p><p className="mt-2 text-sm font-bold text-slate-700">Sua revenda</p></div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3"><Search size={18} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar categoria..." className="w-full outline-none text-sm"/></div>
      {error&&<div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <div className="col-span-full flex justify-center py-16"><Loader2 className="animate-spin text-blue-600"/></div> :
        filtered.length===0 ? <div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center"><Tag className="mx-auto text-slate-300"/><p className="mt-3 font-bold">Nenhuma categoria cadastrada</p><p className="mt-1 text-sm text-slate-500">Crie a primeira para começar a organizar seus planos.</p></div> :
        filtered.map(c=><div key={c.id} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl" style={{backgroundColor:(c.color||"#2563eb")+"18",color:c.color||"#2563eb"}}><Tag size={20}/></span><div><h3 className="font-black">{c.name}</h3><span className="text-xs font-bold text-emerald-600">{c.status==="active"?"Ativa":"Inativa"}</span></div></div><div className="flex gap-1"><button onClick={()=>openEdit(c)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16}/></button><button onClick={()=>remove(c.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16}/></button></div></div>
          {c.description&&<p className="mt-4 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
        </div>)}
      </div>
    </div>
    {modal&&<div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4"><form onSubmit={save} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><div><h3 className="text-xl font-black">{editing?"Editar categoria":"Nova categoria"}</h3><p className="text-sm text-slate-500">A categoria poderá ser usada nos seus planos.</p></div><button type="button" onClick={()=>setModal(false)} className="rounded-xl p-2 hover:bg-slate-100"><X/></button></div>
      <div className="mt-6 space-y-4"><label className="block text-sm font-bold">Nome<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Premium" className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/></label><label className="block text-sm font-bold">Descrição<span className="ml-2 text-xs font-normal text-slate-400">opcional</span><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Explique o tipo de plano desta categoria..." className="mt-2 min-h-28 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/></label><label className="block text-sm font-bold">Cor<div className="mt-2 flex gap-3"><input type="color" value={color} onChange={e=>setColor(e.target.value)} className="h-12 w-16 cursor-pointer rounded-lg border"/><input value={color} onChange={e=>setColor(e.target.value)} className="flex-1 rounded-xl border px-4 outline-none"/></div></label></div>
      {error&&<p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}<button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-60">{saving&&<Loader2 size={17} className="animate-spin"/>}{editing?"Salvar alterações":"Criar categoria"}</button>
    </form></div>}
  </DashboardShell>
}