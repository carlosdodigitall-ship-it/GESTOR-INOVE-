import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FROM = "CloudZap <suporte@cloudzapweb.site>";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || email !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY não configurada.");
      return NextResponse.json({ error: "Serviço de e-mail não configurado." }, { status: 503 });
    }

    const safeName = name || user.user_metadata?.full_name || "Cliente";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject: "Bem-vindo ao CloudZap",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:600px;margin:auto;padding:32px">
            <h1 style="margin:0 0 16px;color:#2563eb">Bem-vindo ao CloudZap!</h1>
            <p>Olá, <strong>${escapeHtml(safeName)}</strong>.</p>
            <p>Sua conta foi criada com sucesso. Agora você já pode acessar seu painel e começar a organizar clientes, cobranças e seu financeiro.</p>
            <p style="margin-top:28px"><a href="https://cloudzapweb.site/dashboard" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Acessar meu painel</a></p>
            <p style="margin-top:32px;color:#64748b;font-size:13px">CloudZap · Gestão inteligente para seu negócio<br>suporte@cloudzapweb.site</p>
          </div>
        `,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Resend error:", result);
      return NextResponse.json({ error: "Não foi possível enviar o e-mail." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: result.id ?? null });
  } catch (error) {
    console.error("Erro no envio de boas-vindas:", error);
    return NextResponse.json({ error: "Erro interno no envio." }, { status: 500 });
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
