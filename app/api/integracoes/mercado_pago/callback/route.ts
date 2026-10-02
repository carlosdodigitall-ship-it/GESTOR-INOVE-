import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const APP_HOME = "/integracoes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=authorization_denied`, url.origin));
  if (!code || !state) return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=missing_code`, url.origin));

  const admin = createAdminSupabaseClient();
  const { data: oauthState, error: stateError } = await admin
    .from("oauth_states")
    .select("state,organization_id,user_id,code_verifier,expires_at")
    .eq("state", state)
    .eq("provider", "mercado_pago")
    .maybeSingle();

  if (stateError || !oauthState || new Date(oauthState.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=invalid_state`, url.origin));
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI || `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/api/integracoes/mercado_pago/callback`;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=server_config`, url.origin));
  }

  const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: oauthState.code_verifier,
      test_token: "false",
    }),
    cache: "no-store",
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    await admin.from("oauth_states").delete().eq("state", state);
    return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=token_exchange`, url.origin));
  }

  const meResponse = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: "no-store",
  });
  const me = await meResponse.json().catch(() => ({}));

  const { data: existing } = await admin
    .from("payment_integrations")
    .select("id")
    .eq("organization_id", oauthState.organization_id)
    .eq("provider", "mercado_pago")
    .maybeSingle();

  const integrationPayload = {
    organization_id: oauthState.organization_id,
    provider: "mercado_pago",
    status: "connected",
    mode: tokenData.live_mode === false ? "sandbox" : "production",
    external_account_id: String(tokenData.user_id || me.id || ""),
    account_name: me.nickname || me.first_name || `Mercado Pago ${tokenData.user_id || me.id || ""}`,
    token_expires_at: new Date(Date.now() + Number(tokenData.expires_in || 15552000) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    last_error: null,
    metadata: { public_key: tokenData.public_key || null, scope: tokenData.scope || null, live_mode: tokenData.live_mode !== false },
    updated_at: new Date().toISOString(),
  };

  let integrationId = existing?.id;

  if (integrationId) {
    const { error: updateError } = await admin.from("payment_integrations").update(integrationPayload).eq("id", integrationId);
    if (updateError) {
      await admin.from("oauth_states").delete().eq("state", state);
      return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=integration_save`, url.origin));
    }
  } else {
    const { data: created, error: createError } = await admin.from("payment_integrations").insert(integrationPayload).select("id").single();
    if (createError || !created) {
      await admin.from("oauth_states").delete().eq("state", state);
      return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=integration_save`, url.origin));
    }
    integrationId = created.id;
  }

  const { error: tokenError } = await admin.from("payment_provider_tokens").upsert({
    integration_id: integrationId,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    token_expires_at: integrationPayload.token_expires_at,
    updated_at: new Date().toISOString(),
  }, { onConflict: "integration_id" });

  await admin.from("oauth_states").delete().eq("state", state);

  if (tokenError) {
    return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=error&reason=token_save`, url.origin));
  }

  return NextResponse.redirect(new URL(`${APP_HOME}?mercado_pago=connected`, url.origin));
}
