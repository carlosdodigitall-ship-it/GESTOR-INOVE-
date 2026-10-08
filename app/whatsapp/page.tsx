"use client";
import {useEffect,useState} from "react";
import QRCode from "qrcode";
import {DashboardShell} from "@/components/dashboard-shell";
import {Loader2,MessageCircle,RefreshCw,Send,Unplug,Wifi} from "lucide-react";

export default function WhatsAppPage(){
  const [status,setStatus]=useState("disconnected");
  const [qr,setQr]=useState("");
  const [qrImage,setQrImage]=useState("");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [phone,setPhone]=useState("");
  const [testing,setTesting]=useState(false);
  const connected=["connected","open","online","ready","authenticated"].includes(status.trim().toLowerCase());

  useEffect(()=>{
    let active=true;
    async function renderQr(){
      if(!qr){setQrImage("");return;}
      if(qr.startsWith("data:image/")||qr.startsWith("http://")||qr.startsWith("https://")){setQrImage(qr);return;}
      if(qr.trim().startsWith("<svg")){setQrImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`);return;}
      try{
        const dataUrl=await QRCode.toDataURL(qr,{width:512,margin:2,errorCorrectionLevel:"M"});
        if(active)setQrImage(dataUrl);
      }catch{if(active)setQrImage("");}
    }
    renderQr();
    return()=>{active=false;};
  },[qr]);

  async function loadStatus(){
    const r=await fetch("/api/whatsapp/status",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setMessage(d.error||"Falha ao consultar o WhatsApp.");return;}
    const next=d.status||"disconnected";
    setStatus(next);
    if(d.connected)setQr("");
  }

  async function loadQr(){
    if(connected)return;
    const r=await fetch("/api/whatsapp/qr",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(r.ok&&d.qr){setQr(d.qr);setStatus("waiting_qr");}
    else if(r.status!==202&&d.error)setMessage(d.error);
  }

  async function connect(){
    setLoading(true);setMessage("");
    try{
      const r=await fetch("/api/whatsapp/connect",{method:"POST"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Falha ao conectar.");
      setStatus(d.status||"connecting");
      if(d.qr)setQr(d.qr);
      if(d.connected)setQr("");
      setMessage(d.connected?"WhatsApp já está conectado.":"QR Code real da P-API carregado. Escaneie com o WhatsApp.");
    }catch(e:any){setMessage(e.message||"Falha ao conectar.");}
    finally{setLoading(false);}
  }

  async function disconnect(){
    if(!confirm("Desconectar este WhatsApp?"))return;
    const r=await fetch("/api/whatsapp/disconnect",{method:"POST"});
    if(r.ok){setStatus("disconnected");setQr("");setMessage("WhatsApp desconectado.");}
  }

  async function test(){
    setTesting(true);setMessage("");
    const r=await fetch("/api/whatsapp/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone})});
    const d=await r.json().catch(()=>({}));
    setMessage(r.ok?"Mensagem de teste enviada.":d.error||"Falha no envio.");
    setTesting(false);
  }

  useEffect(()=>{
    loadStatus();
    const statusTimer=setInterval(loadStatus,5000);
    const qrTimer=setInterval(loadQr,5000);
    return()=>{clearInterval(statusTimer);clearInterval(qrTimer)};
  },[connected]);

  return <DashboardShell title="WhatsApp">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-blue-800 to-blue-500 p-7 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10"><MessageCircle size={28}/></div>
          <div><h1 className="text-2xl font-black">Conectar WhatsApp</h1><p className="mt-1 text-sm text-blue-100">Conexão real através da P-API.</p></div>
        </div>
      </div>

      {message&&<div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Status real</p><h2 className="mt-1 text-2xl font-black text-slate-950">{status}</h2></div>
            <span className={`rounded-full px-4 py-2 text-xs font-black ${connected?"bg-blue-50 text-blue-700":"bg-slate-100 text-slate-600"}`}>{connected?"Conectado":"Aguardando conexão"}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={connect} disabled={loading} className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-60">
              {loading?<Loader2 className="inline animate-spin"/>:<Wifi className="mr-2 inline" size={18}/>}Conectar / Reconectar
            </button>
            <button onClick={loadQr} disabled={connected} className="rounded-xl border px-5 py-3 font-black text-slate-700 disabled:opacity-40"><RefreshCw className="mr-2 inline" size={17}/>Atualizar QR</button>
            {connected&&<button onClick={disconnect} className="rounded-xl border border-red-200 px-5 py-3 font-black text-red-600"><Unplug className="mr-2 inline" size={17}/>Desconectar</button>}
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
            <p className="font-black text-slate-950">Como funciona</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>O CloudZap cria ou reutiliza sua instância na P-API.</li>
              <li>O CloudZap busca o QR Code atual diretamente da P-API.</li>
              <li>Você escaneia esse QR no WhatsApp do celular.</li>
              <li>A P-API confirma a autenticação.</li>
              <li>Só depois o CloudZap mostra <strong>Conectado</strong>.</li>
            </ol>
          </div>
        </section>

        <aside className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Wifi size={18} className="text-blue-700"/><h2 className="font-black">QR Code atual</h2></div>
          <div className="mt-5 grid min-h-[280px] place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
            {connected?<p className="px-5 text-center text-sm font-bold text-blue-700">WhatsApp autenticado. O QR Code foi removido.</p>:qrImage?<img src={qrImage} alt="QR Code real da P-API" className="h-64 w-64 rounded-xl bg-white p-2"/>:<p className="px-5 text-center text-sm text-slate-400">Clique em conectar para obter o QR Code real da P-API.</p>}
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><Send size={18} className="text-blue-700"/><h2 className="font-black">Teste de envio</h2></div>
        <p className="mt-1 text-sm text-slate-500">Disponível somente depois que a P-API confirmar a conexão.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="5575999999999" className="flex-1 rounded-xl border px-4 py-3 outline-none focus:border-blue-500"/>
          <button onClick={test} disabled={testing||!phone||!connected} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">{testing?"Enviando...":"Enviar teste"}</button>
        </div>
      </section>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><strong>Conexão real:</strong> a chave da P-API permanece somente no servidor. O CloudZap não marca como conectado sem confirmação do status remoto.</div>
    </div>
  </DashboardShell>
}