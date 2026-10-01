"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Copy, X, Loader2, Tag, CalendarDays, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/dashboard-shell";

type Category={id:string;name:string;color:string|null};
type Plan={id:string;category_id:string|null;name:string;whatsapp:string;description:string;price:number;unit:string;duration_value:number;duration_unit:string;status:string;plan_categories?:Category|null};
const supabase=createClient();

export default function PlanosPage(){
 const [plans,setPlans]=useState<Plan[]>([]),[categories,setCategories]=useState<Category[]>([]),[orgId,setOrgId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[query,setQuery]=useState(""),[category,setCategory]=useState("all"),[modal,setModal]=useState(false),[editing,setEditing]=useState<Plan|null>(null),[error,setError]=useState("");
 const [name,setName]=useState(""),[whatsapp,setWhatsapp]=useState(""),[description,setDescription]=useState(""),[categoryId,setCategoryId]=useState(""),[price,setPrice]=useState(""),[unit,setUnit]=useState("1 acesso"),[durationValue,setDurationValue]=useState("30"),[durationUnit,setDurationUnit]=useState("dias");

 async function load(){
  setLoading(true);setError("");const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}
  const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(!member){setError("Sua organização ainda não foi criada.");setLoading(false);return}
  setOrgId(member.organization_id);
  const [p,c]=await Promise.all([
   supabase.from("plans").select("id,category_id,name,whatsapp,description,price,unit,duration_value,duration_unit,status,plan_categories(id,name,color)").eq("organization_id",member.organization_id).order("created_at",{ascending:false}),
   supabase.from("plan_categories").select("id,name,color").eq("organization_id",member.organization_id).eq("status","active").order("name")
  ]);
  if(p.error)setError(p.error.message);else setPlans(((p.data||[]) as unknown as Array<Omit<Plan,"plan_categories"> & {plan_categories?: Category[] | Category | null}>).map((row)=>({ ...row, plan_categories: Array.isArray(row.plan_categories) ? (row.plan_categories[0] ?? null) : (row.plan_categories ?? null) })));
  if(c.error)setError(c.error.message);else setCategories(c.data||[]);
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 function reset(){setEditing(null);setName("");setWhatsapp("");setDescription("");setCategoryId("");setPrice("");setUnit("1 acesso");setDurationValue("30");setDurationUnit("dias");setError("")}
 function openNew(){reset();setModal(true)}
 function openEdit(p:Plan){setEditing(p);setName(p.name);setWhatsapp(p.whatsapp);setDescription(p.description);setCategoryId(p.category_id||"");setPrice(String(p.price));setUnit(p.unit);setDurationValue(String(p.duration_value));setDurationUnit(p.duration_unit);setError("");setModal(true)}
 async function save(e:FormEvent){
  e.preventDefault();setError("");
  if(!orgId)return setError("Organização não encontrada.");
  if(description.trim().length<100)return setError("A descrição precisa ter mais de 100 caracteres.");
  if(!whatsapp.trim())return setError("WhatsApp é obrigatório.");
  const n=Number(price.replace(",","."));const d=Number(durationValue);
  if(!Number.isFinite(n)||n<0)return setError("Informe um preço válido.");
  if(!Number.isInteger(d)||d<=0)return setError("Informe uma duração válida.");
  setSaving(true);
  const payload={organization_id:orgId,category_id:categoryId||null,name:name.trim(),whatsapp:whatsapp.trim(),description:description.trim(),price:n,unit,status:"active",duration_value:d,duration_unit:durationUnit};
  const result=editing?await supabase.from("plans").update(payload).eq("id",editing.id):await supabase.from("plans").insert(payload);
  if(result.error)setError(result.error.message);else{setModal(false);await load()}setSaving(false);
 }
 async function remove(id:string){if(!confirm("Excluir este plano?"))return;const {error}=await supabase.from("plans").delete().eq("id",id);if(error)setError(error.message);else await load()}
 async function duplicate(p:Plan){if(!orgId)return;const {error}=await supabase.from("plans").insert({...p,id:undefined,plan_categories:undefined,name:p.name+" — Cópia"} as never);if(error)setError(error.message);else await load()}
 const filtered=useMemo(()=>plans.filter(p=>(p.name.toLowerCase().includes(query.toLowerCase())||p.description.toLowerCase().includes(query.toLowerCase()))&&(category==="all"||p.category_id===category)),[plans,query,category]);
 return <DashboardShell title="Planos"><div className="space-y-6">
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-2xl font-black">Planos IPTV</h2><p className="mt-1 text-sm text-slate-500">Crie ofertas, defina duração, acessos e associe cada plano a uma categoria.</p></div><button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"><Plus size={18}/> Novo plano</button></div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Planos</p><p className="mt-2 text-2xl font-black">{plans.length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Ativos</p><p className="mt-2 text-2xl font-black">{plans.filter(p=>p.status==="active").length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Categorias</p><p className="mt-2 text-2xl font-black">{categories.length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Preço médio</p><p className="mt-2 text-2xl font-black">R$ {plans.length?(plans.reduce((a,p)=>a+Number(p.price),0)/plans.length).toFixed(2).replace(".",","):"0,00"}</p></div></div>
  <div className="flex flex-col gap-3 rounded-2xl border bg-white p-3 md:flex-row"><div className="flex flex-1 items-center gap-3 px-2"><Search size={18} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar plano..." className="w-full py-2 outline-none text-sm"/></div><select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border px-4 py-2 text-sm font-semibold"><option value="all">Todas as categorias</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
  {error&&<div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loading?<div className="col-span-full flex justify-center py-16"><Loader2 className="animate-spin text-blue-600"/></div>:filtered.length===0?<div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center"><Tag className="mx-auto text-slate-300"/><p className="mt-3 font-bold">Nenhum plano cadastrado</p><p className="mt-1 text-sm text-slate-500">Crie seu primeiro plano IPTV.</p></div>:filtered.map(p=><div key={p.id} className="rounded-2xl border bg-white p-5 shadow-sm">
   <div className="flex items-start justify-between"><div><div className="mb-2 flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{p.plan_categories?.name||"Sem categoria"}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{p.status==="active"?"Ativo":"Inativo"}</span></div><h3 className="text-lg font-black">{p.name}</h3></div><div className="flex gap-1"><button onClick={()=>openEdit(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16}/></button><button onClick={()=>duplicate(p)} title="Duplicar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Copy size={16}/></button><button onClick={()=>remove(p.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16}/></button></div></div>
   <p className="mt-3 line-clamp-3 text-sm text-slate-500">{p.description}</p><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Preço</p><p className="mt-1 text-lg font-black">R$ {Number(p.price).toFixed(2).replace(".",",")}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Duração</p><p className="mt-1 font-black">{p.duration_value} {p.duration_unit}</p></div></div><div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays size={14}/>{p.unit}</span><span className="inline-flex items-center gap-1"><MessageCircle size={14}/>{p.whatsapp}</span></div>
  </div>)}</div>
 </div>
 {modal&&<div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-4"><form onSubmit={save} className="mx-auto my-6 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black">{editing?"Editar plano":"Novo plano IPTV"}</h3><p className="text-sm text-slate-500">Cadastre a oferta que será usada nas cobranças.</p></div><button type="button" onClick={()=>setModal(false)} className="rounded-xl p-2 hover:bg-slate-100"><X/></button></div>
  <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Nome do plano<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Premium 30 Dias" className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/></label><label className="text-sm font-bold">WhatsApp <span className="text-red-500">*</span><input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="Ex.: (75) 99999-9999" className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/></label><label className="text-sm font-bold md:col-span-2">Descrição <span className="font-normal text-slate-400">mínimo 100 caracteres</span><textarea required minLength={101} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva o plano, benefícios, quantidade de telas/acessos, suporte, validade e demais informações para o cliente..." className="mt-2 min-h-32 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/><span className={"mt-1 block text-xs "+(description.length>=101?"text-emerald-600":"text-slate-400")}>{description.length}/101 caracteres</span></label><label className="text-sm font-bold">Categoria<select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3"><option value="">Sem categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-400">Crie categorias em Categorias.</span></label><label className="text-sm font-bold">Preço<input required inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="25,00" className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/></label><label className="text-sm font-bold">Unidade<select value={unit} onChange={e=>setUnit(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3">{["1 acesso","2 acessos","3 acessos","4 acessos","5 acessos","Personalizado"].map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Duração<input required type="number" min="1" value={durationValue} onChange={e=>setDurationValue(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/></label><label className="text-sm font-bold">Unidade da duração<select value={durationUnit} onChange={e=>setDurationUnit(e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3"><option value="dias">Dias</option><option value="meses">Meses</option></select></label></div>
  {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-60">{saving&&<Loader2 size={17} className="animate-spin"/>}{editing?"Salvar alterações":"Salvar plano"}</button>
 </form></div>}
 </DashboardShell>
}