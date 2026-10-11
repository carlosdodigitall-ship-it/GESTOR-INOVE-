import { NextResponse } from "next/server";
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

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Se CRON_SECRET estiver configurado no servidor, valida
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Acesso não autorizado ao cron." }, { status: 401 });
    }

    const admin = createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    // Busca todas as instâncias WhatsApp conectadas
    const { data: instances } = await admin
      .from("whatsapp_instances")
      .select("*")
      .eq("status", "connected");

    if (!instances || instances.length === 0) {
      return NextResponse.json({ ok: true, message: "Nenhuma instância WhatsApp conectada para envios." });
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const inst of instances) {
      const papi = getWhatsAppProvider({
        instanceId: inst.instance_id,
        token: inst.token || process.env.ZAPI_TOKEN,
        clientToken: inst.client_token || process.env.ZAPI_CLIENT_TOKEN,
      });

      // Busca cobranças da organização vencendo hoje ou atrasadas
      const { data: charges } = await admin
        .from("charges")
        .select("id,amount,due_date,description,pix_code,customer_id,customers(id,name,phone,automatic_message)")
        .eq("organization_id", inst.organization_id)
        .in("status", ["pending", "overdue"])
        .lte("due_date", today)
        .limit(30);

      for (const charge of charges || []) {
        const customer = Array.isArray(charge.customers) ? charge.customers[0] : charge.customers;
        if (!customer || customer.automatic_message === false) continue;

        const phone = customer.phone?.replace(/\D/g, "");
        if (!phone || phone.length < 10) continue;

        try {
          const clientName = customer.name || "Cliente";
          const amountStr = formatCurrency(charge.amount);
          const dueDateStr = formatDate(charge.due_date);
          const desc = charge.description || "Fatura";

          let text = `Olá, *${clientName}*! 👋\n\n`;
          text += `Lembrete automático de vencimento:\n\n`;
          text += `📋 *Descrição:* ${desc}\n`;
          text += `💰 *Valor:* ${amountStr}\n`;
          text += `📅 *Vencimento:* ${dueDateStr}\n`;

          if (charge.pix_code) {
            text += `\n🔑 *Pix Copia e Cola:*\n\`\`\`${charge.pix_code}\`\`\`\n`;
          }

          text += `\nCaso já tenha pago, desconsidere. Obrigado!`;

          await papi.sendMessage({ to: phone, message: text }, inst.instance_id);

          await admin.from("charges").update({
            whatsapp_message_sent: true,
            whatsapp_sent_at: new Date().toISOString(),
            last_reminder_at: new Date().toISOString()
          }).eq("id", charge.id);

          totalSent++;
        } catch {
          totalErrors++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalSent,
      totalErrors,
      message: `Execução do cron finalizada com ${totalSent} envios e ${totalErrors} erros.`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro interno no cron." }, { status: 500 });
  }
}
