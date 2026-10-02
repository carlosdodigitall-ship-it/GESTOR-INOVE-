import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const parts = signature.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((value) => {
    try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(value)); } catch { return false; }
  });
}

async function saveSubscription(subscription: any, organizationId: string, planCode = "mensal_20") {
  const supabase = createClient();
  const status = subscription.status || "unknown";
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
  const { error } = await supabase.from("billing_subscriptions").upsert({
    organization_id: organizationId,
    provider: "stripe",
    plan_code: planCode,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null,
    stripe_subscription_id: subscription.id,
    status,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,provider" });
  if (error) throw error;
  await supabase.from("organizations").update({
    access_status: ["active", "trialing"].includes(status) ? "active" : "blocked",
  }).eq("id", organizationId);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET não configurado." }, { status: 503 });

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature || !verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Assinatura Stripe inválida." }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: "Payload inválido." }, { status: 400 }); }

  try {
    const object = event.data?.object;

    if (event.type === "checkout.session.completed") {
      const organizationId = object?.metadata?.organization_id;
      const planCode = object?.metadata?.plan_code || "mensal_20";
      if (organizationId && object?.subscription) {
        await saveSubscription({
          id: object.subscription,
          customer: object.customer,
          status: "active",
          metadata: { organization_id: organizationId, plan_code: planCode },
        }, organizationId, planCode);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const organizationId = object?.metadata?.organization_id;
      if (organizationId && object?.id) await saveSubscription(object, organizationId, object?.metadata?.plan_code || "mensal_20");
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const subscriptionId = typeof object?.subscription === "string" ? object.subscription : object?.subscription?.id;
      if (subscriptionId) {
        const supabase = createClient();
        const { data } = await supabase.from("billing_subscriptions").select("organization_id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
        if (data) await supabase.from("organizations").update({ access_status: "active" }).eq("id", data.organization_id);
      }
    }

    if (event.type === "invoice.payment_failed") {
      const subscriptionId = typeof object?.subscription === "string" ? object.subscription : object?.subscription?.id;
      if (subscriptionId) {
        const supabase = createClient();
        await supabase.from("billing_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json({ error: "Erro ao processar webhook." }, { status: 500 });
  }
}
