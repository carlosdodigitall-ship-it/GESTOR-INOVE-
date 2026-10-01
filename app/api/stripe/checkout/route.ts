import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  monthly_20: process.env.STRIPE_PRICE_MONTHLY_20,
  monthly_30: process.env.STRIPE_PRICE_MONTHLY_30,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planCode = String(body?.planCode || "");
    const priceId = PRICE_BY_PLAN[planCode];
    if (!priceId) return NextResponse.json({ error: "Plano não configurado no Stripe." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Faça login para assinar um plano." }, { status: 401 });

    const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!membership?.organization_id) return NextResponse.json({ error: "Organização do usuário não encontrada." }, { status: 400 });

    const { data: organization } = await supabase.from("organizations").select("id,name,stripe_customer_id").eq("id", membership.organization_id).single();
    if (!organization) return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });

    let customerId = organization.stripe_customer_id || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: organization.name || undefined,
        metadata: { organization_id: organization.id, user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", organization.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl + "/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: appUrl + "/assinatura",
      metadata: { organization_id: organization.id, plan_code: planCode },
      subscription_data: { metadata: { organization_id: organization.id, plan_code: planCode } },
      integration_identifier: "gestor_i9_" + planCode + "_checkout",
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error: "Não foi possível iniciar o checkout." }, { status: 500 });
  }
}
