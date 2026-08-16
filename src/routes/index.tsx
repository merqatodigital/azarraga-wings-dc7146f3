import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  ReceiptText,
  Bot,
  Plus,
  MapPin,
  Search,
  Building2,
  ChevronRight,
  Sparkles,
  Send,
  X,
  FileSearch,
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  Printer,
  Upload,
  LogOut,
  Eye,
  Download,
  ExternalLink,
  RotateCw,
  ShieldCheck,
  Mail,
  CircleDollarSign,
} from "lucide-react";
import { listAgentModels, askAgent } from "@/lib/agent.functions";
import { TALA_QUICK_ACTIONS, type TalaIntent } from "@/lib/agent-quick-actions";
import { supabase } from "@/integrations/supabase/client";
import {
  createLeadWorkflow,
  createQuoteWorkflow,
  approveQuoteWorkflow,
  createPOWorkflow,
  createInvoiceWorkflow,
  recordPaymentWorkflow,
  uploadCommercialDocument,
  createCommercialDocumentSignedUrl,
  downloadCommercialDocument,
  reprocessCommercialDocument,
  markCommercialDocumentReviewed,
  type QuoteDraft,
} from "@/lib/commercial-workflow";
import { QuoteBuilder } from "@/components/commercial/QuoteBuilder";
import { printCommercialDocument } from "@/lib/commercial-documents";

export const Route = createFileRoute("/")({ component: Home });
const nav = [
  ["Overview", LayoutDashboard],
  ["Leads", Users],
  ["Quotes", FileText],
  ["Invoices", ReceiptText],
  ["Documents", FileSearch],
] as const;
const peso = (c: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format((c || 0) / 100);

function openExternalDocument(url: string) {
  const link = window.document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
}

function Home() {
  const [session, setSession] = useState<any>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: s } = supabase.auth.onAuthStateChange((_e, v) => setSession(v));
    return () => s.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <Splash />;
  if (!session) return <Login />;
  return <WorkspaceApp />;
}
function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#071a30] text-white">
      <div className="text-center">
        <b className="text-2xl">Azarraga Glass</b>
        <p className="mt-2 text-sm text-slate-400">Connecting commercial workspace…</p>
      </div>
    </div>
  );
}
function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const login = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };
  const github = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-[#071a30] p-5">
      <form onSubmit={login} className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
        <small className="font-bold tracking-[.16em] text-[#3972ae]">COMMERCIAL WORKSPACE</small>
        <h1 className="mt-1 text-3xl font-bold text-[#14263d]">Azarraga Glass</h1>
        <p className="mb-6 mt-2 text-sm text-slate-500">
          Sign in to access customers, quotations, invoices, documents and the Azarraga Agent.
        </p>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <div className="mt-3">
          <Field label="Password" value={password} onChange={setPassword} type="password" />
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-[#0F4C81] px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={github}
          className="mt-2 w-full rounded-lg border px-4 py-3 font-semibold text-[#14263d]"
        >
          Sign in with GitHub
        </button>
      </form>
    </div>
  );
}

function WorkspaceApp() {
  const [tab, setTab] = useState("Overview"),
    [agentOpen, setAgentOpen] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [quoteOpen, setQuoteOpen] = useState(false),
    [modal, setModal] = useState<any>(null),
    [documentOpen, setDocumentOpen] = useState<any>(null),
    [poOpen, setPoOpen] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]),
    [quotes, setQuotes] = useState<any[]>([]),
    [invoices, setInvoices] = useState<any[]>([]),
    [pos, setPos] = useState<any[]>([]),
    [docs, setDocs] = useState<any[]>([]),
    [sources, setSources] = useState<any[]>([]);
  const load = async () => {
    const [l, q, i, p, d, s] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(50),
      supabase
        .from("purchase_orders")
        .select("*,purchase_order_lines(*)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("client_documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("source_documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setLeads(l.data || []);
    setQuotes(q.data || []);
    setInvoices(i.data || []);
    setPos(p.data || []);
    setDocs(d.data || []);
    setSources(s.data || []);
    const e = l.error || q.error || i.error || p.error || d.error || s.error;
    if (e) setNotice(`Refresh failed: ${e.message}`);
  };
  useEffect(() => {
    load();
  }, []);
  const run = async (fn: () => Promise<any>, ok: string, after?: () => void) => {
    setBusy(true);
    setNotice("");
    try {
      await fn();
      setNotice(ok);
      await load();
      after?.();
    } catch (e: any) {
      setNotice(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };
  const uploadAndLearn = async (file: File) => {
    setBusy(true);
    setNotice(`Saving ${file.name} and teaching TALA…`);
    try {
      const result: any = await uploadCommercialDocument(file, "other");
      const learning = result?.learning;
      const review = learning?.humanReviewRequired
        ? " Human review required for uncertain fields."
        : "";
      setNotice(
        `TALA learned ${learning?.lines ?? 0} line items from ${learning?.documentType ?? "document"}${learning?.reference ? ` ${learning.reference}` : ""}.${review}`,
      );
      await load();
    } catch (e: any) {
      setNotice(e?.message || "Document upload or learning failed");
    } finally {
      setBusy(false);
    }
  };
  const submitQuote = async (d: QuoteDraft) =>
    run(
      () => createQuoteWorkflow(d),
      "Quotation saved with line items",
      () => {
        setQuoteOpen(false);
        setTab("Quotes");
      },
    );
  const approve = async (q: any) =>
    run(async () => {
      if (q.tax_treatment == null) {
        const { error } = await supabase
          .from("quotes")
          .update({ tax_treatment: "NONE", tax_rate_basis_points: 0 })
          .eq("id", q.id);
        if (error) throw error;
      }
      return approveQuoteWorkflow(q.id);
    }, "Quotation approved");
  const printQuote = async (q: any) => {
    const { data, error } = await supabase
      .from("quote_lines")
      .select("*")
      .eq("quote_id", q.id)
      .order("line_no");
    if (error) return setNotice(error.message);
    printCommercialDocument({
      number: q.quote_number || "DRAFT",
      kind: "QUOTATION",
      customer: q.customer_name || "",
      project: q.project_name || "",
      location: q.location,
      status: q.status,
      currency: q.currency,
      terms: q.terms,
      leadTime: q.lead_time,
      subtotalCentavos: q.subtotal_centavos || 0,
      taxCentavos: q.tax_centavos || 0,
      totalCentavos: q.total_centavos || 0,
      lines: data || [],
    });
  };
  const printInvoice = async (i: any) => {
    const { data, error } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", i.id)
      .order("line_no");
    if (error) return setNotice(error.message);
    printCommercialDocument({
      number: i.invoice_number || "DRAFT",
      kind: "INVOICE",
      customer: i.customer_name || "",
      project: i.project_name || "",
      status: i.status,
      currency: i.currency,
      terms: i.terms,
      subtotalCentavos: i.subtotal_centavos || 0,
      taxCentavos: i.tax_centavos || 0,
      totalCentavos: i.total_centavos || 0,
      balanceCentavos: i.balance_centavos || 0,
      lines: data || [],
    });
  };
  const due = invoices.reduce((s, x) => s + Number(x.balance_centavos || 0), 0),
    pipeline = quotes.reduce((s, x) => s + Number(x.total_centavos || 0), 0);
  return (
    <div
      className={`min-h-screen bg-[#f6f8fb] text-[#14263d] lg:grid ${agentOpen ? "lg:grid-cols-[238px_minmax(0,1fr)_365px]" : "lg:grid-cols-[238px_minmax(0,1fr)]"}`}
    >
      <aside className="hidden min-h-screen flex-col bg-[#071a30] p-4 text-white lg:flex">
        <div className="border-b border-[#20344c] px-3 py-4 text-xl font-bold">Azarraga Glass</div>
        <div className="px-3 pb-2 pt-6 text-[9px] font-bold tracking-[.18em] text-[#617891]">
          COMMERCIAL WORKSPACE
        </div>
        <nav className="space-y-1">
          {nav.map(([n, I]) => (
            <button
              key={n}
              onClick={() => {
                setNotice("");
                setTab(n);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${tab === n ? "bg-[#102d50] text-white" : "text-[#9bacc0]"}`}
            >
              <I size={17} />
              {n}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-[#20344c] pt-4">
          <button onClick={() => setAgentOpen(true)} className="flex items-center gap-3 p-2">
            <Bot size={18} />
            <span className="text-left">
              <b className="block text-xs">Azarraga Agent</b>
              <small className="text-[#77d6ae]">● Connected</small>
            </span>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 flex items-center gap-2 p-2 text-xs text-slate-400"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      <section className="min-w-0 p-4 sm:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[9px] font-extrabold tracking-[.16em] text-[#3972ae]">
              AZARRAGA COMMERCIAL AGENT / {tab.toUpperCase()}
            </span>
            <h1 className="mt-1 text-3xl font-bold">{tab}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-lg border bg-white p-2">
              <RefreshCw size={17} />
            </button>
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold"
            >
              <Sparkles size={16} />
              Agent
            </button>
            <button
              disabled={busy}
              onClick={() => setQuoteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b5daf] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              New quote
            </button>
          </div>
        </header>
        {notice && (
          <div className="mb-3 flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {tab === "Overview" && (
          <>
            <div className="flex min-h-[185px] flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0b2543] to-[#0d3b69] p-8 text-white sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-bold tracking-widest text-[#83b8ed]">
                  AZARRAGA GLASS & ALUMINUM
                </span>
                <h2 className="mt-3 text-3xl font-bold">Commercial workspace</h2>
                <p className="mt-2 text-[#b8c7d8]">Find the customer. Quote the job. Get paid.</p>
              </div>
              <div className="mt-8 flex items-center gap-3 sm:mt-0">
                <MapPin />
                <div>
                  <b className="block">Palawan operations</b>
                  <span className="text-xs text-[#9db1c7]">
                    Puerto Princesa · El Nido · San Vicente / Port Barton
                  </span>
                </div>
              </div>
            </div>
            <div className="my-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Active leads"
                value={String(leads.length)}
                meta="Palawan opportunities"
              />
              <Stat
                label="Quotes in pipeline"
                value={peso(pipeline)}
                meta={`${quotes.length} quotations`}
              />
              <Stat
                label="Receivables"
                value={peso(due)}
                meta={`${invoices.length} billing records`}
              />
              <Stat label="Documents" value={String(docs.length)} meta="Commercial files" />
            </div>
            <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
              <Panel title="Needs your attention">
                {leads.slice(0, 4).map((l) => (
                  <Row
                    key={l.id}
                    icon={Building2}
                    title={l.project || "Opportunity"}
                    sub={`${l.location || "Palawan"} · ${l.next_action || "Review next action"}`}
                    end={`${l.score || 0}% fit`}
                  />
                ))}
                {!leads.length && <Empty text="No leads yet." />}
              </Panel>
              <Panel title="What are we doing?">
                <Quick
                  icon={Search}
                  title="Find new business"
                  sub="Add and qualify opportunities"
                  onClick={() => setModal({ type: "lead" })}
                />
                <Quick
                  icon={FileText}
                  title="Prepare a quotation"
                  sub="Build a real multi-line quotation"
                  onClick={() => setQuoteOpen(true)}
                />
                <Quick
                  icon={ReceiptText}
                  title="Manage billing"
                  sub="Invoices, payments and balances"
                  onClick={() => setTab("Invoices")}
                />
                <Quick
                  icon={Bot}
                  title="Ask the agent"
                  sub="Use live commercial memory"
                  onClick={() => setAgentOpen(true)}
                />
              </Panel>
            </div>
          </>
        )}
        {tab === "Leads" && (
          <Page
            title="Palawan lead pipeline"
            text="Capture opportunities and move them toward plans and quotation."
            action={
              <button onClick={() => setModal({ type: "lead" })} className="primary">
                <Plus size={16} />
                Add lead
              </button>
            }
          >
            <Table
              heads={["Opportunity", "Location", "Type", "Stage", "Next action", "Fit"]}
              rows={leads.map((l) => [
                l.project || "—",
                l.location || "—",
                l.project_type || "—",
                l.status || "—",
                l.next_action || "—",
                `${l.score || 0}%`,
              ])}
            />
          </Page>
        )}
        {tab === "Quotes" && (
          <Page
            title="Quotation workspace"
            text="Create, approve, print, receive PO and invoice from one commercial record."
            action={
              <button onClick={() => setQuoteOpen(true)} className="primary">
                <Plus size={16} />
                New quote
              </button>
            }
          >
            <div className="space-y-3">
              {quotes.map((q) => {
                const receivedPo = pos.find((p) => p.quote_id === q.id);
                return (
                  <div
                    key={q.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"
                  >
                    <div className="min-w-[190px] flex-1">
                      <b>{q.quote_number || "Draft"}</b>
                      <small className="block text-slate-500">
                        {q.customer_name} · {q.project_name}
                      </small>
                    </div>
                    <strong>{peso(q.total_centavos)}</strong>
                    <Badge>{q.status}</Badge>
                    <button onClick={() => printQuote(q)} className="action">
                      <Printer size={15} />
                      Print
                    </button>
                    {q.status !== "APPROVED" ? (
                      <button disabled={busy} onClick={() => approve(q)} className="action">
                        <CheckCircle2 size={15} />
                        Approve
                      </button>
                    ) : (
                      <>
                        <button
                          disabled={busy || Boolean(receivedPo)}
                          onClick={() => setModal({ type: "po", q })}
                          className="action"
                        >
                          <ShoppingCart size={15} />
                          {receivedPo ? "PO received" : "Receive PO"}
                        </button>
                        {receivedPo && (
                          <button
                            onClick={() =>
                              setPoOpen({
                                ...receivedPo,
                                customer_name: q.customer_name,
                                project_name: q.project_name,
                                quote_number: q.quote_number,
                              })
                            }
                            className="action"
                          >
                            <Eye size={15} />
                            View PO
                          </button>
                        )}
                        <button
                          disabled={busy || invoices.some((i) => i.quote_id === q.id)}
                          onClick={() =>
                            run(
                              () =>
                                createInvoiceWorkflow(
                                  q.id,
                                  pos.find((p) => p.quote_id === q.id)?.id,
                                ),
                              "Invoice drafted",
                              () => setTab("Invoices"),
                            )
                          }
                          className="primary"
                        >
                          Draft invoice
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {!quotes.length && <Empty text="No quotations yet." />}
            </div>
          </Page>
        )}
        {tab === "Invoices" && (
          <Page
            title="Invoices & payments"
            text="Print invoices, record collections and track the remaining balance."
          >
            <div className="space-y-3">
              {invoices.map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"
                >
                  <div className="min-w-[190px] flex-1">
                    <b>{i.invoice_number || "Draft"}</b>
                    <small className="block text-slate-500">
                      {i.customer_name} · {i.project_name}
                    </small>
                  </div>
                  <div>
                    <small className="block text-slate-500">Balance</small>
                    <strong>{peso(i.balance_centavos)}</strong>
                  </div>
                  <Badge>{i.status}</Badge>
                  <button onClick={() => printInvoice(i)} className="action">
                    <Printer size={15} />
                    Print
                  </button>
                  <button
                    disabled={busy || Number(i.balance_centavos) <= 0}
                    onClick={() => setModal({ type: "payment", i })}
                    className="primary"
                  >
                    Record payment
                  </button>
                </div>
              ))}
              {!invoices.length && <Empty text="No invoices yet." />}
            </div>
          </Page>
        )}
        {tab === "Documents" && (
          <Page
            title="TALA document learning"
            text="Upload a PO, then compare the preserved original against every extracted line, dimension, price and scope item."
            action={
              <label
                className={`primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}
              >
                <Upload size={16} />
                {busy ? "Learning…" : "Upload & Learn"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={busy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (f) await uploadAndLearn(f);
                  }}
                />
              </label>
            }
          >
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-[#24496d]">
              <b>The original remains private and authoritative.</b>
              <span className="ml-1">
                Each row opens a review workspace showing the source beside TALA's extraction.
                Missing or uncertain information is never hidden.
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">File</th>
                    <th className="px-5 py-3">Intelligence</th>
                    <th className="px-5 py-3">Original</th>
                    <th className="px-5 py-3">Uploaded</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => {
                    const source = sources.find((s) => s.id === d.source_document_id);
                    return (
                      <DocumentRow
                        key={d.id}
                        document={d}
                        source={source}
                        busy={busy}
                        open={() => setDocumentOpen({ document: d, source })}
                        run={run}
                      />
                    );
                  })}
                </tbody>
              </table>
              {!docs.length && <Empty text="No commercial documents uploaded yet." />}
            </div>
          </Page>
        )}
      </section>
      {agentOpen && <Agent onClose={() => setAgentOpen(false)} />}
      <QuoteBuilder
        open={quoteOpen}
        busy={busy}
        onClose={() => setQuoteOpen(false)}
        onSubmit={submitQuote}
      />
      {modal && <ActionModal state={modal} close={() => setModal(null)} run={run} />}{" "}
      {documentOpen && (
        <DocumentIntelligence
          document={documentOpen.document}
          source={
            sources.find((s) => s.id === documentOpen.document.source_document_id) ||
            documentOpen.source
          }
          busy={busy}
          close={() => setDocumentOpen(null)}
          run={run}
        />
      )}
      {poOpen && <PurchaseOrderDetail po={poOpen} close={() => setPoOpen(null)} />}
    </div>
  );
}

function ActionModal({ state, close, run }: any) {
  const [a, setA] = useState(""),
    [b, setB] = useState("Palawan"),
    [c, setC] = useState("");
  const submit = async () => {
    if (state.type === "lead")
      return run(
        () => createLeadWorkflow({ project: a, location: b, projectType: c || "Commercial" }),
        "Lead created",
        close,
      );
    if (state.type === "po")
      return run(() => createPOWorkflow(state.q.id, a), "PO received", close);
    if (state.type === "payment")
      return run(
        () =>
          recordPaymentWorkflow(state.i.id, Math.round(Number(a) * 100), b || "Bank transfer", c),
        "Payment recorded",
        close,
      );
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex justify-between">
          <h3 className="text-xl font-bold">
            {state.type === "lead"
              ? "Add opportunity"
              : state.type === "po"
                ? "Receive purchase order"
                : "Record payment"}
          </h3>
          <button onClick={close}>
            <X />
          </button>
        </div>
        {state.type === "lead" ? (
          <>
            <Field label="Project / opportunity" value={a} onChange={setA} />
            <Field label="Location" value={b} onChange={setB} />
            <Field label="Project type" value={c} onChange={setC} />
          </>
        ) : state.type === "po" ? (
          <Field label="Client PO number" value={a} onChange={setA} />
        ) : (
          <>
            <Field label="Amount (PHP)" value={a} onChange={setA} type="number" />
            <Field label="Method" value={b} onChange={setB} />
            <Field label="Reference" value={c} onChange={setC} />
          </>
        )}
        <button onClick={submit} className="primary mt-5 w-full justify-center">
          Save
        </button>
      </div>
    </div>
  );
}
function PurchaseOrderDetail({ po, close }: any) {
  const lines = [...(po.purchase_order_lines || [])].sort(
    (a: any, b: any) => Number(a.line_no || 0) - Number(b.line_no || 0),
  );
  const copiedSubtotal = lines.reduce(
    (sum: number, line: any) => sum + Number(line.amount_centavos || 0),
    0,
  );
  const comparison = po.comparison || {};
  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-slate-950/70 p-4">
      <div className="mx-auto max-w-7xl rounded-2xl bg-[#f6f8fb] shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b bg-white p-5">
          <div>
            <small className="font-bold tracking-[.16em] text-[#3972ae]">
              PURCHASE ORDER / PERSISTED RECORD
            </small>
            <h2 className="text-2xl font-bold">{po.po_number}</h2>
            <p className="text-sm text-slate-500">
              {po.customer_name || "Customer unavailable"} ·{" "}
              {po.project_name || "Project unavailable"}
            </p>
          </div>
          <button onClick={close} className="rounded-lg border p-2">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 p-4">
          <section className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
            <Meta label="PO number" value={po.po_number} />
            <Meta label="Status" value={po.status} />
            <Meta label="Quotation" value={po.quote_number || po.quote_id} />
            <Meta label="PO date" value={po.po_date || "Not supplied"} />
            <Meta label="Currency" value={po.currency} />
            <Meta label="Terms" value={po.terms || "Not supplied"} />
            <Meta label="Customer relationship" value={po.customer_id} />
            <Meta label="Project relationship" value={po.project_id} />
            <Meta label="Source document" value={po.source_document_id || "Approved quotation"} />
            <Meta label="Persisted total" value={detailedMoney(po.total_centavos)} />
          </section>
          <section className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <b>Deterministic persistence check</b>
                <p className="text-xs text-slate-500">Saved rows reloaded from Supabase</p>
              </div>
              <Badge>
                {comparison.lineSubtotalMatched !== false && comparison.totalMatched !== false
                  ? "MATCHED"
                  : "REVIEW REQUIRED"}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Meta label="Copied line subtotal" value={detailedMoney(copiedSubtotal)} />
              <Meta
                label="Approved quote subtotal"
                value={detailedMoney(comparison.quoteSubtotalCentavos)}
              />
              <Meta label="PO total" value={detailedMoney(po.total_centavos)} />
            </div>
          </section>
          <section className="overflow-x-auto rounded-xl border bg-white">
            <div className="border-b px-5 py-4">
              <b>Persisted PO line items, dimensions, pricing and scope</b>
            </div>
            <table className="min-w-[1450px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Line",
                    "Description / scope",
                    "Product family",
                    "System",
                    "Quantity",
                    "Unit",
                    "Width mm",
                    "Height mm",
                    "Raw dimensions",
                    "Glass",
                    "Frame",
                    "Unit price",
                    "Line amount",
                  ].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any) => (
                  <tr key={line.id || line.line_no} className="border-t align-top">
                    <td className="px-3 py-3">{line.line_no}</td>
                    <td className="min-w-72 whitespace-pre-wrap px-3 py-3 font-medium">
                      {line.raw_description || line.description || "—"}
                    </td>
                    <td className="px-3 py-3">{line.product_family || "—"}</td>
                    <td className="px-3 py-3">{line.system || "—"}</td>
                    <td className="px-3 py-3">{line.quantity}</td>
                    <td className="px-3 py-3">{line.unit}</td>
                    <td className="px-3 py-3">{line.width_mm ?? "—"}</td>
                    <td className="px-3 py-3">{line.height_mm ?? "—"}</td>
                    <td className="px-3 py-3">{line.raw_dimensions || "—"}</td>
                    <td className="px-3 py-3">{line.glass_type || "—"}</td>
                    <td className="px-3 py-3">{line.frame_color || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {detailedMoney(line.unit_price_centavos)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-bold">
                      {detailedMoney(line.amount_centavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!lines.length && (
              <div className="p-5 text-sm text-red-700">No persisted PO line items were found.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
function Agent({ onClose }: any) {
  const [msg, setMsg] = useState(""),
    [messages, setMessages] = useState<any[]>([
      {
        role: "agent",
        text: "Ready. Use a quick action or ask me about live Azarraga commercial records.",
      },
    ]),
    [models, setModels] = useState<any[]>([
      { id: "openrouter/free", name: "OpenRouter Free Router", free: true },
    ]),
    [model, setModel] = useState("openrouter/free"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    listAgentModels()
      .then((r: any) => {
        if (r.models?.length) setModels(r.models);
        if (r.models?.[0]?.id) setModel(r.models[0].id);
        setError(r.error || "");
      })
      .catch((reason: any) => setError(reason?.message || "Model discovery failed"));
  }, []);
  const ask = async (text = msg, intent: TalaIntent = "general") => {
    if (!text.trim() || busy) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setMsg("");
    setBusy(true);
    setError("");
    try {
      const r: any = await askAgent({ data: { message: text, model, intent } });
      if (r.error) setError(r.error);
      setMessages((current) => [
        ...current,
        { role: "agent", text: r.reply || r.error || "TALA returned no response." },
      ]);
    } catch (e: any) {
      const detail = e?.message || "TALA request failed";
      setError(detail);
      setMessages((current) => [...current, { role: "agent", text: detail }]);
    } finally {
      setBusy(false);
    }
  };
  const quickIcons: Record<string, any> = {
    leads: Search,
    email: Mail,
    accounts: Users,
    owed: CircleDollarSign,
    documents: FileSearch,
    pricing: ReceiptText,
  };
  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[390px] flex-col border-l bg-white shadow-2xl lg:static lg:z-auto lg:min-h-screen lg:shadow-none">
      <div className="flex items-center justify-between border-b p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#eaf3fc] p-2 text-[#0b5daf]">
            <Bot />
          </div>
          <div>
            <b>Azarraga Agent</b>
            <small className="block text-green-600">● Connected to commercial memory</small>
          </div>
        </div>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="m-4 rounded-xl bg-[#f3f7fb] p-4 text-sm">
        <b>TALA</b>
        <p className="mt-1 text-slate-600">
          Ask about customers, product history, specifications, quotations, documents, invoices or
          Palawan opportunities.
        </p>
      </div>
      <div className="px-4">
        <label className="text-xs font-bold">OPENROUTER MODEL</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mt-1 w-full rounded-lg border p-2 text-sm"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {TALA_QUICK_ACTIONS.map((action) => {
          const Icon = quickIcons[action.id] || Sparkles;
          return (
            <button
              key={action.id}
              disabled={busy}
              onClick={() => ask(action.prompt, action.intent)}
              className="rounded-lg border p-3 text-left disabled:opacity-40"
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <Icon size={14} className="text-[#0b5daf]" />
                {action.label}
              </span>
              <small className="mt-1 block text-[10px] text-slate-500">{action.description}</small>
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto border-y p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 max-w-[90%] whitespace-pre-wrap rounded-xl p-3 text-xs leading-5 ${message.role === "user" ? "ml-auto bg-[#0d3158] text-white" : "bg-slate-100"}`}
          >
            {message.text}
          </div>
        ))}
        {busy && <div className="rounded-xl bg-slate-100 p-3 text-xs">TALA is working…</div>}
      </div>
      <div className="grid grid-cols-[1fr_44px] gap-2 p-3">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="Ask TALA…"
          className="min-h-20 resize-none rounded-xl border p-3 text-sm"
        />
        <button
          disabled={busy}
          onClick={() => ask()}
          className="self-end rounded-lg bg-[#0b5daf] p-3 text-white disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </div>
    </aside>
  );
}
function DocumentRow({ document, source, busy, open, run }: any) {
  const openOriginal = () => {
    run(async () => {
      const url = await createCommercialDocumentSignedUrl(document);
      openExternalDocument(url);
    }, "Original opened");
  };
  const status =
    source?.human_review_required || document.category === "needs_review"
      ? "NEEDS REVIEW"
      : source?.ingestion_status || (document.category !== "other" ? "LEARNED" : "STORED");
  return (
    <tr onClick={open} className="cursor-pointer border-t hover:bg-slate-50">
      <td className="px-5 py-4">
        <b>{document.title || "Document"}</b>
        <small className="block text-slate-500">
          {document.mime_type || "Unknown type"} ·{" "}
          {document.file_size ? `${Math.round(document.file_size / 1024)} KB` : "Size unavailable"}
        </small>
      </td>
      <td className="px-5 py-4">
        <Badge>{status}</Badge>
        {source?.reference && (
          <small className="mt-1 block text-slate-500">
            {source.doc_type} · {source.reference}
          </small>
        )}
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1 text-green-700">
          <ShieldCheck size={14} />
          Private Storage
        </span>
      </td>
      <td className="px-5 py-4">
        {document.created_at ? new Date(document.created_at).toLocaleString() : "—"}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <button onClick={openOriginal} className="action">
            <ExternalLink size={14} />
            Open
          </button>
          <button
            onClick={() => run(() => downloadCommercialDocument(document), "Download started")}
            className="action"
          >
            <Download size={14} />
            Download
          </button>
          <button onClick={open} className="action">
            <Eye size={14} />
            Intelligence
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => reprocessCommercialDocument(document), "Document reprocessed")}
            className="action"
          >
            <RotateCw size={14} />
            Reprocess
          </button>
          {source?.human_review_required && (
            <button
              disabled={busy}
              onClick={() =>
                run(() => markCommercialDocumentReviewed(source.id), "Document marked reviewed")
              }
              className="action"
            >
              <CheckCircle2 size={14} />
              Review
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const detailedMoney = (centavos: any) =>
  centavos == null
    ? "—"
    : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
        Number(centavos) / 100,
      );
function Meta({ label, value }: any) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  return (
    <div>
      <small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </small>
      <div className="mt-1 whitespace-pre-wrap text-sm">
        {Array.isArray(value) ? value.join(", ") : String(value)}
      </div>
    </div>
  );
}
function DocumentIntelligence({ document, source, busy, close, run }: any) {
  const [url, setUrl] = useState(""),
    [urlError, setUrlError] = useState(""),
    [loading, setLoading] = useState(false);
  const refreshOriginal = async () => {
    setLoading(true);
    setUrlError("");
    try {
      setUrl(await createCommercialDocumentSignedUrl(document, 120));
    } catch (error: any) {
      setUrl("");
      setUrlError(error?.message || "Could not open the private original");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refreshOriginal();
  }, [document.id]);
  const extracted = source?.extracted || {};
  const lines = Array.isArray(extracted.lines) ? extracted.lines : [];
  const adjustments = Array.isArray(extracted.adjustments) ? extracted.adjustments : [];
  const adjustment = (type: string) =>
    adjustments
      .filter((item: any) => item.type === type)
      .reduce((sum: number, item: any) => sum + Number(item.amountCentavos || 0), 0);
  const subtotal = lines.reduce(
    (sum: number, line: any) => sum + Number(line.amountCentavos || 0),
    0,
  );
  const vat = lines.reduce((sum: number, line: any) => sum + Number(line.vatCentavos || 0), 0);
  const openOriginal = () => {
    run(async () => {
      const fresh = await createCommercialDocumentSignedUrl(document, 120);
      openExternalDocument(fresh);
    }, "Original opened");
  };
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
      <div className="mx-auto max-w-[1700px] rounded-2xl bg-[#f6f8fb] shadow-2xl">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b bg-white p-5">
          <div>
            <small className="font-bold tracking-[.16em] text-[#3972ae]">
              DOCUMENT INTELLIGENCE / PO REVIEW
            </small>
            <h2 className="text-xl font-bold">{document.title || "Commercial document"}</h2>
            <p className="text-xs text-slate-500">
              Original source beside TALA extraction · private signed access refreshes on demand
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openOriginal} className="action">
              <ExternalLink size={15} />
              Open Original
            </button>
            <button
              onClick={() => run(() => downloadCommercialDocument(document), "Download started")}
              className="action"
            >
              <Download size={15} />
              Download
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(() => reprocessCommercialDocument(document), "Document reprocessed", close)
              }
              className="action"
            >
              <RotateCw size={15} />
              Reprocess
            </button>
            {source?.human_review_required && (
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () => markCommercialDocumentReviewed(source.id),
                    "Document marked reviewed",
                    close,
                  )
                }
                className="primary"
              >
                <CheckCircle2 size={15} />
                Mark Reviewed
              </button>
            )}
            <button onClick={close} className="rounded-lg border p-2">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.4fr)]">
          <section className="min-w-0 rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <b>Authoritative original</b>
              <button onClick={refreshOriginal} disabled={loading} className="action">
                <RefreshCw size={14} />
                {loading ? "Opening…" : "Refresh access"}
              </button>
            </div>
            {urlError ? (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {urlError}
                <button onClick={refreshOriginal} className="mt-3 block font-bold underline">
                  Generate a new signed URL
                </button>
              </div>
            ) : url ? (
              <iframe
                title={`Original ${document.title || "document"}`}
                src={url}
                className="h-[75vh] w-full rounded-b-xl bg-slate-100"
              />
            ) : (
              <div className="grid h-[75vh] place-items-center text-sm text-slate-400">
                Opening private original…
              </div>
            )}
          </section>
          <section className="min-w-0 space-y-4">
            {!source ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <b>No extracted intelligence is linked yet.</b>
                <p className="mt-1">
                  The original is safely stored. Select Reprocess to run TALA against this document.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Meta label="Filename" value={source.filename || document.title} />
                  <Meta label="Document type" value={source.doc_type} />
                  <Meta label="Reference / PO" value={source.reference || source.document_number} />
                  <Meta label="Document date" value={source.doc_date} />
                  <Meta label="MRS number" value={source.mrs_number} />
                  <Meta label="Payment terms" value={source.payment_terms_raw} />
                  <Meta label="Extraction status" value={source.ingestion_status} />
                  <Meta
                    label="Human review"
                    value={source.human_review_required ? "Required" : "Not required"}
                  />
                  <Meta label="Memo" value={source.memo} />
                  <Meta label="Instructions" value={source.instructions} />
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border bg-white p-5">
                    <b>Buyer / customer</b>
                    <div className="mt-3 space-y-3">
                      <Meta
                        label="Name"
                        value={source.buyer_name || source.customer_name || extracted.buyer?.name}
                      />
                      <Meta
                        label="Address"
                        value={source.buyer_address || extracted.buyer?.address}
                      />
                      <Meta label="TIN" value={source.buyer_tin || extracted.buyer?.tin} />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-5">
                    <b>Supplier</b>
                    <div className="mt-3 space-y-3">
                      <Meta label="Name" value={source.supplier_name || extracted.supplier?.name} />
                      <Meta
                        label="Address"
                        value={source.supplier_address || extracted.supplier?.address}
                      />
                      <Meta
                        label="Contact"
                        value={source.supplier_contact_person || extracted.supplier?.contactPerson}
                      />
                      <Meta
                        label="Phone"
                        value={source.supplier_phone || extracted.supplier?.phone}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-5">
                    <b>Project</b>
                    <div className="mt-3 space-y-3">
                      <Meta label="Name" value={source.project_name || extracted.project?.name} />
                      <Meta
                        label="Location"
                        value={source.location || extracted.project?.location}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-5">
                  <b>Financial and scope summary</b>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <Meta label="Product subtotal" value={detailedMoney(subtotal)} />
                    <Meta label="VAT" value={detailedMoney(vat)} />
                    <Meta label="Discount" value={detailedMoney(adjustment("DISCOUNT"))} />
                    <Meta label="Crating" value={detailedMoney(adjustment("CRATING"))} />
                    <Meta label="Shipping" value={detailedMoney(adjustment("SHIPPING"))} />
                    <Meta label="Trucking" value={detailedMoney(adjustment("TRUCKING"))} />
                    <Meta label="Delivery" value={detailedMoney(adjustment("DELIVERY"))} />
                    <Meta label="Installation" value={detailedMoney(adjustment("INSTALLATION"))} />
                    <Meta label="Document total" value={detailedMoney(extracted.totalCentavos)} />
                  </div>
                  {adjustments.length > 0 && (
                    <div className="mt-4 border-t pt-3 text-sm">
                      {adjustments.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between py-1">
                          <span>
                            {item.type}: {item.description}
                          </span>
                          <b>{detailedMoney(item.amountCentavos)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border bg-white">
                  <div className="border-b px-5 py-4">
                    <b>Every extracted line item</b>
                    <p className="text-xs text-slate-500">
                      Raw descriptions remain visible so you can compare them directly with the
                      original.
                    </p>
                  </div>
                  <table className="min-w-[2100px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        {[
                          "#",
                          "Opening",
                          "Raw description",
                          "Product family",
                          "System",
                          "Configuration",
                          "Qty",
                          "Unit",
                          "Width mm",
                          "Height mm",
                          "Raw dimensions",
                          "Glass mm",
                          "Glass type",
                          "Glass color",
                          "Frame color",
                          "Hardware",
                          "Class",
                          "Unit price",
                          "VAT",
                          "Line amount",
                          "Confidence",
                          "Review",
                        ].map((name) => (
                          <th key={name} className="px-3 py-3">
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line: any, index: number) => (
                        <tr key={`${line.lineNo || index}-${index}`} className="border-t align-top">
                          <td className="px-3 py-3">{line.lineNo || index + 1}</td>
                          <td className="px-3 py-3 font-bold">{line.openingCode || "—"}</td>
                          <td className="max-w-md whitespace-pre-wrap px-3 py-3 font-medium">
                            {line.rawDescription || "—"}
                          </td>
                          <td className="px-3 py-3">{line.productFamily || "—"}</td>
                          <td className="px-3 py-3">{line.system || "—"}</td>
                          <td className="px-3 py-3">{line.configuration || "—"}</td>
                          <td className="px-3 py-3">{line.quantity ?? "—"}</td>
                          <td className="px-3 py-3">{line.unit || "—"}</td>
                          <td className="px-3 py-3">{line.widthMm ?? "—"}</td>
                          <td className="px-3 py-3">{line.heightMm ?? "—"}</td>
                          <td className="px-3 py-3">{line.rawDimensions || "—"}</td>
                          <td className="px-3 py-3">{line.glassThicknessMm ?? "—"}</td>
                          <td className="px-3 py-3">{line.glassType || "—"}</td>
                          <td className="px-3 py-3">{line.glassColor || "—"}</td>
                          <td className="px-3 py-3">{line.frameColor || "—"}</td>
                          <td className="px-3 py-3">
                            {Array.isArray(line.hardware)
                              ? line.hardware.join(", ")
                              : line.hardware || "—"}
                          </td>
                          <td className="px-3 py-3">{line.class || "—"}</td>
                          <td className="px-3 py-3 font-semibold">
                            {detailedMoney(line.unitPriceCentavos)}
                          </td>
                          <td className="px-3 py-3">{detailedMoney(line.vatCentavos)}</td>
                          <td className="px-3 py-3 font-semibold">
                            {detailedMoney(line.amountCentavos)}
                          </td>
                          <td className="px-3 py-3">
                            {line.confidence == null
                              ? "—"
                              : `${Math.round(Number(line.confidence) * 100)}%`}
                          </td>
                          <td className="px-3 py-3">
                            {line.humanReviewRequired ? (
                              <span className="text-amber-700">Required</span>
                            ) : (
                              <span className="text-green-700">Clear</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!lines.length && (
                    <Empty text="No line items were extracted. Reprocess or review the source manually." />
                  )}
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border bg-white p-5">
                    <b>Missing information</b>
                    <div className="mt-2">
                      <Meta
                        label="Fields"
                        value={source.missing_information || extracted.missingInformation}
                      />
                    </div>
                    {!(
                      source.missing_information?.length || extracted.missingInformation?.length
                    ) && <p className="mt-2 text-sm text-slate-400">None reported</p>}
                  </div>
                  <div className="rounded-xl border bg-white p-5">
                    <b>Conflicts</b>
                    <div className="mt-2">
                      <Meta label="Conflicts" value={source.conflicts || extracted.conflicts} />
                    </div>
                    {!(source.conflicts?.length || extracted.conflicts?.length) && (
                      <p className="mt-2 text-sm text-slate-400">None reported</p>
                    )}
                  </div>
                  <div className="rounded-xl border bg-white p-5">
                    <b>Source provenance</b>
                    <div className="mt-2 space-y-3">
                      <Meta
                        label="Storage bucket"
                        value={source.storage_bucket || document.bucket}
                      />
                      <Meta
                        label="Storage path"
                        value={source.storage_path || document.storage_path}
                      />
                      <Meta
                        label="MIME / size"
                        value={`${source.mime_type || document.mime_type || "unknown"} · ${source.file_size || document.file_size || 0} bytes`}
                      />
                      <Meta label="Extraction version" value={source.extraction_version} />
                      <Meta label="Learned at" value={source.learned_at} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
function Page({ title, text, action, children }: any) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-slate-500">{text}</p>
        </div>
        {action}
      </div>
      {children}
    </>
  );
}
function Panel({ title, children }: any) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-5 py-4 font-bold">{title}</div>
      <div>{children}</div>
    </div>
  );
}
function Stat({ label, value, meta }: any) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <small className="font-semibold text-slate-500">{label}</small>
      <strong className="mt-2 block text-2xl">{value}</strong>
      <small className="text-slate-400">{meta}</small>
    </div>
  );
}
function Row({ icon: I, title, sub, end }: any) {
  return (
    <div className="flex items-center gap-3 border-b p-4 last:border-0">
      <div className="rounded-lg bg-slate-100 p-2">
        <I size={17} />
      </div>
      <div className="flex-1">
        <b className="text-sm">{title}</b>
        <small className="block text-slate-500">{sub}</small>
      </div>
      <b className="text-xs">{end}</b>
      <ChevronRight size={15} />
    </div>
  );
}
function Quick({ icon: I, title, sub, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b p-4 text-left last:border-0 hover:bg-slate-50"
    >
      <I size={17} />
      <span className="flex-1">
        <b className="block text-sm">{title}</b>
        <small className="text-slate-500">{sub}</small>
      </span>
      <ChevronRight size={15} />
    </button>
  );
}
function Table({ heads, rows }: any) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#f7f9fb] text-xs text-slate-500">
          <tr>
            {heads.map((h: string) => (
              <th key={h} className="px-5 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any[], i: number) => (
            <tr key={i} className="border-t">
              {r.map((v, j) => (
                <td key={j} className="px-5 py-4">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty text="Nothing here yet." />}
    </div>
  );
}
function Empty({ text }: any) {
  return <div className="p-8 text-center text-sm text-slate-400">{text}</div>;
}
function Badge({ children }: any) {
  return (
    <span className="rounded-full bg-[#e9f2fb] px-3 py-1 text-xs font-bold text-[#1c5f9b]">
      {children}
    </span>
  );
}
function Field({ label, value, onChange, type = "text" }: any) {
  return (
    <label className="mt-3 block text-xs font-bold text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border p-3 text-sm font-normal"
      />
    </label>
  );
}
