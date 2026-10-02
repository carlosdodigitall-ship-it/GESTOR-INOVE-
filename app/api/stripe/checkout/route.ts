import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_MENSAL_20 || "price_1ULokT4KC67300n5JxpYSITl";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || "http://localhost:3000";
}

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe não está configurada no servidor. Configure STRIPE_SECRET_KEY na Vercel." }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login no Gestor I9 antes de assinar um plano." }, { status: 401 });

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memberError || !member) return NextResponse.json({ error: "Organização não encontrada para esta conta." }, { status: 400 });

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", STRIPE_PRICE_ID);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${appUrl()}/obrigado?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${appUrl()}/assinatura?cancelled=1`);
  params.set("customer_email", user.email || "");
  params.set("customer_creation", "always");
  params.set("billing_address_collection", "auto");
  params.set("allow_promotion_codes", "true");
  params.set("metadata[organization_id]", member.organization_id);
  params.set("metadata[plan_code]", "mensal_20");
  params.set("subscription_data[metadata][organization_id]", member.organization_id);
  params.set("subscription_data[metadata][plan_code]", "mensal_20");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || !data.url) {
    console.error("Stripe Checkout error:", data);
    return NextResponse.json({ error: data?.error?.message || "Não foi possível criar o Checkout da Stripe." }, { status: response.status || 500 });
  }

  return NextResponse.json({ url: data.url, session_id: data.id });
}
