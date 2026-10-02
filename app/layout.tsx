import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Gestor Zap V2 | Gestão de Cobranças",description:"Gestor Zap V2: clientes, cobranças, financeiro e recorrências em um só lugar.",icons:{icon:"/icon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}