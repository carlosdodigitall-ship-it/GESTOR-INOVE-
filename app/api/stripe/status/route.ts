import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ connected: false, error: "STRIPE_SECRET_KEY não configurada." }, { status: 503 });
  }

  const response = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { connected: false, error: data?.error?.message || "Stripe recusou a conexão." },
      { status: response.status || 502 }
    );
  }

  return NextResponse.json({
    connected: true,
    livemode: Boolean(data.livemode),
    account_id: data.id,
    business_name: data.business_profile?.name || data.settings?.dashboard?.display_name || data.email || null,
    country: data.country || null,
    default_currency: data.default_currency || null,
  });
}
