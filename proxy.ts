import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response=NextResponse.next({request});
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll(){return request.cookies.getAll();},setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  const {data}=await supabase.auth.getClaims();
  const path=request.nextUrl.pathname;
  const protectedRoute=path.startsWith("/dashboard")||["/clientes","/planos","/categorias","/cobrancas","/recorrencias","/financeiro","/whatsapp","/relatorios","/configuracoes"].some(p=>path.startsWith(p));
  if(protectedRoute&&!data?.claims){const url=request.nextUrl.clone();url.pathname="/login";return NextResponse.redirect(url);}
  if(protectedRoute&&data?.claims){const {data:member}=await supabase.from("organization_members").select("organization_id,organizations(access_status,trial_ends_at)").eq("user_id",data.claims.sub).limit(1).maybeSingle();const org=Array.isArray(member?.organizations)?member?.organizations[0]:member?.organizations;if(org&&(org.access_status==="blocked"||(org.access_status==="trial"&&new Date(org.trial_ends_at)<new Date()))){const url=request.nextUrl.clone();url.pathname="/bloqueado";return NextResponse.redirect(url);}}
  if(path==="/login"&&data?.claims){const url=request.nextUrl.clone();url.pathname="/dashboard";return NextResponse.redirect(url);}
  return response;
}
export const config={matcher:["/dashboard/:path*","/clientes/:path*","/planos/:path*","/categorias/:path*","/cobrancas/:path*","/recorrencias/:path*","/financeiro/:path*","/whatsapp/:path*","/relatorios/:path*","/configuracoes/:path*","/login"]};