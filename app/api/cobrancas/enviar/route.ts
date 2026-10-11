import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppProvider } from "@/lib/whatsapp";

export const runtime = "nodejs";

function formatCurrency(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(val: string): string {
  if (!val) return "—";
  const [y, m, d] = val.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return val;
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
    const chargeId = String(body.chargeId || "");
    if (!chargeId) return NextResponse.json({ error: "ID da cobrança não informado." }, { status: 400 });

    const admin = createAdminClient();

    // Busca a cobrança e o cliente associado
    const { data: charge, error: chargeErr } = await admin
      .from("charges")
      .select("id,amount,due_date,description,pix_code,payment_method,whatsapp_message_sent,customer_id,customers(id,name,phone,email)")
      .eq("id", chargeId)
      .eq("organization_id", member.organization_id)
      .single();

    if (chargeErr || !charge) {
      return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });
    }

    const customer = Array.isArray(charge.customers) ? charge.customers[0] : charge.customers;
    const phone = customer?.phone?.replace(/\D/g, "");

    if (!phone) {
      return NextResponse.json({ error: "O cliente associado a esta cobrança não possui WhatsApp cadastrado." }, { status: 400 });
    }

    // Busca a instância do WhatsApp da organização
    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", member.organization_id)
      .maybeSingle();

    if (!instance || instance.status !== "connected") {
      return NextResponse.json({
        error: "Seu WhatsApp não está conectado. Acesse o menu WhatsApp para validar o QR Code antes de enviar cobranças."
      }, { status: 400 });
    }

    const papi = getWhatsAppProvider({
      instanceId: instance.instance_id,
      token: instance.token || process.env.ZAPI_TOKEN,
      clientToken: instance.client_token || process.env.ZAPI_CLIENT_TOKEN,
    });

    const clientName = customer?.name || "Cliente";
    const amountStr = formatCurrency(charge.amount);
    const dueDateStr = formatDate(charge.due_date);
    const desc = charge.description || "Mensalidade / Serviço";

    let messageText = `Olá, *${clientName}*! Tudo bem? 👋\n\n`;
    messageText += `Passando para lembrar que a sua fatura está disponível:\n\n`;
    messageText += `📋 *Descrição:* ${desc}\n`;
    messageText += `💰 *Valor:* ${amountStr}\n`;
    messageText += `📅 *Vencimento:* ${dueDateStr}\n`;

    if (charge.pix_code) {
      messageText += `\n🔑 *Pix Copia e Cola:*\n\`\`\`${charge.pix_code}\`\`\`\n`;
    }

    messageText += `\nCaso já tenha efetuado o pagamento, por favor desconsidere este aviso.\n`;
    messageText += `Dúvidas? Estamos à disposição!`;

    const sendRes = await papi.sendMessage({
      to: phone,
      message: messageText,
    }, instance.instance_id);

    // Atualiza a cobrança indicando envio
    await admin.from("charges").update({
      whatsapp_message_sent: true,
      whatsapp_sent_at: new Date().toISOString(),
      last_reminder_at: new Date().toISOString()
    }).eq("id", charge.id);

    return NextResponse.json({
      ok: true,
      message: `Cobrança enviada com sucesso para ${customer.name} (${phone})!`,
      details: sendRes
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao enviar cobrança via WhatsApp." }, { status: 500 });
  }
}
