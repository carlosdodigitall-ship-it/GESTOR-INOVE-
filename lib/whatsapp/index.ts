import { PapiProvider, ZapiProvider, WhatsAppProvider, ZapiConfig } from "./provider";

export type WhatsAppProviderCredentials = ZapiConfig;

export function getWhatsAppProvider(customCredentials?: WhatsAppProviderCredentials): WhatsAppProvider {
  const provider = (process.env.WHATSAPP_PROVIDER || "zapi").trim().toLowerCase();
  return provider === "papi" ? new PapiProvider() : new ZapiProvider(customCredentials);
}

export * from "./provider";
