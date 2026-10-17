"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Loader2, Package, Boxes, DollarSign, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/dashboard-shell";

type Category = { id: string; name: string; color: string | null };
type Product = {
  id: string; organization_id: string; category_id: string | null; name: string;
  sku: string | null; description: string | null; price: number; cost: number;
  status: "active" | "inactive"; created_at: string;
  plan_categories?: Category | Category[] | null;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Faça login para acessar os produtos."); setLoading(false); return; }
    const { data: member, error: memberError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (memberError || !member) { setError(memberError?.message || "Sua organização ainda não foi criada."); setLoading(false); return; }
    setOrgId(member.organization_id);
    const [p, c] = await Promise.all([
      supabase.from("products").select("id,organization_id,category_id,name,sku,description,price,cost,status,created_at,plan_categories(id,name,color)").eq("organization_id", member.organization_id).order("created_at", { ascending: false }),
      supabase.from("plan_categories").select("id,name,color").eq("organization_id", member.organization_id).eq("status", "active").order("name")
    ]);
    if (p.error) setError(p.error.message);
    else setProducts(((p.data || []) as unknown as Array<Product>).map((row) => ({ ...row, plan_categories: Array.isArray(row.plan_categories) ? (row.plan_categories[0] || null) : row.plan_categories })));
    if (c.error) setError((old) => old || c.error.message); else setCategories(c.data || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function reset() {
    setEditing(null); setName(""); setSku(""); setDescription(""); setCategoryId("");
    setPrice(""); setCost(""); setStatus("active"); setError("");
  }
  function openNew() { reset(); setModal(true); }
  function openEdit(p: Product) {
    setEditing(p); setName(p.name); setSku(p.sku || ""); setDescription(p.description || "");
    setCategoryId(p.category_id || ""); setPrice(String(p.price)); setCost(String(p.cost));
    setStatus(p.status); setError(""); setModal(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setError("");
    if (!orgId) { setError("Organização não encontrada."); return; }
    if (!name.trim()) { setError("Informe o nome do produto."); return; }
    const parsedPrice = Number(price.replace(",", "."));
    const parsedCost = Number((cost || "0").replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || !Number.isFinite(parsedCost) || parsedCost < 0) {
      setError("Informe preço e custo válidos, iguais ou maiores que zero."); return;
    }
    setSaving(true);
    const payload = {
      organization_id: orgId, category_id: categoryId || null, name: name.trim(),
      sku: sku.trim() || null, description: description.trim() || null,
      price: parsedPrice, cost: parsedCost, status, updated_at: new Date().toISOString()
    };
    const supabase = createClient();
    const result = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id).eq("organization_id", orgId)
      : await supabase.from("products").insert(payload);
    if (result.error) setError(result.error.code === "23505" ? "Este código SKU já está cadastrado na sua empresa." : result.error.message);
    else { setModal(false); await load(); }
    setSaving(false);
  }

  async function remove(p: Product) {
    if (!confirm('Excluir o produto "' + p.name + '"?')) return;
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) setError(error.message); else await load();
  }

  const filtered = useMemo(() => products.filter((p) =>
    (p.name.toLowerCase().includes(query.toLowerCase()) || (p.sku || "").toLowerCase().includes(query.toLowerCase()) || (p.description || "").toLowerCase().includes(query.toLowerCase())) &&
    (statusFilter === "all" || p.status === statusFilter) &&
    (categoryFilter === "all" || p.category_id === categoryFilter)
  ), [products, query, statusFilter, categoryFilter]);
  const activeCount = products.filter((p) => p.status === "active").length;
  const inventoryValue = products.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const categoryOf = (p: Product) => Array.isArray(p.plan_categories) ? p.plan_categories[0] : p.plan_categories;

  return <DashboardShell title="Produtos">
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><div className="flex items-center gap-2 text-sm font-bold text-blue-600"><Package size={17}/> CATÁLOGO</div><h2 className="mt-2 text-2xl font-black text-slate-950">Produtos</h2><p className="mt-1 text-sm text-slate-500">Cadastre e gerencie produtos separadamente dos planos de assinatura.</p></div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"><Plus size={18}/> Novo produto</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total de produtos</p><Boxes className="text-blue-600" size={19}/></div><p className="mt-3 text-2xl font-black text-slate-950">{products.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ativos</p><p className="mt-3 text-2xl font-black text-emerald-600">{activeCount}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Categorias disponíveis</p><p className="mt-3 text-2xl font-black text-slate-950">{categories.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Soma dos preços</p><DollarSign className="text-blue-600" size={19}/></div><p className="mt-3 text-2xl font-black text-slate-950">{money(inventoryValue)}</p></div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row">
        <div className="flex flex-1 items-center gap-3 px-2"><Search size={18} className="text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, SKU ou descrição..." className="w-full py-2 text-sm outline-none"/></div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600"/></div> :
        filtered.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Package size={25}/></div><h3 className="mt-4 font-black text-slate-900">{products.length ? "Nenhum resultado encontrado" : "Seu catálogo está vazio"}</h3><p className="mt-1 text-sm text-slate-500">Cadastre o primeiro produto para organizar seu catálogo.</p><button onClick={openNew} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Cadastrar produto</button></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Produto</th><th className="px-5 py-4">Categoria</th><th className="px-5 py-4">Custo</th><th className="px-5 py-4">Preço</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((p) => <tr key={p.id} className="transition hover:bg-slate-50/80"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Package size={19}/></div><div><p className="font-bold text-slate-900">{p.name}</p><p className="mt-0.5 text-xs text-slate-500">{p.sku ? "SKU: " + p.sku : "Sem código SKU"}</p>{p.description && <p className="mt-1 max-w-xs truncate text-xs text-slate-400">{p.description}</p>}</div></div></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"><Tag size={12}/>{categoryOf(p)?.name || "Sem categoria"}</span></td><td className="px-5 py-4 text-slate-600">{money(Number(p.cost))}</td><td className="px-5 py-4 font-bold text-slate-900">{money(Number(p.price))}</td><td className="px-5 py-4"><span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (p.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{p.status === "active" ? "Ativo" : "Inativo"}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => openEdit(p)} title="Editar produto" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><Pencil size={16}/></button><button onClick={() => void remove(p)} title="Excluir produto" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
      </div>
    </div>

    {modal && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={save} className="mx-auto my-6 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-xl font-black text-slate-950">{editing ? "Editar produto" : "Novo produto"}</h3><p className="mt-1 text-sm text-slate-500">Os produtos são armazenados separadamente dos planos.</p></div><button type="button" onClick={() => setModal(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Nome do produto *<input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Instalação, equipamento ou serviço" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/></label>
        <label className="text-sm font-bold text-slate-700">Código SKU<input maxLength={80} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional; código único" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/></label>
        <label className="text-sm font-bold text-slate-700">Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">Sem categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-400">Usa as categorias já cadastradas no gestor.</span></label>
        <label className="text-sm font-bold text-slate-700">Preço de venda (R$) *<input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/></label>
        <label className="text-sm font-bold text-slate-700">Custo (R$)<input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/></label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Descrição<textarea rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes, características e observações do produto" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/></label>
        <label className="text-sm font-bold text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving && <Loader2 size={16} className="animate-spin"/>}{editing ? "Salvar alterações" : "Cadastrar produto"}</button></div>
    </form></div>}
  </DashboardShell>;
}
