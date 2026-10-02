import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextParam = request.nextUrl.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (!token_hash || type !== "email") {
    return NextResponse.redirect(new URL("/login?error=link_confirmacao_invalido", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    console.error("Erro ao confirmar e-mail:", error);
    return NextResponse.redirect(new URL("/login?error=confirmacao_expirada", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
