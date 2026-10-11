"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  MessageCircle,
  Wifi,
  RefreshCw,
  Send,
  Unplug,
  Loader2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

export default function WhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [status, setStatus] = useState("Carregando...");
  const [connected, setConnected] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [testing, setTesting] = useState(false);

  async function loadStatus() {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));

      if (d.connected) {
        setConnected(true);
        setStatus("Conectado");
        setConnectedPhone(d.phone || null);
        setQr(null);
        setQrImage("");
        setErrorNotice("");
      } else if (d.status === "not_configured") {
        setConnected(false);
        setStatus("Não configurado");
        setErrorNotice(d.message || "Informe o ID da Instância e Token da Z-API.");
      } else {
        setConnected(false);
        setStatus(d.status === "connecting" ? "Aguardando leitura do QR Code" : "Desconectado");
        if (d.phone) setConnectedPhone(d.phone);
      }
    } catch {
      // Ignora falhas temporárias de rede
    }
  }

  async function loadQr() {
    try {
      const res = await fetch("/api/whatsapp/qr", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));

      if (d.connected) {
        setConnected(true);
        setStatus("Conectado");
        setQr(null);
        setQrImage("");
        return;
      }

      if (d.qr) {
        setQr(d.qr);
        setStatus("Aguardando leitura do QR Code");
        setErrorNotice("");
      } else if (d.error) {
        if (d.status === "not_configured") {
          setErrorNotice(d.error);
          setShowConfig(true);
        }
      }
    } catch {
      // erro de rede
    }
  }

  async function connect(customCredentials?: { instanceId?: string; token?: string; clientToken?: string }) {
    setLoading(true);
    setMessage("");
    setErrorNotice("");
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customCredentials || { instanceId, token, clientToken }),
      });
      const d = await res.json().catch(() => ({}));

      if (!res.ok || d.error) {
        setErrorNotice(d.error || "Falha ao iniciar conexão com a Z-API.");
        return;
      }

      if (d.connected) {
        setConnected(true);
        setStatus("Conectado");
        setQr(null);
        setMessage("WhatsApp conectado com sucesso!");
      } else if (d.qr) {
        setQr(d.qr);
        setStatus("Aguardando leitura do QR Code");
        setMessage("QR Code gerado! Escaneie pelo WhatsApp no celular.");
      } else {
        setMessage("Instância inicializada. Buscando QR Code...");
        await loadQr();
      }
    } catch (e: any) {
      setErrorNotice(e?.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!confirm("Tem certeza que deseja desconectar esta instância do WhatsApp?")) return;
    setLoading(true);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setConnected(false);
      setStatus("Desconectado");
      setConnectedPhone(null);
      setQr(null);
      setQrImage("");
      setMessage("Instância desconectada com sucesso.");
    } catch {
      setErrorNotice("Falha ao desconectar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!instanceId || !token) {
      setErrorNotice("ID da Instância e Token são obrigatórios.");
      return;
    }
    setSavingConfig(true);
    await connect({ instanceId, token, clientToken });
    setSavingConfig(false);
    setShowConfig(false);
  }

  async function test() {
    if (!phone) {
      setErrorNotice("Informe um número de telefone com DDD para teste.");
      return;
    }
    setTesting(true);
    setMessage("");
    setErrorNotice("");
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json().catch(() => ({}));

      if (!res.ok || d.error) {
        setErrorNotice(d.error || "Falha no envio da mensagem de teste.");
      } else {
        setMessage(`Mensagem de teste enviada com sucesso para ${phone}! Verifique o WhatsApp.`);
      }
    } catch {
      setErrorNotice("Erro de comunicação ao enviar teste.");
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function renderQr() {
      if (!qr) {
        setQrImage("");
        return;
      }
      if (qr.startsWith("data:image/") || qr.startsWith("http://") || qr.startsWith("https://")) {
        setQrImage(qr);
        return;
      }
      if (qr.trim().startsWith("<svg")) {
        setQrImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(qr, { width: 512, margin: 2, errorCorrectionLevel: "M" });
        if (active) setQrImage(dataUrl);
      } catch {
        if (active) setQrImage("");
      }
    }
    renderQr();
    return () => {
      active = false;
    };
  }, [qr]);

  useEffect(() => {
    loadStatus();
    loadQr();
    const statusTimer = setInterval(loadStatus, 4000);
    return () => {
      clearInterval(statusTimer);
    };
  }, []);

  return (
    <DashboardShell title="WhatsApp (Z-API)">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Banner Superior */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 p-7 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <MessageCircle size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Conexão WhatsApp (Z-API)</h1>
                <p className="mt-1 text-sm text-blue-100">
                  Validação de QR Code, envio de mensagens e cobranças automáticas.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-white/15 px-4 py-2.5 text-xs font-black text-white hover:bg-white/25 sm:self-auto"
            >
              <Settings size={16} />
              {showConfig ? "Ocultar Credenciais" : "Configurar Z-API"}
            </button>
          </div>
        </div>

        {/* Notificações */}
        {message && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {errorNotice && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <AlertCircle size={20} className="shrink-0 text-red-600" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Formulário de Configuração Manual da Z-API */}
        {showConfig && (
          <form
            onSubmit={handleSaveConfig}
            className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-blue-700" size={20} />
              <h3 className="font-black text-slate-900">Credenciais da Z-API</h3>
            </div>
            <p className="text-xs text-slate-500">
              Você pode preencher as credenciais da sua instância da Z-API aqui ou adicioná-las nas variáveis de ambiente da Vercel (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">ZAPI_INSTANCE_ID</code> e <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">ZAPI_TOKEN</code>).
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ID da Instância Z-API *</label>
                <input
                  type="text"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  placeholder="Ex: 3B497D21..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Token da Instância *</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ex: 8A194BC..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client-Token (Segurança/Opcional)</label>
                <input
                  type="text"
                  value={clientToken}
                  onChange={(e) => setClientToken(e.target.value)}
                  placeholder="Ex: F6291..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingConfig || loading}
                className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {savingConfig ? "Salvando..." : "Salvar e Conectar"}
              </button>
            </div>
          </form>
        )}

        {/* Card Principal de Conexão e QR Code */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Status da Instância</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{status}</h2>
                {connectedPhone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <Smartphone size={14} /> Número: +{connectedPhone}
                  </p>
                )}
              </div>
              <span
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black ${
                  connected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                {connected ? "Conectado" : "Aguardando conexão"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => connect()}
                disabled={loading}
                className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800 disabled:opacity-60 shadow-sm"
              >
                {loading ? <Loader2 className="inline animate-spin mr-2" size={18} /> : <Wifi className="mr-2 inline" size={18} />}
                {connected ? "Reconectar Instância" : "Conectar WhatsApp"}
              </button>
              <button
                onClick={loadQr}
                disabled={connected || loading}
                className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <RefreshCw className="mr-2 inline" size={17} />
                Atualizar QR Code
              </button>
              {connected && (
                <button
                  onClick={disconnect}
                  className="rounded-xl border border-red-200 px-5 py-3 font-black text-red-600 hover:bg-red-50"
                >
                  <Unplug className="mr-2 inline" size={17} />
                  Desconectar
                </button>
              )}
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 border border-slate-100">
              <p className="font-black text-slate-950 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-700" /> Como conectar com a Z-API:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-slate-600 leading-relaxed">
                <li>Clique em <strong>Conectar WhatsApp</strong> para gerar o QR Code oficial.</li>
                <li>Abra o WhatsApp no seu smartphone.</li>
                <li>Acesse <strong>Aparelhos Conectados</strong> &rarr; <strong>Conectar um aparelho</strong>.</li>
                <li>Aponte a câmera para o QR Code ao lado.</li>
                <li>Assim que a Z-API autenticar, o status mudará automaticamente para <strong>Conectado</strong>.</li>
              </ol>
            </div>
          </section>

          {/* Área do QR Code */}
          <aside className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Wifi size={18} className="text-blue-700" />
                <h2 className="font-black text-slate-900">QR Code Oficial</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">Atualizado dinamicamente via Z-API</p>
            </div>

            <div className="my-6 grid min-h-[280px] place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
              {connected ? (
                <div className="text-center space-y-2 p-4">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-sm font-bold text-emerald-800">WhatsApp Conectado!</p>
                  <p className="text-xs text-slate-500">Sua instância está ativa e pronta para envios.</p>
                </div>
              ) : qrImage ? (
                <div className="text-center space-y-3">
                  <img src={qrImage} alt="QR Code Z-API" className="h-64 w-64 rounded-xl bg-white p-2 shadow-md mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Escaneie com a câmera do WhatsApp</p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Smartphone className="mx-auto text-slate-300" size={40} />
                  <p className="text-xs font-medium text-slate-400">
                    Clique em <strong>Conectar WhatsApp</strong> para carregar o QR Code da Z-API.
                  </p>
                </div>
              )}
            </div>

            <div className="text-center">
              <span className="text-[11px] font-medium text-slate-400">
                Integração direta com o gateway da Z-API
              </span>
            </div>
          </aside>
        </div>

        {/* Teste de Envio */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-blue-700" />
            <h2 className="font-black text-slate-900">Teste de Envio de Mensagem</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Envie uma mensagem de teste para o seu próprio WhatsApp para validar a entrega.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 5575999999999 (com DDD)"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
            />
            <button
              onClick={test}
              disabled={testing || !phone || !connected}
              className="rounded-xl bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {testing ? <Loader2 className="inline animate-spin mr-2" size={16} /> : null}
              {testing ? "Enviando..." : "Enviar Teste"}
            </button>
          </div>
          {!connected && (
            <p className="mt-2 text-xs text-amber-600 font-medium">
              * O envio de teste fica disponível assim que o WhatsApp for autenticado.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
