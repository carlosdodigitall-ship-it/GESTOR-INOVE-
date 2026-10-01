import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Gestor I9 | Gestão de Cobranças",description:"Controle cobranças, clientes e financeiro em um só lugar."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}