export type WhatsAppSendInput = {
  to: string;
  message: string;
};

export interface WhatsAppProvider {
  sendMessage(input: WhatsAppSendInput, instanceId: string): Promise<{ success: boolean; messageId?: string }>;
  getStatus(instanceId: string): Promise<any>;
  getQr(instanceId: string): Promise<any>;
  createInstance(instanceId: string): Promise<any>;
  deleteInstance(instanceId: string): Promise<any>;
  configureWebhook(instanceId: string, url: string): Promise<any>;
}

function jid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.endsWith("@s.whatsapp.net") ? digits : `${digits}@s.whatsapp.net`;
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

    const response = await fetch(
      this.baseUrl.replace(/\/$/, "") + path,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          ...(init.headers || {}),
        },
        cache: "no-store",
      },
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        body?.error ||
        body?.message ||
        `P-API retornou HTTP ${response.status}`,
      );
    }

    return body;
  }

  async createInstance(instanceId: string): Promise<any> {
    return this.request("/api/instances", {
      method: "POST",
      body: JSON.stringify({ id: instanceId }),
    });
  }

  async getQr(instanceId: string): Promise<any> {
    return this.request(
      `/api/instances/${encodeURIComponent(instanceId)}/qr`,
    );
  }

  async getStatus(instanceId: string): Promise<any> {
    return this.request(
      `/api/instances/${encodeURIComponent(instanceId)}/status`,
    );
  }

  async deleteInstance(instanceId: string): Promise<any> {
    return this.request(
      `/api/instances/${encodeURIComponent(instanceId)}`,
      { method: "DELETE" },
    );
  }

  async configureWebhook(instanceId: string, url: string): Promise<any> {
    return this.request(
      `/api/instances/${encodeURIComponent(instanceId)}/webhook`,
      {
        method: "POST",
        body: JSON.stringify({
          url,
          enabled: true,
          events: ["messages", "status"],
        }),
      },
    );
  }

  async sendMessage(
    input: WhatsAppSendInput,
    instanceId: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const body = await this.request(
      `/api/instances/${encodeURIComponent(instanceId)}/send-text`,
      {
        method: "POST",
        body: JSON.stringify({
          jid: jid(input.to),
          text: input.message,
        }),
      },
    );

    return {
      success: true,
      messageId: body?.id || body?.messageId || body?.key?.id,
    };
  }
}
