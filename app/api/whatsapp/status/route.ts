import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppProvider } from "@/lib/whatsapp";

export const runtime = "nodejs";

function normalizeStatus(data: any) {
  if (data?.connected === true || data?.authenticated === true) return "connected";
  const value = String(data?.status ?? data?.state ?? data?.connection ?? "disconnected").trim().toLowerCase();
  return ["connected", "open", "online", "ready", "authenticated"].includes(value) ? "connected" : value || "disconnected";
}

export async function GET() {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: m } = await s
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!m) return NextResponse.json({ connected: false, status: "disconnected" });

    const a = createAdminClient();
    let { data: row } = await a
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", m.organization_id)
      .maybeSingle();

    const effectiveToken = row?.token || process.env.ZAPI_TOKEN || "";
    const effectiveInstanceId = row?.instance_id || process.env.ZAPI_INSTANCE_ID || "";

    if (!effectiveInstanceId || !effectiveToken) {
      return NextResponse.json({
        connected: false,
        status: "not_configured",
        configured: false,
        instanceId: effectiveInstanceId || null,
        phone: row?.phone || null,
        message: "Z-API não configurada. Informe o ID da Instância e o Token."
      });
    }

    if (!row) {
      const provider = (process.env.WHATSAPP_PROVIDER || "zapi").trim().toLowerCase();
      const { data: created, error: insertError } = await a.from("whatsapp_instances").insert({
        name: "WhatsApp Principal",
        organization_id: m.organization_id,
        provider,
        instance_id: effectiveInstanceId,
        token: row?.token || null,
        client_token: row?.client_token || null,
        status: "connecting"
      }).select("*").single();

      if (insertError) throw insertError;
      row = created;
    }

    const papi = getWhatsAppProvider({
      instanceId: effectiveInstanceId,
      token: effectiveToken,
      clientToken: row?.client_token || process.env.ZAPI_CLIENT_TOKEN,
    });

    const remote = await papi.getStatus(effectiveInstanceId);
    const status = normalizeStatus(remote);
    const remotePhone = remote?.phone || remote?.connectedPhone || remote?.user?.id || row.phone || null;

    await a.from("whatsapp_instances").update({
      status,
      phone: remotePhone,
      qr_code: status === "connected" ? null : row.qr_code,
      updated_at: new Date().toISOString()
    }).eq("id", row.id);

    return NextResponse.json({
      connected: status === "connected",
      status,
      configured: true,
      instanceId: row.instance_id,
      phone: remotePhone
    });
  } catch (e: any) {
    return NextResponse.json({
      connected: false,
      status: "error",
      configured: false,
      error: e?.message || "Falha ao consultar o WhatsApp."
    }, { status: 200 });
  }
}
