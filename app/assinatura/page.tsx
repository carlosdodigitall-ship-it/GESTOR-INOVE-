"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

const plans = [
  { name: "Mensal Essencial", price: "R$ 20/mês", description: "Para quem está começando a organizar cobranças.", features: ["Até 50 clientes", "1 usuário", "1 WhatsApp", "Cobranças e recorrências"] },
  { name: "Mensal Profissional", price: "R$ 30/mês", description: "Para uma operação com mais clientes e recursos.", features: ["Clientes ilimitados", "1 usuário", "1 WhatsApp", "Gestão completa"] },
];

export default function AssinaturaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Não foi possível iniciar o Checkout.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar o Checkout.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#bbf7d0,_transparent_36%),linear-gradient(180deg,#ecfdf5_0%,#ffffff_55%,#f7fee7_100%)] px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-700">CloudZap</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">Escolha seu plano</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">Assine pela página segura e hospedada da Stripe. Depois podemos personalizar o checkout.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <article key={plan.name} className={index === 1 ? "rounded-3xl border-2 border-emerald-600 bg-white p-7 shadow-2xl shadow-emerald-100" : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"}>
              <h2 className="text-2xl font-black">{plan.name}</h2>
              <p className="mt-2 text-slate-500">{plan.description}</p>
              <p className="mt-6 text-4xl font-black text-slate-950">{plan.price}</p>

              {index === 0 ? (
                <button onClick={checkout} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-600 to-lime-500 px-4 py-3 font-extrabold text-white hover:from-emerald-900 hover:via-emerald-700 hover:to-lime-600 disabled:opacity-60">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? "Abrindo Checkout..." : "Assinar por R$ 20"}
                </button>
              ) : (
                <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-600">Em breve</div>
              )}

              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check size={17} className="mt-0.5 text-emerald-500" />{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {error && <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="inline-flex rounded-xl bg-slate-950 px-6 py-3 font-extrabold text-white hover:bg-slate-800">Voltar ao dashboard</Link>
        </div>
      </div>
    </main>
  );
}
