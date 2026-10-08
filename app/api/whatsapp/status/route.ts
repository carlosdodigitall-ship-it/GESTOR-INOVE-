import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getWhatsAppProvider} from "@/lib/whatsapp";

export const runtime="nodejs";

function normalizeStatus(data:any){
  if(data?.connected===true || data?.authenticated===true)return "connected";
  const value=String(data?.status??data?.state??data?.connection??"disconnected").trim().toLowerCase();
  return ["connected","open","online","ready","authenticated"].includes(value)?"connected":value||"disconnected";
}

export async function GET(){
  try{
    const s=await createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

    const {data:m}=await s.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
    if(!m)return NextResponse.json({connected:false,status:"disconnected"});

    const a=createAdminClient();
    const {data:row}=await a.from("whatsapp_instances").select("*").eq("organization_id",m.organization_id).maybeSingle();
    if(!row)return NextResponse.json({connected:false,status:"disconnected"});

    const remote=await getWhatsAppProvider().getStatus(row.instance_id);
    const status=normalizeStatus(remote);

    await a.from("whatsapp_instances").update({
      status,qr_code:status==="connected"?null:row.qr_code,updated_at:new Date().toISOString()
    }).eq("id",row.id);

    return NextResponse.json({
      connected:status==="connected",status,instanceId:row.instance_id,phone:row.phone||null
    });
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Falha ao consultar o WhatsApp."},{status:500});
  }
}
