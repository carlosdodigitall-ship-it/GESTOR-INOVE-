"use client";

import {useEffect,useMemo,useState} from "react";
import {DashboardShell} from "@/components/dashboard-shell";
import {createClient} from "@/lib/supabase/client";
import {Users,ReceiptText,WalletCards,AlertTriangle,Loader2,TrendingUp,ArrowUpRight,MessagesSquare,BarChart3,PlugZap} from "lucide-react";

type Charge={id:string;amount:number;due_date:string;status:string;description:string;customer_id?:string|null};
type Customer={id:string;name:string};

const emptyStats={received:0,open:0,overdue:0,customers:0,openCount:0,overdueCount:0};

export default function Dashboard(){
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [stats,setStats]=useState(emptyStats);
 const [recent,setRecent]=useState<Charge[]>([]);
 const [customerNames,setCustomerNames]=useState<Record<string,string>>({});

 useEffect(()=>{(async()=>{
  const supabase=createClient();
  setLoading(true);setError("");
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError("Sessão não encontrada. Entre novamente.");return;}

   const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();

   // O dashboard permanece utilizável mesmo em uma conta recém-criada,
   // enquanto a organização ou as tabelas ainda estiverem sendo provisionadas.
   if(!member?.organization_id){
    setStats(emptyStats);setRecent([]);return;
   }

   const orgId=member.organization_id;
   const [customersRes,chargesRes]=await Promise.all([
    supabase.from("customers").select("id,name",{count:"exact"}).eq("organization_id",orgId).limit(500),
    supabase.from("charges").select("id,amount,due_date,status,description,customer_id").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100)
   ]);

   if(customersRes.error||chargesRes.error){
    console.warn("Dashboard: dados ainda não disponíveis",customersRes.error||chargesRes.error);
    setStats(emptyStats);setRecent([]);return;
   }

   const customers=(customersRes.data||[]) as Customer[];
   const rows=(chargesRes.data||[]) as Charge[];
   const names:Record<string,string>={};
   customers.forEach(c=>{names[c.id]=c.name});
   setCustomerNames(names);

   const received=rows.filter(x=>x.status==="paid").reduce((a,x)=>a+Number(x.amount||0),0);
   const openRows=rows.filter(x=>x.status==="pending"||x.status==="open");
   const today=new Date().toISOString().slice(0,10);
   const overdueRows=rows.filter(x=>x.status==="overdue"||((x.status==="pending"||x.status==="open")&&x.due_date<today));

   setStats({
    received,
    open:openRows.reduce((a,x)=>a+Number(x.amount||0),0),
    overdue:overdueRows.reduce((a,x)=>a+Number(x.amount||0),0),
    customers:customersRes.count||customers.length,
    openCount:openRows.length,
    overdueCount:overdueRows.length
   });
   setRecent(rows.slice(0,8));
  }catch(err){
   console.error("Dashboard error:",err);
   setError("Não foi possível carregar a sessão. Atualize a página ou entre novamente.");
  }finally{setLoading(false);}
 })()},[]);

 const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const total=Math.max(1,stats.received+stats.open+stats.overdue);
 const receivedPct=Math.min(100,stats.received/total*100);
 const openPct=Math.min(100,stats.open/total*100);
 const overduePct=Math.min(100,stats.overdue/total*100);

 const monthly=useMemo(()=>{
  const months=Array.from({length:6},(_,i)=>{
   const d=new Date();d.setMonth(d.getMonth()-(5-i));d.setDate(1);
   return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("pt-BR",{month:"short"}).replace(".",""),value:0};
  });
  // Sem cobranças ainda, o gráfico fica zerado. Quando houver dados, ele se preenche automaticamente.
  recent.forEach(x=>{
   if(x.status!=="paid")return;
   const key=x.due_date?.slice(0,7);
   const item=months.find(m=>m.key===key);
   if(item)item.value+=Number(x.amount||0);
  });
  return months;
 },[recent]);
 const maxMonth=Math.max(1,...monthly.map(m=>m.value));

 const cards=[
  ["Total recebido",money(stats.received),"Pagamentos confirmados",WalletCards],
  ["Em aberto",money(stats.open),stats.openCount+" cobranças",ReceiptText],
  ["Vencido",money(stats.overdue),stats.overdueCount+" cobranças",AlertTriangle],
  ["Clientes",String(stats.customers),"Clientes cadastrados",Users]
 ] as const;

 return <DashboardShell title="Dashboard">
  {loading?<div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-700" size={30}/></div>:error?<div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"><p className="font-black">Não foi possível carregar o dashboard</p><p className="mt-1 text-sm">{error}</p></div>:<>
   <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-lime-50 p-5">
    <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white"><TrendingUp size={21}/></div><div><p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">CloudZap</p><h2 className="text-lg font-black text-slate-950">Visão geral da sua operação</h2></div></div>
   </div>

   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map(([a,b,c,I])=>{const Icon=I;return <div key={a} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{a}</p><Icon size={18} className="text-emerald-700"/></div><p className="mt-2 text-2xl font-black text-slate-950">{b}</p><p className="mt-2 text-xs font-bold text-slate-500">{c}</p></div>})}
   </div>

   <div className="mt-6">
    <div className="mb-4">
     <h2 className="text-xl font-black text-slate-950">Acesso rápido</h2>
     <p className="text-sm text-slate-500">Tudo que você precisa para administrar sua operação.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
     {[
      {label:"Clientes",desc:"Cadastre e acompanhe seus clientes.",href:"/clientes",icon:Users,box:"bg-gradient-to-br from-emerald-700 to-emerald-500",soft:"bg-emerald-50",text:"text-emerald-700"},
      {label:"Cobranças",desc:"Controle vencimentos e pagamentos.",href:"/cobrancas",icon:ReceiptText,box:"bg-gradient-to-br from-emerald-800 to-emerald-600",soft:"bg-emerald-50",text:"text-emerald-800"},
      {label:"Planos",desc:"Organize seus planos e serviços.",href:"/planos",icon:WalletCards,box:"bg-gradient-to-br from-lime-600 to-emerald-600",soft:"bg-lime-50",text:"text-lime-800"},
      {label:"Financeiro",desc:"Acompanhe sua movimentação.",href:"/financeiro",icon:TrendingUp,box:"bg-gradient-to-br from-emerald-600 to-teal-500",soft:"bg-emerald-50",text:"text-emerald-700"},
      {label:"CRM",desc:"Gerencie leads e oportunidades.",href:"/crm/kanban",icon:ArrowUpRight,box:"bg-gradient-to-br from-emerald-900 to-emerald-700",soft:"bg-emerald-50",text:"text-emerald-900"},
      {label:"WhatsApp",desc:"Centralize sua comunicação.",href:"/whatsapp",icon:MessagesSquare,box:"bg-gradient-to-br from-teal-600 to-emerald-500",soft:"bg-teal-50",text:"text-teal-800"},
      {label:"Relatórios",desc:"Veja indicadores da operação.",href:"/relatorios",icon:BarChart3,box:"bg-gradient-to-br from-emerald-700 to-lime-500",soft:"bg-emerald-50",text:"text-emerald-800"},
      {label:"Integrações",desc:"Conecte suas ferramentas.",href:"/integracoes",icon:PlugZap,box:"bg-gradient-to-br from-slate-900 to-emerald-800",soft:"bg-emerald-50",text:"text-emerald-900"}
     ].map(item=>{const Icon=item.icon;return <a key={item.label} href={item.href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white ${item.box}`}><Icon size={20}/></div><div className="min-w-0"><h3 className="font-black text-slate-900">{item.label}</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.desc}</p></div></div><div className={`mt-4 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${item.soft} ${item.text}`}>Acessar →</div></a>})}
    </div>
   </div>

   <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
     <div className="flex items-start justify-between"><div><h2 className="font-extrabold text-slate-950">Recebimentos</h2><p className="text-sm text-slate-500">Últimos 6 meses</p></div><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ArrowUpRight size={18}/></div></div>
     <div className="mt-6 flex h-56 items-end gap-3 border-b border-slate-100 px-2">
      {monthly.map(m=><div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
       <div className="relative flex w-full flex-1 items-end"><div title={money(m.value)} className="w-full rounded-t-xl bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all" style={{height:`${Math.max(m.value?8:2,m.value/maxMonth*100)}%`}}/></div>
       <span className="text-[11px] font-bold capitalize text-slate-400">{m.label}</span>
      </div>)}
     </div>
     <p className="mt-4 text-xs text-slate-400">{monthly.every(m=>m.value===0)?"Nenhum recebimento registrado ainda. Os dados aparecerão automaticamente conforme as cobranças forem pagas.":"Valores recebidos registrados no período."}</p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
     <h2 className="font-extrabold text-slate-950">Visão financeira</h2><p className="text-sm text-slate-500">Distribuição atual</p>
     <div className="mt-6 space-y-5">
      {[["Recebido",money(stats.received),receivedPct,"bg-emerald-500"],["Em aberto",money(stats.open),openPct,"bg-emerald-300"],["Vencido",money(stats.overdue),overduePct,"bg-red-400"]].map(([label,value,pct,color])=><div key={String(label)}><div className="mb-2 flex justify-between text-sm font-bold"><span>{label}</span><span>{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{width:`${pct}%`}}/></div></div>)}
     </div>
     <div className="mt-7 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total monitorado</p><p className="mt-1 text-2xl font-black">{money(stats.received+stats.open+stats.overdue)}</p></div>
    </div>
   </div>

   <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="font-extrabold text-slate-950">Cobranças recentes</h2><p className="text-sm text-slate-500">Últimas movimentações da sua organização</p>
    <div className="mt-5 space-y-3">
     {recent.length===0?<div className="rounded-2xl bg-slate-50 py-10 text-center"><ReceiptText className="mx-auto text-slate-300" size={28}/><p className="mt-3 text-sm font-bold text-slate-500">Nenhuma cobrança cadastrada.</p><p className="mt-1 text-xs text-slate-400">Quando você cadastrar cobranças, elas aparecerão aqui.</p></div>:recent.map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm last:border-0"><div className="min-w-0"><p className="truncate font-bold text-slate-700">{(x.customer_id&&customerNames[x.customer_id])||"Cliente"}</p><p className="truncate text-xs text-slate-400">{x.description||"Cobrança"} · venc. {x.due_date?new Date(x.due_date+"T00:00:00").toLocaleDateString("pt-BR"):"-"}</p></div><div className="text-right"><p className="font-black">{money(Number(x.amount||0))}</p><span className="text-xs font-bold text-slate-500">{x.status}</span></div></div>)}
    </div>
   </div>
  </>}
 </DashboardShell>
}
