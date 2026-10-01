import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function SubscriptionSuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">Pagamento recebido</h1>
        <p className="mt-3 leading-7 text-slate-600">A página de assinatura está sendo preparada. A integração de pagamento será adicionada em uma próxima etapa.</p>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-extrabold text-white hover:bg-blue-700">Ir para o dashboard</Link>
      </section>
    </main>
  );
}
