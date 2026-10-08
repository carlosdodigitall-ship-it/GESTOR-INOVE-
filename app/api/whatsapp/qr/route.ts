import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getWhatsAppProvider} from "@/lib/whatsapp";

export const runtime="nodejs";

function qrValue(data:any){
  return data?.value ?? data?.qr ?? data?.qrcode ?? data?.qrCode ?? data?.data?.value ?? data?.data?.qr ?? data?.data?.qrcode ?? data?.data?.qrCode ?? (typeof data?.data === "string" ? data.data : null) ?? (typeof data === "string" ? data : null);
}

export async function GET(){
  try{
    const s=await createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

    const {data:m}=await s.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
    if(!m)return NextResponse.json({error:"Organização não encontrada."},{status:400});

    const a=createAdminClient();
    let {data:row}=await a.from("whatsapp_instances").select("*").eq("organization_id",m.organization_id).maybeSingle();
    const papi=getWhatsAppProvider();
    if(!row){
      const instanceId=process.env.ZAPI_INSTANCE_ID || `cloudzap_${m.organization_id.replace(/-/g,"").slice(0,16)}`;
      const provider=(process.env.WHATSAPP_PROVIDER || "zapi").trim().toLowerCase();
      const {data:created,error:insertError}=await a.from("whatsapp_instances").insert({
        organization_id:m.organization_id,
        provider,
        instance_id:instanceId,
        status:"connecting"
      }).select("*").single();
      if(insertError) throw insertError;
      row=created;
    }
    const status=await papi.getStatus(row.instance_id);
    if(status?.connected===true || status?.authenticated===true || ["connected","open","online","ready","authenticated"].includes(String(status?.status??status?.state??status?.connection??"").trim().toLowerCase())){
      return NextResponse.json({qr:null,connected:true,status:"connected",instanceId:row.instance_id});
    }

    const qr=await papi.getQr(row.instance_id);
    const value=qrValue(qr);
    if(!value)return NextResponse.json({error:"A Z-API não forneceu um QR Code atual para esta instância.",status:"waiting_qr"}, {status:202});

    await a.from("whatsapp_instances").update({qr_code:value,updated_at:new Date().toISOString()}).eq("id",row.id);
    return NextResponse.json({qr:value,connected:false,status:"waiting_qr",instanceId:row.instance_id});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Falha ao obter o QR Code atual da Z-API."},{status:500});
  }
}
