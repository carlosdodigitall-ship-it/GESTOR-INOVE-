import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {PapiProvider} from "@/lib/whatsapp/provider";

export const runtime="nodejs";

function remoteStatus(data:any){
  if(data?.connected===true || data?.authenticated===true) return "connected";
  const value=String(data?.status??data?.state??data?.connection??"disconnected").trim().toLowerCase();
  if(["connected","open","online","ready","authenticated"].includes(value)) return "connected";
  return value || "disconnected";
}

function qrValue(data:any){
  return data?.qr ?? data?.qrcode ?? data?.qrCode ?? data?.data?.qr ?? data?.data?.qrcode ?? data?.data?.qrCode ?? null;
}

export async function POST(){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

    const {data:member}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
    if(!member)return NextResponse.json({error:"Organização não encontrada."},{status:400});

    const admin=createAdminClient();
    let {data:row}=await admin.from("whatsapp_instances").select("*").eq("organization_id",member.organization_id).maybeSingle();
    const papi=new PapiProvider();

    if(!row){
      const instanceId=`cloudzap_${member.organization_id.replace(/-/g,"").slice(0,16)}`;
      try{await papi.createInstance(instanceId);}catch(error:any){
        const message=String(error?.message||"");
        if(!/already|exist|duplicate|409|conflict/i.test(message)) throw error;
      }
      const {data:created,error}=await admin.from("whatsapp_instances").insert({
        organization_id:member.organization_id,provider:"papi",instance_id:instanceId,status:"connecting"
      }).select("*").single();
      if(error)throw error;
      row=created;
    }

    const remote=await papi.getStatus(row.instance_id);
    const status=remoteStatus(remote);

    if(status==="connected"){
      await admin.from("whatsapp_instances").update({status:"connected",qr_code:null,updated_at:new Date().toISOString()}).eq("id",row.id);
      return NextResponse.json({ok:true,connected:true,status:"connected",instanceId:row.instance_id,qr:null});
    }

    const qr=await papi.getQr(row.instance_id);
    const value=qrValue(qr);
    await admin.from("whatsapp_instances").update({
      status:status==="disconnected"?"connecting":status,
      qr_code:value,
      updated_at:new Date().toISOString()
    }).eq("id",row.id);

    return NextResponse.json({ok:true,connected:false,status:status==="disconnected"?"connecting":status,instanceId:row.instance_id,qr:value});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Não foi possível iniciar a conexão WhatsApp."},{status:500});
  }
}
