"use client";
import {useEffect,useState} from "react";
import {DashboardShell} from "@/components/dashboard-shell";
import {createClient} from "@/lib/supabase/client";
import {Users,ReceiptText,WalletCards,AlertTriangle,Loader2} from "lucide-react";

type Charge={id:string;amount:number;due_date:string;status:string;description:string;customers?:{name:string}|null};
export default function Dashboard(){
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [stats,setStats]=useState({received:0,open:0,overdue:0,customers:0,openCount:0,overdueCount:0});
 const [recent,setRecent]=useState<Charge[]>([]);
 useEffect(()=>{(async()=>{
  const supabase=createClient(); setLoading(true); setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Sessão não encontrada. Entre novamente.");setLoading(false);return;}
  const {data:member,error:memberError}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(memberError||!member){setError(memberError?.message||"Sua organização ainda não foi criada.");setLoading(false);return;}
  const orgId=member.organization_id;
  const [customers,charges]=await Promise.all([
   supabase.from("customers").select("id",{count:"exact",head:true}).eq("organization_id",orgId),
   supabase.from("charges").select("id,amount,due_date,status,description,customers(name)").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(8)
  ]);
  if(customers.error||charges.error){setError(customers.error?.message||charges.error?.message||"Não foi possível carregar o dashboard.");setLoading(false);return;}
  const rows=(charges.data||[]) as unknown as Charge[];
  const received=rows.filter(x=>x.status==="paid").reduce((a,x)=>a+Number(x.amount),0);
  const openRows=rows.filter(x=>x.status==="pending"||x.status==="open");
  const today=new Date().toISOString().slice(0,10);
  const overdueRows=rows.filter(x=>x.status==="overdue" || ((x.status==="pending"||x.status==="open")&&x.due_date<today));
  setStats({received,open:openRows.reduce((a,x)=>a+Number(x.amount),0),overdue:overdueRows.reduce((a,x)=>a+Number(x.amount),0),customers:customers.count||0,openCount:openRows.length,overdueCount:overdueRows.length});
  setRecent(rows);setLoading(false);
 })()},[]);
 const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const cards=[["Total recebido",money(stats.received),"Pagamentos confirmados",WalletCards],["Em aberto",money(stats.open),stats.openCount+" cobranças",ReceiptText],["Vencido",money(stats.overdue),stats.overdueCount+" cobranças",AlertTriangle],["Clientes",String(stats.customers),"Clientes cadastrados",Users]];
 return <DashboardShell title="Dashboard">
  {loading?<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-emerald-700"/></div>:error?<div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">{error}</div>:<>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([a,b,c,I])=>{const Icon=I as typeof Users;return <div key={String(a)} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{a}</p><Icon size={18} className="text-emerald-700"/></div><p className="mt-2 text-2xl font-black">{b}</p><p className="mt-2 text-xs font-bold text-slate-500">{c}</p></div>})}</div>
   <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-extrabold">Cobranças recentes</h2><p className="text-sm text-slate-500">Dados reais da sua organização</p><div className="mt-5 space-y-3">{recent.length===0?<p className="py-8 text-center text-sm text-slate-400">Nenhuma cobrança cadastrada.</p>:recent.map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b pb-3 text-sm"><div><p className="font-bold text-slate-700">{x.customers?.name||"Cliente"}</p><p className="text-xs text-slate-400">{x.description} · venc. {new Date(x.due_date+"T00:00:00").toLocaleDateString("pt-BR")}</p></div><div className="text-right"><p className="font-black">{money(Number(x.amount))}</p><span className="text-xs font-bold text-slate-500">{x.status}</span></div></div>)}</div></div>
    <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-extrabold">Visão financeira</h2><p className="text-sm text-slate-500">Resumo baseado nas cobranças carregadas</p><div className="mt-6 space-y-4"><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Recebido</span><span>{money(stats.received)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-emerald-500" style={{width:(stats.received+stats.open+stats.overdue?Math.min(100,stats.received/(stats.received+stats.open+stats.overdue)*100):0)+"%"}}/></div></div><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Em aberto</span><span>{money(stats.open)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-emerald-500" style={{width:(stats.received+stats.open+stats.overdue?Math.min(100,stats.open/(stats.received+stats.open+stats.overdue)*100):0)+"%"}}/></div></div><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Vencido</span><span>{money(stats.overdue)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-red-500" style={{width:(stats.received+stats.open+stats.overdue?Math.min(100,stats.overdue/(stats.received+stats.open+stats.overdue)*100):0)+"%"}}/></div></div></div></div>
   </div>
  </>}
 </DashboardShell>
}