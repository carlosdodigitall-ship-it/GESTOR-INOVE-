import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime="nodejs";

async function getAdmin(){
  const auth=await createClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user) return {user:null,admin:null,profile:null};
  const admin=createAdminClient();
  const {data:profile}=await admin.from("profiles").select("id,full_name,phone,is_admin").eq("id",user.id).maybeSingle();
  return {user,admin,profile};
}
async function count(admin:any,table:string){
  const {count,error}=await admin.from(table).select("*",{count:"exact",head:true});
  return error?0:(count||0);
}
export async function GET(){
  try{
    const {user,admin,profile}=await getAdmin();
    if(!user) return NextResponse.json({error:"Não autenticado"},{status:401});
    if(!profile?.is_admin) return NextResponse.json({error:"Acesso de administrador negado"},{status:403});
    const [organizations,users,customers,charges,transactions,subscriptions]=await Promise.all(["organizations","profiles","customers","charges","transactions","billing_subscriptions"].map(t=>count(admin,t)));
    const {data:orgRows}=await admin.from("organizations").select("id,name,owner_id,access_status,trial_ends_at,subscription_plan_code,subscription_status,created_at").order("created_at",{ascending:false}).limit(100);
    const {data:profiles}=await admin.from("profiles").select("id,full_name,phone,is_admin,created_at").order("created_at",{ascending:false}).limit(100);
    const {data:subs}=await admin.from("billing_subscriptions").select("id,organization_id,plan_code,status,current_period_end,cancel_at_period_end,created_at").order("created_at",{ascending:false}).limit(100);
    const {data:suggestions}=await admin.from("suggestions").select("id,organization_id,user_id,title,category,status,admin_response,created_at").order("created_at",{ascending:false}).limit(100);
    const authUsers=await admin.auth.admin.listUsers({page:1,perPage:1000});
    const emailById=new Map((authUsers.data?.users||[]).map((u:any)=>[u.id,u.email||""]));
    const orgs=(orgRows||[]).map((o:any)=>({...o,owner_email:emailById.get(o.owner_id)||"—"}));
    const usersRows=(profiles||[]).map((p:any)=>({...p,email:emailById.get(p.id)||"—"}));
    const [trial,active,blocked]=await Promise.all([
      admin.from("organizations").select("*",{count:"exact",head:true}).eq("access_status","trial"),
      admin.from("organizations").select("*",{count:"exact",head:true}).eq("access_status","active"),
      admin.from("organizations").select("*",{count:"exact",head:true}).eq("access_status","blocked")
    ]);
    const {data:chargeRows}=await admin.from("charges").select("amount,status");
    const revenue=(chargeRows||[]).filter((x:any)=>x.status==="paid").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
    const open=(chargeRows||[]).filter((x:any)=>x.status==="pending"||x.status==="open").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
    const overdue=(chargeRows||[]).filter((x:any)=>x.status==="overdue").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
    return NextResponse.json({profile:{id:profile.id,full_name:profile.full_name,email:emailById.get(profile.id)||user.email||""},stats:{organizations,users,customers,charges,transactions,subscriptions,trial:trial.count||0,active:active.count||0,blocked:blocked.count||0,revenue,open,overdue},organizations:orgs,users:usersRows,subscriptions:subs||[],suggestions:suggestions||[]});
  }catch(e:any){return NextResponse.json({error:e?.message||"Erro interno"},{status:500});}
}
export async function POST(request:Request){
  try{
    const {user,admin,profile}=await getAdmin();
    if(!user) return NextResponse.json({error:"Não autenticado"},{status:401});
    if(!profile?.is_admin) return NextResponse.json({error:"Acesso de administrador negado"},{status:403});
    const body=await request.json(); const action=String(body.action||"");
    if(action==="organization_status"){
      const status=String(body.status||"");
      if(!["trial","active","blocked"].includes(status)) return NextResponse.json({error:"Status inválido"},{status:400});
      const {error}=await admin.from("organizations").update({access_status:status,activated_at:status==="active"?new Date().toISOString():null}).eq("id",body.organization_id); if(error) throw error;
    }else if(action==="set_admin"){
      const {error}=await admin.from("profiles").update({is_admin:Boolean(body.is_admin)}).eq("id",body.user_id); if(error) throw error;
    }else if(action==="suggestion_status"){
      const status=String(body.status||"");
      if(!["pending","reviewing","planned","completed","rejected"].includes(status)) return NextResponse.json({error:"Status inválido"},{status:400});
      const {error}=await admin.from("suggestions").update({status,admin_response:body.admin_response||null,updated_at:new Date().toISOString()}).eq("id",body.suggestion_id); if(error) throw error;
    }else if(action==="subscription_status"){
      const status=String(body.status||""); const allowed=["incomplete","active","trialing","past_due","canceled","unpaid","paused"];
      if(!allowed.includes(status)) return NextResponse.json({error:"Status inválido"},{status:400});
      const {data:sub,error}=await admin.from("billing_subscriptions").update({status,updated_at:new Date().toISOString()}).eq("id",body.subscription_id).select("organization_id").maybeSingle(); if(error) throw error;
      if(sub?.organization_id) await admin.from("organizations").update({subscription_status:status,access_status:status==="active"||status==="trialing"?"active":"blocked"}).eq("id",sub.organization_id);
    }else return NextResponse.json({error:"Ação não suportada"},{status:400});
    await admin.from("admin_audit_logs").insert({admin_user_id:user.id,action,target_type:body.target_type||action,target_id:body.organization_id||body.user_id||body.suggestion_id||body.subscription_id||null,details:body});
    return NextResponse.json({ok:true});
  }catch(e:any){return NextResponse.json({error:e?.message||"Erro interno"},{status:500});}
}
