import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloudzap | Gestão de Cobranças",
  description: "Cloudzap: clientes, cobranças, financeiro e recorrências em um só lugar.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}