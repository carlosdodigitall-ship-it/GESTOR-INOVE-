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

function normalizePhone(phone: string): string {
  return phone.replace(/\\D/g, "");
}

export class ZapiProvider implements WhatsAppProvider {
  private readonly baseUrl: string;
  private readonly instanceId: string;
  private readonly token: string;
  private readonly clientToken: string;

  constructor() {
    this.baseUrl = (process.env.ZAPI_BASE_URL || "https://api.z-api.io").replace(/\\/$/, "");
    this.instanceId = process.env.ZAPI_INSTANCE_ID || "";
    this.token = process.env.ZAPI_TOKEN || "";
    this.clientToken = process.env.ZAPI_CLIENT_TOKEN || "";
  }

  private path(pathname: string) {
    if (!this.instanceId || !this.token) {
      throw new Error("ZAPI_INSTANCE_ID e ZAPI_TOKEN ainda não foram configurados no servidor.");
    }
    return `${this.baseUrl}/instances/${encodeURIComponent(this.instanceId)}/token/${encodeURIComponent(this.token)}${pathname}`;
  }

  private async request(pathname: string, init: RequestInit = {}): Promise<any> {
    const response = await fetch(this.path(pathname), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.clientToken ? { "Client-Token": this.clientToken } : {}),
        ...(init.headers || {}),
      },
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error || body?.message || `Z-API retornou HTTP ${response.status}`);
    }
    return body;
  }

  async createInstance(_instanceId: string): Promise<any> {
    return { configuredExternally: true };
  }

  async getQr(_instanceId: string): Promise<any> {
    return this.request("/qr-code");
  }

  async getStatus(_instanceId: string): Promise<any> {
    return this.request("/status");
  }

  async deleteInstance(_instanceId: string): Promise<any> {
    return this.request("/logout", { method: "GET" });
  }

  async configureWebhook(_instanceId: string, url: string): Promise<any> {
    return this.request("/update-webhook-received", {
      method: "PUT",
      body: JSON.stringify({ value: url }),
    });
  }

  async sendMessage(
    input: WhatsAppSendInput,
    _instanceId: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const body = await this.request("/send-text", {
      method: "POST",
      body: JSON.stringify({
        phone: normalizePhone(input.to),
        message: input.message,
      }),
    });

    return {
      success: true,
      messageId: body?.messageId || body?.id || body?.message?.id,
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

    const response = await fetch(this.baseUrl.replace(/\\/$/, "") + path, {
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

  async createInstance(instanceId: string): Promise<any> {
    return this.request("/api/instances", {
      method: "POST",
      body: JSON.stringify({ id: instanceId }),
    });
  }

  async getQr(instanceId: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId)}/qr`);
  }

  async getStatus(instanceId: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId)}/status`);
  }

  async deleteInstance(instanceId: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId)}`, { method: "DELETE" });
  }

  async configureWebhook(instanceId: string, url: string): Promise<any> {
    return this.request(`/api/instances/${encodeURIComponent(instanceId)}/webhook`, {
      method: "POST",
      body: JSON.stringify({ url, enabled: true, events: ["messages", "status"] }),
    });
  }

  async sendMessage(
    input: WhatsAppSendInput,
    instanceId: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const digits = input.to.replace(/\\D/g, "");
    const body = await this.request(`/api/instances/${encodeURIComponent(instanceId)}/send-text`, {
      method: "POST",
      body: JSON.stringify({ jid: `${digits}@s.whatsapp.net`, text: input.message }),
    });

    return { success: true, messageId: body?.id || body?.messageId || body?.key?.id };
  }
}
