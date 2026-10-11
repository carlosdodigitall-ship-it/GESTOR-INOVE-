"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  X,
  Loader2,
  CalendarDays,
  FileText,
  CreditCard,
  CircleDollarSign,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Phone,
  QrCode,
  Check,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};

type ChargeItem = {
  id: string;
  organization_id: string;
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string; // 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method: string | null;
  paid_at: string | null;
  pix_code: string | null;
  billing_cycle: string | null;
  whatsapp_message_sent: boolean;
  whatsapp_sent_at: string | null;
  created_at: string;
  customers?: CustomerOption | CustomerOption[] | null;
};

const emptyForm = {
  customerId: "",
  description: "",
  amount: "",
  dueDate: "",
  paymentMethod: "pix",
  pixCode: "",
  billingCycle: "mensal",
};

function normalizeRelation(value: CustomerOption | CustomerOption[] | null | undefined): CustomerOption | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateBR(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return value;
}

export default function CobrancasPage() {
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [sendingChargeId, setSendingChargeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    const supabase = createClient();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão não encontrada. Faça login novamente.");
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

      const [chargesRes, customersRes] = await Promise.all([
        supabase
          .from("charges")
          .select("id,organization_id,customer_id,description,amount,due_date,status,payment_method,paid_at,pix_code,billing_cycle,whatsapp_message_sent,whatsapp_sent_at,created_at,customers(id,name,phone)")
          .eq("organization_id", member.organization_id)
          .order("due_date", { ascending: false }),
        supabase
          .from("customers")
          .select("id,name,phone")
          .eq("organization_id", member.organization_id)
          .order("name", { ascending: true }),
      ]);

      if (chargesRes.error) {
        setError(chargesRes.error.message);
      } else {
        const mapped = ((chargesRes.data || []) as unknown as ChargeItem[]).map((c) => ({
          ...c,
          customers: normalizeRelation(c.customers),
        }));
        setCharges(mapped);
      }

      if (customersRes.error) {
        setError(customersRes.error.message);
      } else {
        setCustomers(customersRes.data || []);
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateCharge(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return setError("Organização não identificada.");
    if (!form.customerId) return setError("Selecione um cliente.");
    if (!form.amount || Number(form.amount) <= 0) return setError("Informe um valor válido.");
    if (!form.dueDate) return setError("Informe a data de vencimento.");

    setSaving(true);
    setError("");
    const supabase = createClient();

    try {
      const payload = {
        organization_id: orgId,
        customer_id: form.customerId,
        description: form.description.trim() || "Fatura / Cobrança",
        amount: Number(form.amount),
        due_date: form.dueDate,
        status: "pending",
        payment_method: form.paymentMethod,
        pix_code: form.pixCode.trim() || null,
        billing_cycle: form.billingCycle,
        whatsapp_message_sent: false,
      };

      const { data, error: insertError } = await supabase
        .from("charges")
        .insert(payload)
        .select("id,organization_id,customer_id,description,amount,due_date,status,payment_method,paid_at,pix_code,billing_cycle,whatsapp_message_sent,whatsapp_sent_at,created_at,customers(id,name,phone)")
        .single();

      if (insertError) throw insertError;

      if (data) {
        const item: ChargeItem = {
          ...data,
          customers: normalizeRelation(data.customers as any),
        };
        setCharges((prev) => [item, ...prev]);
        setSuccessNotice("Cobrança cadastrada com sucesso!");
        setForm(emptyForm);
        setModalOpen(false);
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível criar a cobrança.");
    } finally {
      setSaving(false);
    }
  }

  async function sendWhatsAppCharge(chargeId: string) {
    setSendingChargeId(chargeId);
    setError("");
    setSuccessNotice("");

    try {
      const res = await fetch("/api/cobrancas/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || "Falha ao enviar cobrança pelo WhatsApp.");
      } else {
        setSuccessNotice(data.message || "Cobrança enviada via WhatsApp com sucesso!");
        setCharges((prev) =>
          prev.map((c) =>
            c.id === chargeId
              ? { ...c, whatsapp_message_sent: true, whatsapp_sent_at: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (e: any) {
      setError(e?.message || "Erro de conexão ao enviar WhatsApp.");
    } finally {
      setSendingChargeId(null);
    }
  }

  async function triggerAutomation() {
    if (!confirm("Deseja disparar as cobranças automáticas para todos os clientes com faturas vencendo hoje ou em atraso?")) {
      return;
    }

    setRunningAutomation(true);
    setError("");
    setSuccessNotice("");

    try {
      const res = await fetch("/api/cobrancas/automacao", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || "Falha ao executar disparo automático.");
      } else {
        setSuccessNotice(data.message || "Disparo de cobranças automáticas finalizado!");
        await loadData();
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao conectar com a automação.");
    } finally {
      setRunningAutomation(false);
    }
  }

  async function toggleStatus(charge: ChargeItem) {
    const supabase = createClient();
    const newStatus = charge.status === "paid" ? "pending" : "paid";
    const paidAt = newStatus === "paid" ? new Date().toISOString() : null;

    try {
      const { error: updError } = await supabase
        .from("charges")
        .update({ status: newStatus, paid_at: paidAt })
        .eq("id", charge.id);

      if (updError) throw updError;

      setCharges((prev) =>
        prev.map((c) => (c.id === charge.id ? { ...c, status: newStatus, paid_at: paidAt } : c))
      );
      setSuccessNotice(`Cobrança marcada como ${newStatus === "paid" ? "PAGA" : "PENDENTE"}!`);
    } catch (e: any) {
      setError(e?.message || "Erro ao atualizar status da cobrança.");
    }
  }

  async function deleteCharge(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta cobrança?")) return;
    const supabase = createClient();
    try {
      const { error: delError } = await supabase.from("charges").delete().eq("id", id);
      if (delError) throw delError;
      setCharges((prev) => prev.filter((c) => c.id !== id));
      setSuccessNotice("Cobrança excluída com sucesso.");
    } catch (e: any) {
      setError(e?.message || "Erro ao excluir cobrança.");
    }
  }

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const stats = useMemo(() => {
    let pendingVal = 0;
    let pendingCount = 0;
    let overdueVal = 0;
    let overdueCount = 0;
    let paidVal = 0;
    let paidCount = 0;

    charges.forEach((c) => {
      const amt = Number(c.amount || 0);
      if (c.status === "paid") {
        paidVal += amt;
        paidCount++;
      } else if (c.due_date < todayStr || c.status === "overdue") {
        overdueVal += amt;
        overdueCount++;
      } else {
        pendingVal += amt;
        pendingCount++;
      }
    });

    return {
      pendingVal,
      pendingCount,
      overdueVal,
      overdueCount,
      paidVal,
      paidCount,
      totalCount: charges.length,
    };
  }, [charges, todayStr]);

  const filteredCharges = useMemo(() => {
    return charges.filter((c) => {
      const isOverdue = (c.due_date < todayStr && c.status !== "paid") || c.status === "overdue";
      if (statusFilter === "pending" && (c.status !== "pending" || isOverdue)) return false;
      if (statusFilter === "overdue" && !isOverdue) return false;
      if (statusFilter === "paid" && c.status !== "paid") return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const customerName = (c.customers as CustomerOption)?.name?.toLowerCase() || "";
      const desc = c.description?.toLowerCase() || "";
      return customerName.includes(q) || desc.includes(q);
    });
  }, [charges, statusFilter, query, todayStr]);

  return (
    <DashboardShell title="Cobranças e Automação">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Gestão de Cobranças</h1>
            <p className="mt-1 text-sm text-slate-500">
              Controle de faturas, disparo de cobranças via WhatsApp Z-API e automações.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={triggerAutomation}
              disabled={runningAutomation || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition"
            >
              {runningAutomation ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} className="text-white" />
              )}
              {runningAutomation ? "Enviando Cobranças..." : "Disparar Cobranças Automáticas"}
            </button>

            <button
              onClick={() => {
                setForm(emptyForm);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-blue-800 transition"
            >
              <Plus size={16} />
              Nova Cobrança
            </button>
          </div>
        </div>

        {/* Notificações */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice("")} className="text-emerald-500 hover:text-emerald-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Indicadores / Métricas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Em Aberto</p>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Clock size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{money(stats.pendingVal)}</p>
            <p className="mt-1 text-xs text-slate-500">{stats.pendingCount} faturas pendentes</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vencidas</p>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-700">
                <AlertCircle size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-red-600">{money(stats.overdueVal)}</p>
            <p className="mt-1 text-xs text-slate-500">{stats.overdueCount} faturas em atraso</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recebidas</p>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <CircleDollarSign size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-700">{money(stats.paidVal)}</p>
            <p className="mt-1 text-xs text-slate-500">{stats.paidCount} faturas pagas</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Faturas</p>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <FileText size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{stats.totalCount}</p>
            <p className="mt-1 text-xs text-slate-500">Cadastradas no sistema</p>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Todas" },
              { id: "pending", label: "Pendentes" },
              { id: "overdue", label: "Vencidas" },
              { id: "paid", label: "Pagas" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente ou descrição..."
              className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Lista de Cobranças */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span>Carregando cobranças...</span>
            </div>
          ) : filteredCharges.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="font-bold text-slate-700">Nenhuma cobrança encontrada</p>
              <p className="mt-1 text-xs text-slate-400">
                {query ? "Tente buscar com outro termo." : "Clique em 'Nova Cobrança' para começar."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Descrição</th>
                    <th className="py-3.5 px-4">Valor</th>
                    <th className="py-3.5 px-4">Vencimento</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">WhatsApp</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCharges.map((charge) => {
                    const customer = charge.customers as CustomerOption | null;
                    const isPaid = charge.status === "paid";
                    const isOverdue = !isPaid && (charge.due_date < todayStr || charge.status === "overdue");

                    return (
                      <tr key={charge.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{customer?.name || "Sem cliente"}</div>
                          {customer?.phone && (
                            <div className="text-[11px] font-normal text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone size={11} /> {customer.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{charge.description}</td>
                        <td className="py-3.5 px-4 font-black text-slate-900">{money(charge.amount)}</td>
                        <td className="py-3.5 px-4 font-medium">{dateBR(charge.due_date)}</td>
                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              <Check size={12} /> Pago
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                              <AlertCircle size={12} /> Vencida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {charge.whatsapp_message_sent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 size={11} /> Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              Não enviado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botão Enviar WhatsApp */}
                            <button
                              onClick={() => sendWhatsAppCharge(charge.id)}
                              disabled={sendingChargeId === charge.id || !customer?.phone}
                              title={customer?.phone ? "Enviar cobrança via WhatsApp Z-API" : "Cliente sem telefone"}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                            >
                              {sendingChargeId === charge.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} />
                              )}
                              <span>WhatsApp</span>
                            </button>

                            {/* Alternar Pago/Pendente */}
                            <button
                              onClick={() => toggleStatus(charge)}
                              title={isPaid ? "Reabrir cobrança" : "Marcar como paga"}
                              className={`rounded-lg p-1.5 transition ${
                                isPaid
                                  ? "text-emerald-700 hover:bg-emerald-50"
                                  : "text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              <CheckCircle2 size={16} />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => deleteCharge(charge.id)}
                              title="Excluir cobrança"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      {/* Modal Nova Cobrança */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="text-blue-700" size={22} />
                <h3 className="text-lg font-black text-slate-900">Nova Cobrança</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCharge} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente *</label>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                >
                  <option value="">Selecione um cliente...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    placeholder="Ex: 150.00"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição da Cobrança *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Mensalidade Plano Premium"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="dinheiro">Dinheiro / Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recorrência</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="avulso">Avulso (Única vez)</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chave Pix ou Código Copia e Cola (Opcional)</label>
                <input
                  type="text"
                  value={form.pixCode}
                  onChange={(e) => setForm({ ...form, pixCode: e.target.value })}
                  placeholder="Ex: 00020126580014br.gov.bcb.pix..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-600"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Se informado, o Pix será enviado automaticamente na mensagem do WhatsApp.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-2 font-black text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Cobrança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
