"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, X, Loader2, Users, CalendarDays,
  MessageCircle, Package, Tag, UserRound, FileText, BellRing
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; name: string };
type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  status: string;
  plan_id: string | null;
  category_id: string | null;
  description: string | null;
  username: string | null;
  due_date: string | null;
  automatic_message: boolean;
  product: string | null;
  created_at: string;
  plans?: Option | Option[] | null;
  plan_categories?: Option | Option[] | null;
};

const emptyForm = {
  name: "", phone: "", email: "", document: "", planId: "", categoryId: "",
  description: "", username: "", dueDate: "", automaticMessage: false, product: ""
};

function normalizeRelation(value: Option | Option[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function validWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export default function ClientesPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const supabase = createClient();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão não encontrada.");
      setLoading(false);
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      setError(memberError?.message || "Organização não encontrada.");
      setLoading(false);
      return;
    }

    setOrgId(member.organization_id);

    const [customersResult, plansResult, categoriesResult] = await Promise.all([
      supabase
        .from("customers")
        .select("id,name,email,phone,document,notes,status,plan_id,category_id,description,username,due_date,automatic_message,product,created_at,plans(id,name),plan_categories(id,name)")
        .eq("organization_id", member.organization_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("plans")
        .select("id,name")
        .eq("organization_id", member.organization_id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("plan_categories")
        .select("id,name")
        .eq("organization_id", member.organization_id)
        .eq("status", "active")
        .order("name")
    ]);

    if (customersResult.error) {
      setError(customersResult.error.message);
    } else {
      const normalized = ((customersResult.data || []) as unknown as Customer[]).map((customer) => ({
        ...customer,
        plans: normalizeRelation(customer.plans),
        plan_categories: normalizeRelation(customer.plan_categories)
      }));
      setRows(normalized);
    }

    if (plansResult.error) setError(plansResult.error.message);
    else setPlans(plansResult.data || []);

    if (categoriesResult.error) setError(categoriesResult.error.message);
    else setCategories(categoriesResult.data || []);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function setField<K extends keyof typeof emptyForm>(key: K, value: typeof emptyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function openNew() {
    reset();
    setModal(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      document: customer.document || "",
      planId: customer.plan_id || "",
      categoryId: customer.category_id || "",
      description: customer.description || "",
      username: customer.username || "",
      dueDate: customer.due_date || "",
      automaticMessage: Boolean(customer.automatic_message),
      product: customer.product || ""
    });
    setError("");
    setModal(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!orgId) return setError("Organização não encontrada.");
    if (!form.name.trim()) return setError("Informe o nome do cliente.");
    if (!validWhatsApp(form.phone)) return setError("Informe um WhatsApp válido com DDD.");

    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      organization_id: orgId,
      name: form.name.trim(),
      phone: form.phone.replace(/\s+/g, " ").trim(),
      email: form.email.trim() || null,
      document: form.document.trim() || null,
      plan_id: form.planId || null,
      category_id: form.categoryId || null,
      description: form.description.trim() || null,
      notes: form.description.trim() || null,
      username: form.username.trim() || null,
      due_date: form.dueDate || null,
      automatic_message: form.automaticMessage,
      product: form.product.trim() || null
    };

    const result = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setModal(false);
      reset();
      await load();
    }

    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("customers").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return rows.filter((customer) =>
      [customer.name, customer.email || "", customer.phone || "", customer.document || "",
       customer.username || "", customer.product || ""].join(" ").toLowerCase().includes(term)
    );
  }, [rows, query]);

  const automaticCount = rows.filter((customer) => customer.automatic_message).length;

  return (
    <DashboardShell title="Clientes">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black">Clientes</h2>
            <p className="mt-1 text-sm text-slate-500">Cadastre e organize sua carteira de clientes, planos e vencimentos.</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">
            <Plus size={18} /> Novo cliente
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Total</p><p className="mt-2 text-3xl font-black">{rows.length}</p></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Com plano</p><p className="mt-2 text-3xl font-black">{rows.filter((c) => c.plan_id).length}</p></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Mensagem automática</p><p className="mt-2 text-3xl font-black">{automaticCount}</p></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Resultado</p><p className="mt-2 text-3xl font-black">{filtered.length}</p></div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, WhatsApp, usuário, produto ou e-mail..." className="w-full outline-none text-sm" />
        </div>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto text-slate-300" />
              <p className="mt-3 font-bold">Nenhum cliente encontrado</p>
              <p className="mt-1 text-sm text-slate-500">Cadastre o primeiro cliente para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">WhatsApp</th>
                    <th className="px-5 py-4">Plano</th>
                    <th className="px-5 py-4">Produto</th>
                    <th className="px-5 py-4">Vencimento</th>
                    <th className="px-5 py-4">Automática</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => {
                    const plan = normalizeRelation(customer.plans);
                    return (
                      <tr key={customer.id} className="border-t hover:bg-slate-50/70">
                        <td className="px-5 py-4"><div className="font-bold">{customer.name}</div><div className="text-xs text-slate-400">{customer.username || "Sem usuário"}</div></td>
                        <td className="px-5 py-4">{customer.phone}</td>
                        <td className="px-5 py-4">{plan?.name || "—"}</td>
                        <td className="px-5 py-4">{customer.product || "—"}</td>
                        <td className="px-5 py-4">{customer.due_date ? new Date(customer.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="px-5 py-4">{customer.automatic_message ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><BellRing size={13} /> Sim</span> : <span className="text-slate-400">Não</span>}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => openEdit(customer)} className="mr-1 rounded-lg p-2 hover:bg-slate-100"><Pencil size={16} /></button>
                          <button onClick={() => remove(customer.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-4">
          <form onSubmit={save} className="mx-auto my-6 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{editing ? "Editar cliente" : "Novo cliente"}</h3>
                <p className="text-sm text-slate-500">Preencha os dados do cliente e da cobrança.</p>
              </div>
              <button type="button" onClick={() => setModal(false)} className="rounded-xl p-2 hover:bg-slate-100"><X /></button>
            </div>

            <div className="mt-6 space-y-6">
              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-black"><UserRound size={17} className="text-blue-600" /> Dados do cliente</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold md:col-span-2">Nome *
                    <input required value={form.name} onChange={(e) => setField("name", e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="Nome completo" />
                  </label>
                  <label className="text-sm font-bold">WhatsApp válido *
                    <input required value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="(75) 99999-9999" />
                    <span className="mt-1 block text-xs font-normal text-slate-400">Informe DDD + número.</span>
                  </label>
                  <label className="text-sm font-bold">E-mail
                    <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="cliente@email.com" />
                  </label>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-black"><Package size={17} className="text-violet-600" /> Serviço contratado</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold">Plano
                    <select value={form.planId} onChange={(e) => setField("planId", e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3">
                      <option value="">Selecione um plano</option>
                      {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold">Categoria
                    <select value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3">
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold">Produto
                    <input value={form.product} onChange={(e) => setField("product", e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="Ex.: IPTV, Consultoria, Internet..." />
                  </label>
                  <label className="text-sm font-bold">Usuário
                    <input value={form.username} onChange={(e) => setField("username", e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="Usuário do serviço" />
                  </label>
                  <label className="text-sm font-bold md:col-span-2">Descrição
                    <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="Detalhes do serviço, observações ou informações importantes..." />
                  </label>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-black"><CalendarDays size={17} className="text-amber-600" /> Cobrança</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold">Vencimento
                    <input type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" />
                  </label>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div><p className="text-sm font-bold">Enviar mensagem automática?</p><p className="mt-1 text-xs text-slate-500">Ativa a preferência para futuros lembretes.</p></div>
                      <button type="button" onClick={() => setField("automaticMessage", !form.automaticMessage)} className={`relative h-7 w-12 rounded-full transition ${form.automaticMessage ? "bg-blue-600" : "bg-slate-300"}`}>
                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.automaticMessage ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                    <div className="mt-3 text-xs font-bold">{form.automaticMessage ? <span className="text-blue-700">SIM — lembrete habilitado</span> : <span className="text-slate-500">NÃO — sem lembrete automático</span>}</div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-black"><FileText size={17} className="text-slate-600" /> Documento</div>
                <input value={form.document} onChange={(e) => setField("document", e.target.value)} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" placeholder="CPF/CNPJ (opcional)" />
              </section>
            </div>

            {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModal(false)} className="rounded-xl border px-5 py-3 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
