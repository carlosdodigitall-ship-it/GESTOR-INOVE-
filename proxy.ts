import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll(){return request.cookies.getAll();},setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  const {data}=await supabase.auth.getClaims();
  const protectedRoute=request.nextUrl.pathname.startsWith("/dashboard")||["/clientes","/planos","/categorias","/cobrancas","/recorrencias","/financeiro","/whatsapp","/relatorios","/configuracoes"].some(p=>request.nextUrl.pathname.startsWith(p));
  if(protectedRoute&&!data?.claims){const url=request.nextUrl.clone();url.pathname="/login";return NextResponse.redirect(url);}
  if(request.nextUrl.pathname==="/login"&&data?.claims){const url=request.nextUrl.clone();url.pathname="/dashboard";return NextResponse.redirect(url);}
  return response;
}
export const config={matcher:["/dashboard/:path*","/clientes/:path*","/planos/:path*","/categorias/:path*","/cobrancas/:path*","/recorrencias/:path*","/financeiro/:path*","/whatsapp/:path*","/relatorios/:path*","/configuracoes/:path*","/login"]};
