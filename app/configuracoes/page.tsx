"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import {
  Settings,
  ShieldCheck,
  Building2,
  MessageCircle,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  KeyRound,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [zapiClientToken, setZapiClientToken] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setError("");
      const supabase = createClient();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Sessão não encontrada.");
          setLoading(false);
          return;
        }

        const { data: member } = await supabase
          .from("organization_members")
          .select("organization_id,organizations(id,name)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (member) {
          setOrgId(member.organization_id);
          const org = Array.isArray(member.organizations) ? member.organizations[0] : member.organizations;
          if (org?.name) setOrgName(org.name);

          // Busca dados da instância WhatsApp se existir
          const { data: inst } = await supabase
            .from("whatsapp_instances")
            .select("instance_id,token,client_token,status")
            .eq("organization_id", member.organization_id)
            .maybeSingle();

          if (inst) {
            setZapiInstanceId(inst.instance_id || "");
            setZapiToken(inst.token || "");
            setZapiClientToken(inst.client_token || "");
            setWhatsappConnected(inst.status === "connected");
          }
        }
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      // Salva nome da organização se alterado
      if (orgId && orgName) {
        await supabase.from("organizations").update({ name: orgName }).eq("id", orgId);
      }

      // Se informou credenciais da Z-API, envia para rota de conexão
      if (zapiInstanceId || zapiToken) {
        const res = await fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceId: zapiInstanceId,
            token: zapiToken,
            clientToken: zapiClientToken,
          }),
        });

        const d = await res.json().catch(() => ({}));
        if (!res.ok || d.error) {
          setError(d.error || "Erro ao conectar com as novas credenciais da Z-API.");
          setSaving(false);
          return;
        }
        if (d.connected) setWhatsappConnected(true);
      }

      setMessage("Configurações salvas com sucesso!");
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Configurações">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Configurações Gerais</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie sua organização, parâmetros da Z-API e dados da sua empresa.
          </p>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <AlertCircle size={18} className="text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Carregando configurações...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Bloco Organização */}
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-700" size={20} />
                <h2 className="font-black text-slate-900">Dados da Empresa / Organização</h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Nome da sua empresa"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>
            </section>

            {/* Bloco Z-API */}
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="text-blue-700" size={20} />
                  <h2 className="font-black text-slate-900">Integração Z-API (WhatsApp)</h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    whatsappConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {whatsappConnected ? "WhatsApp Conectado" : "Aguardando Conexão"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure os dados fornecidos pelo painel da Z-API para habilitar o envio de cobranças e notificações automáticas.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID da Instância Z-API</label>
                  <input
                    type="text"
                    value={zapiInstanceId}
                    onChange={(e) => setZapiInstanceId(e.target.value)}
                    placeholder="Ex: 3B497D2140D8C0B..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Token da Instância</label>
                  <input
                    type="text"
                    value={zapiToken}
                    onChange={(e) => setZapiToken(e.target.value)}
                    placeholder="Ex: 8A194BC69E81..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client-Token Z-API (Opcional)</label>
                <input
                  type="text"
                  value={zapiClientToken}
                  onChange={(e) => setZapiClientToken(e.target.value)}
                  placeholder="Ex: F6291C80..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-black text-white hover:bg-blue-800 disabled:opacity-50 shadow-sm transition"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{saving ? "Salvando..." : "Salvar Configurações"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
