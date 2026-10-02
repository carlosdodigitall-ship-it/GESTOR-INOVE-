import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://yfssdwvbghxyeqqhofal.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_byunObufi15FArLjOh9-Cg_BLij9JCb";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedRoute =
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/assinatura") ||
    ["/clientes","/planos","/categorias","/cobrancas","/recorrencias","/financeiro","/whatsapp","/relatorios","/configuracoes"].some((p) => path.startsWith(p));

  if (!supabaseUrl || !supabasePublishableKey) {
    if (protectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      url.searchParams.set("config", "supabase");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  if (protectedRoute && !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (protectedRoute && data?.claims) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id,organizations(access_status,trial_ends_at)")
      .eq("user_id", data.claims.sub)
      .limit(1)
      .maybeSingle();

    const org = Array.isArray(member?.organizations)
      ? member?.organizations[0]
      : member?.organizations;

    if (path.startsWith("/assinatura")) return response;

    if (
      org &&
      (org.access_status === "blocked" ||
        (org.access_status === "trial" &&
          org.trial_ends_at &&
          new Date(org.trial_ends_at) < new Date()))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/bloqueado";
      return NextResponse.redirect(url);
    }
  }

  if (path === "/login" && data?.claims) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get("next");
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/assinatura/:path*",
    "/clientes/:path*",
    "/planos/:path*",
    "/categorias/:path*",
    "/cobrancas/:path*",
    "/recorrencias/:path*",
    "/financeiro/:path*",
    "/whatsapp/:path*",
    "/relatorios/:path*",
    "/configuracoes/:path*",
    "/login",
  ],
};
