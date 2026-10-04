import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudZap | CRM, Cobranças e Automação",
  description: "CloudZap: CRM, clientes, cobranças, automação, financeiro e recorrências em um só lugar.",
  themeColor: "#047857",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}