"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, CreditCard, ExternalLink, Loader2, PlugZap, ShieldCheck, Unplug } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";

type Provider = "stripe" | "mercado_pago" | "asaas";
type Integration = {
  id: string;
  provider: Provider;
  status: "disconnected" | "pending" | "connected" | "error";
  mode: "sandbox" | "production";
  account_name: string | null;
  external_account_id: string | null;
  connected_at: string | null;
  last_error: string | null;
};

const providers: Array<{
  id: Provider;
  name: string;
  description: string;
  accent: string;
  help: string;
}> = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Cartão, Pix, assinaturas e cobrança automática.",
    accent: "from-violet-600 to-indigo-600",
    help: "A conexão será feita pelo fluxo seguro do Stripe Connect.",
  },
  {
    id: "mercado_pago",
    name: "Mercado Pago",
    description: "Pix, cartão e cobranças usando a conta do próprio cliente.",
    accent: "from-sky-500 to-blue-600",
    help: "A conexão usa OAuth: o usuário autoriza o Gestor I9 sem entregar a senha.",
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "Pix, boleto, cartão, assinaturas e webhooks.",
    accent: "from-cyan-500 to-teal-600",
    help: "A conexão será validada no servidor. A chave nunca deve ficar no navegador.",
  },
];

export default function IntegracoesPage() {
  const [rows, setRows] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sua sessão expirou. Entre novamente.");
      setLoading(false);
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      setMessage(memberError?.message || "Organização não encontrada.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("payment_integrations")
      .select("id,provider,status,mode,account_name,external_account_id,connected_at,last_error")
      .eq("organization_id", member.organization_id);

    if (error) setMessage(error.message);
    else setRows((data || []) as Integration[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function getIntegration(provider: Provider) {
    return rows.find((item) => item.provider === provider);
  }

  async function start(provider: Provider) {
    setBusy(provider);
    setMessage("");

    if (provider === "asaas") {
      setMessage("Asaas: na próxima etapa vamos ativar a conexão por API Key com validação no servidor e webhook. Nenhuma chave deve ser enviada pelo chat.");
      setBusy(null);
      return;
    }

    const response = await fetch(`/api/integracoes/${provider}/start`, { method: "POST" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "A integração ainda precisa das credenciais da aplicação.");
      setBusy(null);
      return;
    }

    if (body.url) window.location.href = body.url;
    else setMessage("A integração não retornou uma URL de autorização.");
    setBusy(null);
  }

  async function disconnect(provider: Provider) {
    if (!confirm("Desconectar esta integração?")) return;
    setBusy(provider);
    const supabase = createClient();
    const current = getIntegration(provider);
    if (current) await supabase.from("payment_integrations").delete().eq("id", current.id);
    await load();
    setBusy(null);
  }

  return (
    <DashboardShell title="Integrações Reais">
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-6 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><PlugZap size={25} /></div>
            <div>
              <h1 className="text-2xl font-black">Integrações Reais</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100">
                Conecte o Gestor I9 ao provedor de pagamentos que sua empresa utiliza. Cada organização terá sua própria conexão e seus próprios recebimentos.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0" size={19} />
            <div><strong>Segurança:</strong> o Gestor I9 não deve pedir senha de Stripe ou Mercado Pago. Usaremos autorização oficial/OAuth. Chaves secretas ficam somente no servidor.</div>
          </div>
        </div>

        {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{message}</div>}

        <div>
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-950">Pagamentos</h2>
            <p className="mt-1 text-sm text-slate-500">Escolha o provedor que deseja usar para gerar e sincronizar cobranças.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {providers.map((provider) => {
                const integration = getIntegration(provider.id);
                const connected = integration?.status === "connected";
                const pending = integration?.status === "pending";
                return (
                  <div key={provider.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
                    <div className={`h-2 bg-gradient-to-r ${provider.accent}`} />
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${provider.accent} text-white shadow-lg`}>
                          <CreditCard size={22} />
                        </div>
                        {connected ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={14} /> Conectado</span>
                          : pending ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Pendente</span>
                          : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Não conectado</span>}
                      </div>

                      <h3 className="mt-5 text-xl font-black">{provider.name}</h3>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{provider.description}</p>
                      <p className="mt-4 text-xs leading-5 text-slate-400">{provider.help}</p>

                      {integration?.account_name && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="text-xs font-bold uppercase text-slate-400">Conta conectada</p>
                          <p className="mt-1 font-black text-slate-700">{integration.account_name}</p>
                        </div>
                      )}

                      <div className="mt-6 flex gap-2">
                        <button
                          onClick={() => connected ? disconnect(provider.id) : start(provider.id)}
                          disabled={busy === provider.id}
                          className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition disabled:opacity-60 ${connected ? "border border-red-200 text-red-600 hover:bg-red-50" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                        >
                          {busy === provider.id ? <Loader2 className="mx-auto animate-spin" size={18} /> : connected ? <span className="inline-flex items-center gap-2"><Unplug size={17} /> Desconectar</span> : <span className="inline-flex items-center gap-2"><PlugZap size={17} /> Conectar</span>}
                        </button>
                        <button type="button" title="Documentação" className="grid w-12 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                          <ExternalLink size={17} />
                        </button>
                      </div>

                      {integration?.last_error && <div className="mt-3 flex gap-2 text-xs font-semibold text-red-600"><CircleAlert size={15} /> {integration.last_error}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <h3 className="font-black">Como vai funcionar</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <div><strong className="text-slate-950">1. Usuário conecta</strong><p className="mt-1">Cada cliente escolhe seu provedor.</p></div>
            <div><strong className="text-slate-950">2. Gestor I9 sincroniza</strong><p className="mt-1">Cobranças e status entram no sistema.</p></div>
            <div><strong className="text-slate-950">3. Webhooks confirmam</strong><p className="mt-1">Pagamentos recebidos atualizam o financeiro.</p></div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
