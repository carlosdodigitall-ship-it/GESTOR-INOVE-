import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";

function normalizeStatus(data:any){
  const source=data?.data??data;
  if(source?.connected===true || source?.authenticated===true)return "connected";
  const value=String(source?.status??source?.state??source?.connection??"").trim().toLowerCase();
  if(["connected","open","online","ready","authenticated"].includes(value))return "connected";
  if(["disconnected","closed","offline","logout","logged_out"].includes(value))return "disconnected";
  return null;
}

function instanceId(data:any){
  const source=data?.data??data;
  return source?.instanceId??source?.instance_id??source?.instance??data?.instanceId??data?.instance_id??null;
}

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    const id=instanceId(body);
    const status=normalizeStatus(body);
    if(id&&status){
      const admin=createAdminClient();
      await admin.from("whatsapp_instances").update({
        status,
        qr_code:status==="connected"?null:undefined,
        updated_at:new Date().toISOString()
      }).eq("instance_id",id);
    }
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({ok:true});
  }
}

export async function GET(){
  return NextResponse.json({ok:true});
}