"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const plans = [
  { code: "monthly_20", name: "Mensal Essencial", price: "R$ 20/mês", description: "Até 3 clientes, 1 usuário e 1 WhatsApp.", features: ["Até 3 clientes", "1 usuário", "1 WhatsApp", "Cobranças e recorrências"] },
  { code: "monthly_30", name: "Mensal Profissional", price: "R$ 30/mês", description: "Até 50 clientes, 1 usuário e 1 WhatsApp.", features: ["Até 50 clientes", "1 usuário", "1 WhatsApp", "Gestão completa"] },
];

export default function AssinaturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function checkout(planCode: string) {
    setLoading(planCode);
    setError("");
    const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planCode }) });
    const data = await response.json();
    if (response.status === 401) { router.push("/login?next=/assinatura"); return; }
    if (!response.ok || !data.url) { setError(data.error || "Não foi possível abrir o checkout."); setLoading(null); return; }
    window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#fff_55%)] px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-blue-600">Gestor I9</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">Escolha seu plano</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">O pagamento acontece em um checkout seguro e hospedado pelo Stripe.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <article key={plan.code} className={index === 1 ? "rounded-3xl border-2 border-blue-600 bg-white p-7 shadow-2xl shadow-blue-100" : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"}>
              <h2 className="text-2xl font-black">{plan.name}</h2>
              <p className="mt-2 text-slate-500">{plan.description}</p>
              <p className="mt-6 text-4xl font-black text-slate-950">{plan.price}</p>
              <button onClick={() => checkout(plan.code)} disabled={loading !== null} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading === plan.code ? <Loader2 className="animate-spin" size={18} /> : null} Assinar com Stripe
              </button>
              <ul className="mt-7 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check size={17} className="mt-0.5 text-emerald-500" />{feature}</li>)}</ul>
            </article>
          ))}
        </div>
        {error ? <p className="mt-6 text-center font-semibold text-red-600">{error}</p> : null}
        <p className="mt-8 text-center text-xs text-slate-500">A assinatura é processada pelo Stripe. Nenhum dado sensível do cartão é armazenado pelo Gestor I9.</p>
      </div>
    </main>
  );
}
