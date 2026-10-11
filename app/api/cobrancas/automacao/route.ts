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

    const admin = createAdminClient();

    // Verifica status da instância WhatsApp
    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("*")
      .eq("organization_id", member.organization_id)
      .maybeSingle();

    if (!instance || instance.status !== "connected") {
      return NextResponse.json({
        error: "WhatsApp não está conectado. Conecte sua instância da Z-API no menu WhatsApp antes de rodar os envios automáticos."
      }, { status: 400 });
    }

    const papi = getWhatsAppProvider({
      instanceId: instance.instance_id,
      token: instance.token || process.env.ZAPI_TOKEN,
      clientToken: instance.client_token || process.env.ZAPI_CLIENT_TOKEN,
    });

    const today = new Date().toISOString().split("T")[0];

    // Busca cobranças pendentes ou vencidas
    const { data: charges, error: chargesErr } = await admin
      .from("charges")
      .select("id,amount,due_date,description,pix_code,payment_method,whatsapp_message_sent,customer_id,customers(id,name,phone,automatic_message)")
      .eq("organization_id", member.organization_id)
      .in("status", ["pending", "overdue"])
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(50);

    if (chargesErr) throw chargesErr;

    const list = charges || [];
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const charge of list) {
      const customer = Array.isArray(charge.customers) ? charge.customers[0] : charge.customers;
      if (!customer) continue;

      // Se o cliente tem a automação desligada, pula
      if (customer.automatic_message === false) continue;

      const phone = customer.phone?.replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;

      try {
        const clientName = customer.name || "Cliente";
        const amountStr = formatCurrency(charge.amount);
        const dueDateStr = formatDate(charge.due_date);
        const desc = charge.description || "Mensalidade";

        let text = `Olá, *${clientName}*! 👋\n\n`;
        text += `Notificação de cobrança programada:\n\n`;
        text += `📋 *Descrição:* ${desc}\n`;
        text += `💰 *Valor:* ${amountStr}\n`;
        text += `📅 *Vencimento:* ${dueDateStr}\n`;

        if (charge.pix_code) {
          text += `\n🔑 *Pix Copia e Cola:*\n\`\`\`${charge.pix_code}\`\`\`\n`;
        }

        text += `\nSe o pagamento já foi efetuado, por favor desconsidere este aviso.\nObrigado!`;

        await papi.sendMessage({ to: phone, message: text }, instance.instance_id);

        await admin.from("charges").update({
          whatsapp_message_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
          last_reminder_at: new Date().toISOString(),
        }).eq("id", charge.id);

        sentCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`${customer.name}: ${err?.message || "Erro no envio"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      totalEligible: list.length,
      sentCount,
      failedCount,
      errors: errors.slice(0, 5),
      message: `Disparo automático concluído: ${sentCount} cobranças enviadas via Z-API WhatsApp (${failedCount} falhas).`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao processar cobranças automáticas." }, { status: 500 });
  }
}
