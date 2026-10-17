import type { WhatsAppProvider, WhatsAppSendInput } from "./provider";
import { normalizeWhatsAppPhone } from "./provider";

export type EvolutionConfig = {
  baseUrl?: string;
  apiKey?: string;
  instanceName?: string;
};

/**
 * Evolution API v2 provider. Credentials are read only on the server.
 * Connection status is always taken from Evolution's real connectionState endpoint.
 */
export class EvolutionApiProvider implements WhatsAppProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor(config: EvolutionConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.EVOLUTION_API_URL || "https://api.omensageiro.online").replace(/\/$/, "");
    this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY || "";
    this.instanceName = config.instanceName || (config as any).instanceId || process.env.EVOLUTION_INSTANCE_NAME || "gestor-inove";
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error("Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY nas variáveis da Vercel.");
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: this.apiKey,
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body?.message || body?.error || body?.response?.message;
      throw new Error(Array.isArray(detail) ? detail.join(", ") : detail || `Evolution API retornou HTTP ${response.status}`);
    }
    return body;
  }

  async createInstance(instanceId?: string): Promise<any> {
    const name = instanceId || this.instanceName;
    try {
      return await this.request("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: name,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          rejectCall: false,
          groupsIgnore: true,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
        }),
      });
    } catch (error) {
      // A 409/instance-exists response is surfaced clearly rather than faking a connection.
      throw error;
    }
  }

  async getQr(instanceId?: string): Promise<any> {
    const name = instanceId || this.instanceName;
    const current = await this.getStatus(name);
    if (current.connected) return { ...current, connected: true, qr: null, status: "connected" };
    const result = await this.request(`/instance/connect/${encodeURIComponent(name)}`, { method: "GET" });
    return {
      ...result,
      connected: false,
      qr: result?.base64 || result?.code || result?.pairingCode || null,
      status: "connecting",
    };
  }

  async getStatus(instanceId?: string): Promise<any> {
    const name = encodeURIComponent(instanceId || this.instanceName);
    const result = await this.request(`/instance/connectionState/${name}`, { method: "GET" });
    const state = result?.instance?.state || result?.state || result?.connectionStatus || "close";
    return { ...result, state, connected: state === "open", status: state === "open" ? "connected" : state };
  }

  async sendMessage(input: WhatsAppSendInput, instanceId?: string): Promise<{ success: boolean; messageId?: string }> {
    const to = normalizeWhatsAppPhone(input.to);
    if (!to) throw new Error("Informe um número de WhatsApp válido.");
    if (!input.message.trim()) throw new Error("A mensagem não pode ficar vazia.");
    const name = encodeURIComponent(instanceId || this.instanceName);
    const result = await this.request(`/message/sendText/${name}`, {
      method: "POST",
      body: JSON.stringify({ number: to, text: input.message }),
    });
    return {
      success: Boolean(result?.key?.id || result?.message?.key?.id || result?.status === "PENDING" || result?.success),
      messageId: result?.key?.id || result?.message?.key?.id,
    };
  }

  async deleteInstance(instanceId?: string): Promise<any> {
    const name = encodeURIComponent(instanceId || this.instanceName);
    return this.request(`/instance/logout/${name}`, { method: "DELETE" });
  }

  async configureWebhook(instanceId?: string, url?: string): Promise<any> {
    if (!url) throw new Error("Informe a URL pública do webhook.");
    const name = encodeURIComponent(instanceId || this.instanceName);
    return this.request(`/webhook/set/${name}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url,
          webhookByEvents: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    });
  }
}
