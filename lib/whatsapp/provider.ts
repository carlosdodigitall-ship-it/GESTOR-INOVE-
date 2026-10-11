export type WhatsAppSendInput = {
  to: string;
  message: string;
};

export interface WhatsAppProvider {
  sendMessage(input: WhatsAppSendInput, instanceId?: string): Promise<{ success: boolean; messageId?: string }>;
  getStatus(instanceId?: string): Promise<any>;
  getQr(instanceId?: string): Promise<any>;
  createInstance(instanceId?: string): Promise<any>;
  deleteInstance(instanceId?: string): Promise<any>;
  configureWebhook(instanceId?: string, url?: string): Promise<any>;
}

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Se tem 10 ou 11 dígitos no padrão brasileiro (DDD + número), adiciona DDI 55
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }
  return digits;
}

export type ZapiConfig = {
  baseUrl?: string;
  instanceId?: string;
  token?: string;
  clientToken?: string;
};

export class ZapiProvider implements WhatsAppProvider {
  private readonly baseUrl: string;
  private readonly instanceId: string;
  private readonly token: string;
  private readonly clientToken: string;

  constructor(customConfig?: ZapiConfig) {
    this.baseUrl = (customConfig?.baseUrl || process.env.ZAPI_BASE_URL || "https://api.z-api.io").replace(/\/$/, "");
    this.instanceId = customConfig?.instanceId || process.env.ZAPI_INSTANCE_ID || "";
    this.token = customConfig?.token || process.env.ZAPI_TOKEN || "";
    this.clientToken = customConfig?.clientToken || process.env.ZAPI_CLIENT_TOKEN || "";
  }

  private path(pathname: string, instanceIdOverride?: string) {
    const inst = instanceIdOverride || this.instanceId;
    const tok = this.token;

    if (!inst || !tok) {
      throw new Error(
        "Z-API não configurada: ID da Instância e Token são necessários. Preencha no painel ou configure ZAPI_INSTANCE_ID e ZAPI_TOKEN no servidor."
      );
    }
    return `${this.baseUrl}/instances/${encodeURIComponent(inst)}/token/${encodeURIComponent(tok)}${pathname}`;
  }

  private async request(pathname: string, init: RequestInit = {}, instanceIdOverride?: string): Promise<any> {
    const url = this.path(pathname, instanceIdOverride);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> || {}),
    };

    if (this.clientToken) {
      headers["Client-Token"] = this.clientToken;
    }

    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      // Se já estiver conectado ao tentar pegar QR code, não considera erro fatal
      if (pathname.includes("qr-code") && (body?.connected || response.status === 400)) {
        return { connected: true, qr: null, status: "connected" };
      }
      throw new Error(body?.error || body?.message || `Z-API retornou HTTP ${response.status}`);
    }
    return body;
  }

  async createInstance(_instanceId?: string): Promise<any> {
    return { configuredExternally: true };
  }

  async getQr(instanceId?: string): Promise<any> {
    try {
      const imgRes = await this.request("/qr-code/image", { method: "GET" }, instanceId);
      if (imgRes?.connected) return imgRes;
      if (imgRes?.value) return imgRes;
      return imgRes;
    } catch {
      return this.request("/qr-code", { method: "GET" }, instanceId);
    }
  }

  async getStatus(instanceId?: string): Promise<any> {
    const res = await this.request("/status", { method: "GET" }, instanceId);
    return {
      connected: Boolean(res?.connected),
      ...res,
    };
  }

  async deleteInstance(instanceId?: string): Promise<any> {
    try {
      return await this.request("/disconnect", { method: "GET" }, instanceId);
    } catch {
      return await this.request("/restart", { method: "GET" }, instanceId).catch(() => ({ disconnected: true }));
    }
  }

  async configureWebhook(instanceId?: string, url?: string): Promise<any> {
    if (!url) return { ok: false };
    const resReceived = await this.request("/update-webhook-received", {
      method: "PUT",
      body: JSON.stringify({ value: url }),
    }, instanceId).catch(() => null);

    const resDisc = await this.request("/update-webhook-disconnected", {
      method: "PUT",
      body: JSON.stringify({ value: url }),
    }, instanceId).catch(() => null);

    return { received: resReceived, disconnected: resDisc };
  }

  async sendMessage(
    input: WhatsAppSendInput,
    instanceId?: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const formattedPhone = normalizeWhatsAppPhone(input.to);
    if (!formattedPhone) {
      throw new Error("Número de WhatsApp de destino inválido.");
    }

    const body = await this.request("/send-text", {
      method: "POST",
      body: JSON.stringify({
        phone: formattedPhone,
        message: input.message,
      }),
    }, instanceId);

    return {
      success: true,
      messageId: body?.messageId || body?.id || body?.zaapId || body?.message?.id,
    };
  }
}

export class PapiProvider implements WhatsAppProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    baseUrl = process.env.PAPI_BASE_URL || "https://api.papi.api.br",
    apiKey = process.env.PAPI_API_KEY || "",
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error("PAPI_API_KEY não configurada no servidor.");
    }

    const response = await fetch(this.baseUrl.replace(/\/$/, "") + path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...(init.headers || {}),
      },
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.error || body?.message || `P-API retornou HTTP ${response.status}`);
    }

    return body;
  }

  async createInstance(instanceId?: string): Promise<any> {
    return this.request("/api/instances", {
      method: "POST",
      body: JSON.stringify({ id: instanceId }),
    });
  }

  async getQr(instanceId?: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId || "")}/qr`);
  }

  async getStatus(instanceId?: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId || "")}/status`);
  }

  async deleteInstance(instanceId?: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId || "")}`, { method: "DELETE" });
  }

  async configureWebhook(instanceId?: string, url?: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId || "")}/webhook`, {
      method: "POST",
      body: JSON.stringify({ url, enabled: true, events: ["messages", "status"] }),
    });
  }

  async sendMessage(
    input: WhatsAppSendInput,
    instanceId?: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const digits = normalizeWhatsAppPhone(input.to);
    const body = await this.request(`/api/instances/${encodeURIComponent(instanceId || "")}/send-text`, {
      method: "POST",
      body: JSON.stringify({ jid: `${digits}@s.whatsapp.net`, text: input.message }),
    });

    return { success: true, messageId: body?.id || body?.messageId || body?.key?.id };
  }
}
