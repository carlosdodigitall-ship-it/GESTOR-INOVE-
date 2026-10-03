import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, Check, CheckCircle2, CreditCard, MessageCircle, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";
import { Logo } from "@/components/logo";

const features = [
  { title: "Clientes organizados", text: "Cadastre clientes, contatos e acompanhe todo o histórico.", icon: Users },
  { title: "Cobranças sob controle", text: "Veja o que está pago, em aberto e vencido em poucos cliques.", icon: WalletCards },
  { title: "Recorrências", text: "Estruture cobranças recorrentes e acompanhe cada ciclo.", icon: CreditCard },
  { title: "WhatsApp", text: "Centralize sua operação de comunicação e lembretes.", icon: MessageCircle },
  { title: "Relatórios", text: "Transforme seus dados financeiros em uma visão clara do negócio.", icon: BarChart3 },
  { title: "Notificações", text: "Tenha uma visão rápida dos eventos que merecem sua atenção.", icon: BellRing },
];

const plans = [
  {
    name: "Teste Grátis",
    price: "0",
    period: "3 dias",
    description: "Conheça o CloudZap antes de escolher seu plano.",
    badge: "Comece grátis",
    items: ["3 dias de acesso", "Até 1 cliente", "Até 1 WhatsApp", "Recursos principais da plataforma"],
  },
  {
    name: "Mensal Essencial",
    price: "20",
    period: "/mês",
    description: "Para começar com uma operação pequena e organizada.",
    items: ["Até 50 clientes", "1 usuário", "1 WhatsApp", "Cobranças e recorrências", "Financeiro e relatórios"],
  },
  {
    name: "Mensal Profissional",
    price: "30",
    period: "/mês",
    description: "Para quem precisa atender uma carteira sem limite de clientes.",
    featured: true,
    badge: "Mais escolhido",
    items: ["Clientes ilimitados", "1 usuário", "1 WhatsApp", "Todos os recursos essenciais", "Relatórios e gestão completa"],
  },
  {
    name: "Master",
    price: "Personalizado",
    period: "",
    description: "Para operações maiores que precisam trabalhar com equipe.",
    items: ["Clientes ilimitados", "Até 10 usuários", "1 WhatsApp", "Recursos completos", "Estrutura para equipe"],
  },
  {
    name: "Anual",
    price: "Personalizado",
    period: "",
    description: "Para quem prefere organizar a plataforma em um ciclo anual.",
    items: ["Até 1.000 clientes", "1 usuário", "1 WhatsApp", "Recursos completos", "Cobrança anual"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#recursos" className="hover:text-emerald-600">Recursos</a>
            <a href="#como-funciona" className="hover:text-emerald-600">Como funciona</a>
            <a href="#planos" className="hover:text-emerald-600">Planos</a>
            <a href="#faq" className="hover:text-emerald-600">FAQ</a>
          </nav>
          <div className="flex gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Entrar</Link>
            <Link href="/cadastro" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">Começar agora</Link>
          </div>
        </div>
      </header>

      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_#d9f5e7,_transparent_42%),linear-gradient(180deg,#fff_0%,#f0faf5_100%)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-extrabold text-emerald-700 shadow-sm">
              <Sparkles size={15} /> Gestão de cobranças mais simples
            </div>
            <h1 className="max-w-3xl text-5xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Organize suas cobranças e tenha <span className="text-emerald-600">mais controle.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              O CloudZap reúne clientes, cobranças, recorrências, financeiro, WhatsApp e relatórios em um só lugar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro" className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 font-extrabold text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700">
                Criar minha conta <ArrowRight size={18} />
              </Link>
              <a href="#recursos" className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-center font-extrabold text-slate-800 hover:bg-slate-50">Conhecer recursos</a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
              <span><CheckCircle2 size={16} className="mr-1 inline text-emerald-500" /> Interface simples</span>
              <span><CheckCircle2 size={16} className="mr-1 inline text-emerald-500" /> Visão financeira</span>
              <span><CheckCircle2 size={16} className="mr-1 inline text-emerald-500" /> Acesso online</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-emerald-900/10 sm:p-6">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-semibold text-slate-400">Visão geral</p><p className="mt-1 text-xl font-black">Seu financeiro</p></div>
                  <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400"><BarChart3 size={20}/></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-400">Recebido</p><p className="mt-2 text-2xl font-black">R$ 18.450</p><p className="mt-1 text-xs text-emerald-400">+12,8% no período</p></div>
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-400">Em aberto</p><p className="mt-2 text-2xl font-black">R$ 7.280</p><p className="mt-1 text-xs text-amber-300">Acompanhar</p></div>
                </div>
                <div className="mt-4 rounded-2xl bg-white/5 p-4">
                  <div className="mb-4 flex items-center justify-between text-xs text-slate-400"><span>Recebimentos</span><span>Últimos meses</span></div>
                  <div className="flex h-32 items-end gap-2">{[35,52,42,66,58,78,70,94,80,88,100,91].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-500/80" style={{height:h+"%"}} />)}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {["Clientes","Cobranças","Relatórios"].map((item)=><div key={item} className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-5 py-20 sm:py-24">
        <div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-widest text-emerald-600">Recursos</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Tudo que sua operação precisa para cobrar e acompanhar.</h2><p className="mt-4 leading-7 text-slate-600">Uma experiência pensada para reduzir a desorganização e deixar as informações importantes sempre à mão.</p></div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({title,text:description,icon:Icon})=><div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"><Icon size={22}/></div><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>)}
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:py-24">
          <div className="text-center"><p className="text-sm font-extrabold uppercase tracking-widest text-emerald-600">Como funciona</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Comece em poucos passos.</h2></div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[["01","Cadastre seus clientes","Tenha os contatos e informações da sua carteira organizados."],["02","Crie suas cobranças","Registre valores, vencimentos e acompanhe cada cobrança."],["03","Acompanhe o financeiro","Use o dashboard e os relatórios para entender sua operação."]].map(([n,t,d])=><div key={n} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><div className="text-4xl font-black text-emerald-100">{n}</div><h3 className="mt-4 text-xl font-extrabold">{t}</h3><p className="mt-2 leading-7 text-slate-500">{d}</p></div>)}
          </div>
        </div>
      </section>

      <section id="planos" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:py-24">
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-600">Planos</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Escolha o plano ideal para sua operação.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">Comece com 3 dias de teste e evolua conforme sua carteira de clientes e sua equipe crescerem.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {plans.map((plan) => (
              <div key={plan.name} className={plan.featured ? "relative flex flex-col rounded-3xl border-2 border-emerald-600 bg-white p-6 shadow-2xl shadow-emerald-100" : "relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"}>
                {plan.badge && (
                  <div className={plan.featured ? "absolute -top-3 left-5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white" : "absolute -top-3 left-5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"}>
                    {plan.badge}
                  </div>
                )}
                <h3 className="mt-2 text-xl font-black text-slate-950">{plan.name}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">{plan.description}</p>
                <div className="mt-5 min-h-[54px]">
                  {plan.price === "0" ? (
                    <><span className="text-4xl font-black text-slate-950">Grátis</span><span className="ml-2 text-sm font-semibold text-slate-500">{plan.period}</span></>
                  ) : plan.price === "Personalizado" ? (
                    <span className="text-2xl font-black text-slate-950">Personalizado</span>
                  ) : (
                    <><span className="text-4xl font-black text-slate-950">R$ {plan.price}</span><span className="text-sm text-slate-500">{plan.period}</span></>
                  )}
                </div>
                <Link href="/cadastro" className={plan.featured ? "mt-6 flex justify-center rounded-xl bg-emerald-600 px-4 py-3 font-extrabold text-white hover:bg-emerald-700" : "mt-6 flex justify-center rounded-xl border border-slate-200 px-4 py-3 font-extrabold text-slate-800 hover:bg-slate-50"}>
                  {plan.name === "Teste Grátis" ? "Começar teste" : "Começar agora"}
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-5 text-slate-600">
                      <Check size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-emerald-100 bg-white p-5 text-center shadow-sm">
            <p className="font-bold text-slate-800">Período de teste: 3 dias</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Durante o teste, a conta fica limitada a 1 cliente e 1 número de WhatsApp. Após o período, o acesso aguarda a ativação de um plano.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        <div className="rounded-[2rem] bg-emerald-600 p-8 text-white shadow-2xl shadow-emerald-200 sm:p-12"><div className="max-w-2xl"><ShieldCheck size={28}/><h2 className="mt-5 text-3xl font-black sm:text-4xl">Mais organização para sua cobrança. Mais clareza para sua gestão.</h2><p className="mt-4 leading-7 text-emerald-100">Comece sua estrutura no CloudZap e evolua sua operação conforme sua necessidade.</p><Link href="/cadastro" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-extrabold text-emerald-700">Criar minha conta <ArrowRight size={18}/></Link></div></div>
      </section>

      <section id="faq" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-20">
          <div className="text-center"><p className="text-sm font-extrabold uppercase tracking-widest text-emerald-600">FAQ</p><h2 className="mt-3 text-3xl font-black">Perguntas frequentes</h2></div>
          <div className="mt-10 space-y-3">
            {[["Preciso instalar alguma coisa?","Não. O CloudZap foi pensado para acesso online, pelo navegador."],["Posso começar com poucos clientes?","Sim. A estrutura foi desenhada para acompanhar operações de diferentes tamanhos."],["O sistema trabalha com cobranças recorrentes?","Sim. Existe uma área própria para organizar recorrências e acompanhar seus ciclos."],["Posso testar antes de contratar um plano?","O cadastro inicial permite entrar na plataforma e conhecer a experiência. As condições comerciais podem ser ajustadas antes da cobrança dos planos."]].map(([q,a])=><details key={q} className="group rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer list-none font-extrabold text-slate-800">{q}</summary><p className="mt-3 pr-6 text-sm leading-6 text-slate-500">{a}</p></details>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between"><Logo/><div className="text-sm text-slate-500">© {new Date().getFullYear()} CloudZap. Gestão de cobranças e financeiro.</div><Link href="/login" className="font-bold text-emerald-600">Acessar plataforma →</Link></div>
      </footer>
          <footer className="border-t border-slate-200 bg-slate-50"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left"><p>© {new Date().getFullYear()} CloudZap. Todos os direitos reservados.</p><p>Suporte: <a href="mailto:suporte@cloudzapweb.site" className="font-bold text-emerald-700 hover:text-emerald-800">suporte@cloudzapweb.site</a></p></div></footer>
</main>
  );
}