import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppProvider } from "@/lib/whatsapp";

export const runtime = "nodejs";

function qrValue(data: any) {
  return data?.value ?? data?.qr ?? data?.qrcode ?? data?.qrCode ?? data?.data?.value ?? data?.data?.qr ?? data?.data?.qrcode ?? data?.data?.qrCode ?? (typeof data?.data === "string" ? data.data : null) ?? (typeof data === "string" ? data : null);
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

    if (!m) return NextResponse.json({ error: "Organização não encontrada." }, { status: 400 });

    const a = createAdminClient();
    let { data: row } = await a
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", m.organization_id)
      .maybeSingle();

    const providerName = (process.env.WHATSAPP_PROVIDER || "evolution").trim().toLowerCase();
    const effectiveToken = row?.token || process.env.ZAPI_TOKEN || "";
    const effectiveInstanceId = row?.instance_id || (providerName === "evolution" ? process.env.EVOLUTION_INSTANCE_NAME || "gestor-inove" : process.env.ZAPI_INSTANCE_ID || "");

    if (!effectiveInstanceId || (providerName !== "evolution" && !effectiveToken)) {
      return NextResponse.json({
        error: providerName === "evolution" ? "Evolution API não configurada. Defina EVOLUTION_API_KEY na Vercel." : "Z-API não configurada. Defina as credenciais para gerar o QR Code.",
        status: "not_configured"
      }, { status: 400 });
    }

    if (!row) {
      const provider = (process.env.WHATSAPP_PROVIDER || "evolution").trim().toLowerCase();
      const { data: created, error: insertError } = await a.from("whatsapp_instances").insert({
        name: "WhatsApp Principal",
        organization_id: m.organization_id,
        provider,
        instance_id: effectiveInstanceId,
        token: effectiveToken || null,
        client_token: process.env.ZAPI_CLIENT_TOKEN || null,
        status: "connecting"
      }).select("*").single();

      if (insertError) throw insertError;
      row = created;
    }

    const papi = getWhatsAppProvider({
      instanceId: effectiveInstanceId,
      token: effectiveToken,
      clientToken: row.client_token || process.env.ZAPI_CLIENT_TOKEN,
    });

    try {
      const status = await papi.getStatus(effectiveInstanceId);
      if (
        status?.connected === true ||
        status?.authenticated === true ||
        ["connected", "open", "online", "ready", "authenticated"].includes(String(status?.status ?? status?.state ?? status?.connection ?? "").trim().toLowerCase())
      ) {
        await a.from("whatsapp_instances").update({
          status: "connected",
          qr_code: null,
          updated_at: new Date().toISOString()
        }).eq("id", row.id);

        return NextResponse.json({ qr: null, connected: true, status: "connected", instanceId: row.instance_id });
      }
    } catch {
      // continua para buscar o QR Code
    }

    const qr = await papi.getQr(effectiveInstanceId);
    if (qr?.connected) {
      await a.from("whatsapp_instances").update({
        status: "connected",
        qr_code: null,
        updated_at: new Date().toISOString()
      }).eq("id", row.id);

      return NextResponse.json({ qr: null, connected: true, status: "connected", instanceId: row.instance_id });
    }

    const value = qrValue(qr);
    if (!value) {
      return NextResponse.json({ error: "Aguardando novo QR Code da Z-API...", status: "waiting_qr" }, { status: 202 });
    }

    await a.from("whatsapp_instances").update({
      qr_code: value,
      status: "connecting",
      updated_at: new Date().toISOString()
    }).eq("id", row.id);

    return NextResponse.json({ qr: value, connected: false, status: "waiting_qr", instanceId: row.instance_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao obter o QR Code atual da Z-API." }, { status: 500 });
  }
}
