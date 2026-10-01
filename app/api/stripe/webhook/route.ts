import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return NextResponse.json({ error: "Webhook Stripe não configurado." }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature error", error);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: existingEvent } = await supabase.from("stripe_events").select("id,processed_at").eq("stripe_event_id", event.id).maybeSingle();
  if (existingEvent?.processed_at) return NextResponse.json({ received: true });

  const object = event.data.object as Record<string, any>;
  const metadata = (object.metadata || {}) as Record<string, string>;
  const organizationId = metadata.organization_id || null;

  await supabase.from("stripe_events").upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    organization_id: organizationId,
    payload: event,
  }, { onConflict: "stripe_event_id" });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (organizationId) await supabase.from("organizations").update({
        access_status: "active",
        activated_at: new Date().toISOString(),
        stripe_customer_id: customerId || null,
        stripe_subscription_id: subscriptionId || null,
        subscription_plan_code: session.metadata?.plan_code || null,
        subscription_status: "active",
      }).eq("id", organizationId);
    }

    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organization_id || organizationId;
      const planCode = subscription.metadata?.plan_code || null;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const item = subscription.items.data[0];
      const price = item?.price;
      const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
      const active = ["active", "trialing"].includes(subscription.status);

      if (orgId) {
        await supabase.from("organizations").update({
          access_status: active ? "active" : "blocked",
          activated_at: active ? new Date().toISOString() : undefined,
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscription.id,
          stripe_price_id: price?.id || null,
          subscription_plan_code: planCode,
          subscription_status: subscription.status,
          subscription_current_period_end: periodEnd,
        }).eq("id", orgId);

        await supabase.from("subscriptions").upsert({
          organization_id: orgId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan_name: planCode,
          amount: price?.unit_amount ? price.unit_amount / 100 : null,
          interval: price?.recurring?.interval || null,
          current_period_end: periodEnd,
          stripe_price_id: price?.id || null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof (invoice as unknown as { subscription?: string | { id: string } | null }).subscription === "string"
        ? (invoice as unknown as { subscription?: string | { id: string } | null }).subscription
        : (invoice as unknown as { subscription?: string | { id: string } | null }).subscription?.id;
      if (subscriptionId) await supabase.from("subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof (invoice as unknown as { subscription?: string | { id: string } | null }).subscription === "string"
        ? (invoice as unknown as { subscription?: string | { id: string } | null }).subscription
        : (invoice as unknown as { subscription?: string | { id: string } | null }).subscription?.id;
      if (subscriptionId) await supabase.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
    }

    await supabase.from("stripe_events").update({ processed_at: new Date().toISOString() }).eq("stripe_event_id", event.id);
  } catch (error) {
    console.error("Stripe webhook processing error", error);
    return NextResponse.json({ error: "Falha ao processar evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
