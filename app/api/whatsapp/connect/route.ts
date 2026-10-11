import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppProvider } from "@/lib/whatsapp";

export const runtime = "nodejs";

function remoteStatus(data: any) {
  if (data?.connected === true || data?.authenticated === true) return "connected";
  const value = String(data?.status ?? data?.state ?? data?.connection ?? "disconnected").trim().toLowerCase();
  if (["connected", "open", "online", "ready", "authenticated"].includes(value)) return "connected";
  return value || "disconnected";
}

function qrValue(data: any) {
  return data?.value ?? data?.qr ?? data?.qrcode ?? data?.qrCode ?? data?.data?.value ?? data?.data?.qr ?? data?.data?.qrcode ?? data?.data?.qrCode ?? (typeof data?.data === "string" ? data.data : null) ?? (typeof data === "string" ? data : null);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!member) return NextResponse.json({ error: "Organização não encontrada." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const customInstanceId = typeof body.instanceId === "string" ? body.instanceId.trim() : "";
    const customToken = typeof body.token === "string" ? body.token.trim() : "";
    const customClientToken = typeof body.clientToken === "string" ? body.clientToken.trim() : "";

    const admin = createAdminClient();
    let { data: row } = await admin
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", member.organization_id)
      .maybeSingle();

    const instanceId = customInstanceId || row?.instance_id || process.env.ZAPI_INSTANCE_ID || `cloudzap_${member.organization_id.replace(/-/g, "").slice(0, 16)}`;
    const token = customToken || row?.token || process.env.ZAPI_TOKEN || "";
    const clientToken = customClientToken || row?.client_token || process.env.ZAPI_CLIENT_TOKEN || "";
    const provider = (process.env.WHATSAPP_PROVIDER || "zapi").trim().toLowerCase();

    if (!row) {
      const { data: created, error } = await admin.from("whatsapp_instances").insert({
        name: "WhatsApp Principal",
        organization_id: member.organization_id,
        provider,
        instance_id: instanceId,
        token: token || null,
        client_token: clientToken || null,
        status: "connecting",
      }).select("*").single();

      if (error) throw error;
      row = created;
    } else if (customInstanceId || customToken || customClientToken) {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (customInstanceId) updatePayload.instance_id = customInstanceId;
      if (customToken) updatePayload.token = customToken;
      if (customClientToken) updatePayload.client_token = customClientToken;

      const { data: updated, error } = await admin
        .from("whatsapp_instances")
        .update(updatePayload)
        .eq("id", row.id)
        .select("*")
        .single();

      if (!error && updated) row = updated;
    }

    const papi = getWhatsAppProvider({
      instanceId: row.instance_id,
      token: row.token || process.env.ZAPI_TOKEN,
      clientToken: row.client_token || process.env.ZAPI_CLIENT_TOKEN,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    if (appUrl) {
      try {
        await papi.configureWebhook(row.instance_id, `${appUrl.replace(/\/$/, "")}/api/whatsapp/webhook`);
      } catch {}
    }

    let status = "disconnected";
    try {
      const remote = await papi.getStatus(row.instance_id);
      status = remoteStatus(remote);
    } catch {
      status = "connecting";
    }

    if (status === "connected") {
      await admin.from("whatsapp_instances").update({
        status: "connected",
        qr_code: null,
        updated_at: new Date().toISOString()
      }).eq("id", row.id);

      return NextResponse.json({
        ok: true,
        connected: true,
        status: "connected",
        instanceId: row.instance_id,
        qr: null
      });
    }

    const qr = await papi.getQr(row.instance_id);
    const value = qrValue(qr);

    await admin.from("whatsapp_instances").update({
      status: "connecting",
      qr_code: value,
      updated_at: new Date().toISOString()
    }).eq("id", row.id);

    return NextResponse.json({
      ok: true,
      connected: false,
      status: "connecting",
      instanceId: row.instance_id,
      qr: value
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Não foi possível iniciar a conexão WhatsApp." }, { status: 500 });
  }
}
