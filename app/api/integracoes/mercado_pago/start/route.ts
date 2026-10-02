import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function baseUrl() {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
}

function base64url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function POST() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI || (baseUrl() ? `${baseUrl()}/api/integracoes/mercado_pago/callback` : "");

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Mercado Pago ainda não está configurado no servidor. Defina MERCADOPAGO_CLIENT_ID e MERCADOPAGO_REDIRECT_URI (ou APP_URL)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: "Organização não encontrada." }, { status: 400 });
  }

  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());

  const admin = createAdminSupabaseClient();
  await admin
    .from("oauth_states")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "mercado_pago");

  const { error } = await admin.from("oauth_states").insert({
    state,
    organization_id: member.organization_id,
    user_id: user.id,
    provider: "mercado_pago",
    code_verifier: verifier,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  if (error) return NextResponse.json({ error: "Não foi possível iniciar a conexão com o Mercado Pago." }, { status: 500 });

  const authUrl = new URL("https://auth.mercadopago.com/authorization");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("platform_id", "mp");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.json({ url: authUrl.toString() });
}
