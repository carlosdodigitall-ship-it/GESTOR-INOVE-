import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  { name: "Mensal Essencial", price: "R$ 20/mês", description: "Para quem está começando a organizar cobranças.", features: ["Até 3 clientes", "1 usuário", "1 WhatsApp", "Cobranças e recorrências"] },
  { name: "Mensal Profissional", price: "R$ 30/mês", description: "Para uma operação com mais clientes e recursos.", features: ["Até 50 clientes", "1 usuário", "1 WhatsApp", "Gestão completa"] },
];

export default function AssinaturaPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#fff_55%)] px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-blue-600">Gestor I9</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">Escolha seu plano</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">Planos do Gestor I9. A integração de pagamento será adicionada em uma próxima etapa.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <article key={plan.name} className={index === 1 ? "rounded-3xl border-2 border-blue-600 bg-white p-7 shadow-2xl shadow-blue-100" : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"}>
              <h2 className="text-2xl font-black">{plan.name}</h2>
              <p className="mt-2 text-slate-500">{plan.description}</p>
              <p className="mt-6 text-4xl font-black text-slate-950">{plan.price}</p>
              <div className="mt-7 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-600">Pagamento em breve</div>
              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check size={17} className="mt-0.5 text-emerald-500" />{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-extrabold text-white hover:bg-blue-700">Voltar ao dashboard</Link>
        </div>
      </div>
    </main>
  );
}
