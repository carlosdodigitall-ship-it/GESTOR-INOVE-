import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function ObrigadoPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_#bbf7d0,_transparent_36%),linear-gradient(180deg,#ecfdf5_0%,#ffffff_65%)] px-5 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-emerald-100 sm:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={44} />
        </div>
        <p className="mt-7 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">CloudZap</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Pagamento concluído</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">
          Recebemos a confirmação do Checkout. Sua assinatura mensal de R$ 20 foi enviada para processamento pela Stripe.
        </p>
        <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          <ShieldCheck size={18} className="text-emerald-600" />
          A confirmação definitiva da assinatura será feita pelo webhook da Stripe.
        </div>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-600 to-lime-500 px-6 py-3.5 font-black text-white hover:from-emerald-900 hover:via-emerald-700 hover:to-lime-600">
          Voltar ao CloudZap
        </Link>
      </section>
    </main>
  );
}
