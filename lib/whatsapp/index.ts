import { PapiProvider, ZapiProvider, WhatsAppProvider } from "./provider";

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = (process.env.WHATSAPP_PROVIDER || "zapi").trim().toLowerCase();
  return provider === "papi" ? new PapiProvider() : new ZapiProvider();
}
