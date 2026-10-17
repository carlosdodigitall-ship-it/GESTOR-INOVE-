import { PapiProvider, ZapiProvider, WhatsAppProvider, ZapiConfig } from "./provider";
import { EvolutionApiProvider, EvolutionConfig } from "./evolution-provider";

export type WhatsAppProviderCredentials = ZapiConfig & EvolutionConfig;

export function getWhatsAppProvider(customCredentials?: WhatsAppProviderCredentials): WhatsAppProvider {
  const provider = (process.env.WHATSAPP_PROVIDER || "evolution").trim().toLowerCase();
  if (provider === "papi") return new PapiProvider();
  if (provider === "zapi") return new ZapiProvider(customCredentials);
  return new EvolutionApiProvider(customCredentials);
}

export * from "./provider";
export * from "./evolution-provider";
