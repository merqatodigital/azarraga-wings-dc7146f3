import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { QuoteDraft, QuoteLineDraft } from "@/lib/commercial-workflow";

type QuoteSeed = {
  leadId?: string;
  customerName?: string;
  projectName?: string;
  location?: string;
};
type Props = {
  open: boolean;
  busy?: boolean;
  initial?: QuoteSeed | null;
  onClose: () => void;
  onSubmit: (draft: QuoteDraft) => Promise<void> | void;
};
const blank = (): QuoteLineDraft => ({
  description: "",
  quantity: 1,
  unit: "pc",
  unitPriceCentavos: 0,
  productFamily: "",
  system: "",
  glass: "",
  frame: "",
});
const php = (centavos: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

export function QuoteBuilder({ open, busy, initial, onClose, onSubmit }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("Palawan");
  const [terms, setTerms] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [lines, setLines] = useState<QuoteLineDraft[]>([blank()]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setCustomerName(initial?.customerName || "");
    setProjectName(initial?.projectName || "");
    setLocation(initial?.location || "Palawan");
    setTerms("");
    setLeadTime("");
    setLines([blank()]);
    setError("");
  }, [open, initial]);
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Math.round((Number(line.quantity) || 0) * (Number(line.unitPriceCentavos) || 0)),
        0,
      ),
    [lines],
  );
  if (!open) return null;
  const patch = (index: number, value: Partial<QuoteLineDraft>) =>
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...value } : line)),
    );
  const submit = async () => {
    setError("");
    if (!customerName.trim() || !projectName.trim())
      return setError("Customer and project are required.");
    if (
      !lines.length ||
      lines.some(
        (line) =>
          !line.description.trim() ||
          Number(line.quantity) <= 0 ||
          Number(line.unitPriceCentavos) < 0,
      )
    )
      return setError("Every product needs a description, quantity and valid price.");
    await onSubmit({
      leadId: initial?.leadId,
      customerName: customerName.trim(),
      projectName: projectName.trim(),
      location: location.trim() || "Palawan",
      terms: terms.trim() || undefined,
      leadTime: leadTime.trim() || undefined,
      lines,
    });
  };
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-[#f6f8fb] shadow-2xl">
        <header className="flex items-center justify-between border-b bg-white p-5 sm:p-6">
          <div>
            <small className="font-bold tracking-[.16em] text-[#3972ae]">
              AZARRAGA GLASS & ALUMINUM
            </small>
            <h2 className="text-2xl font-bold text-[#14263d]">
              {initial?.leadId ? "Quote this lead" : "New quotation"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg border p-2" aria-label="Close quote">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 p-5 sm:p-6">
          <section className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer / company" value={customerName} onChange={setCustomerName} />
            <Field label="Project" value={projectName} onChange={setProjectName} />
            <Field label="Location" value={location} onChange={setLocation} />
            <Field
              label="Lead time"
              value={leadTime}
              onChange={setLeadTime}
              placeholder="e.g. 30 working days"
            />
            <Field
              label="Terms"
              value={terms}
              onChange={setTerms}
              placeholder="e.g. 50% down payment"
            />
          </section>
          <section className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <b>Products and scope</b>
                <small className="block text-slate-500">
                  Every ordered or quoted product stays attached to this quotation.
                </small>
              </div>
              <button
                onClick={() => setLines((current) => [...current, blank()])}
                className="action"
              >
                <Plus size={15} /> Add product
              </button>
            </div>
            <div className="space-y-3 p-4">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <Field
                      label={`Raw description / scope ${index + 1}`}
                      value={line.description}
                      onChange={(value: string) => patch(index, { description: value })}
                      placeholder="900 Series sliding door"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Field
                      label="Product family"
                      value={line.productFamily || ""}
                      onChange={(value: string) => patch(index, { productFamily: value })}
                      placeholder="Doors"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Field
                      label="System"
                      value={line.system || ""}
                      onChange={(value: string) => patch(index, { system: value })}
                      placeholder="900 Series"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Field
                      label="Glass"
                      value={line.glass || ""}
                      onChange={(value: string) => patch(index, { glass: value })}
                      placeholder="6mm clear"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Field
                      label="Frame / finish"
                      value={line.frame || ""}
                      onChange={(value: string) => patch(index, { frame: value })}
                      placeholder="Analok"
                    />
                  </div>
                  <Num
                    label="Width mm"
                    value={line.widthMm || 0}
                    onChange={(value: number) => patch(index, { widthMm: value || undefined })}
                  />
                  <Num
                    label="Height mm"
                    value={line.heightMm || 0}
                    onChange={(value: number) => patch(index, { heightMm: value || undefined })}
                  />
                  <Num
                    label="Quantity"
                    value={line.quantity}
                    onChange={(value: number) => patch(index, { quantity: value })}
                  />
                  <div className="lg:col-span-2">
                    <Field
                      label="Unit"
                      value={line.unit}
                      onChange={(value: string) => patch(index, { unit: value })}
                    />
                  </div>
                  <label className="lg:col-span-3">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      Unit price PHP
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(line.unitPriceCentavos || 0) / 100}
                      onChange={(event) =>
                        patch(index, {
                          unitPriceCentavos: Math.round(Number(event.target.value || 0) * 100),
                        })
                      }
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex items-end justify-end pb-2 font-bold lg:col-span-3">
                    {php(Math.round(line.quantity * line.unitPriceCentavos))}
                  </div>
                  <button
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
                    }
                    className="action justify-center text-red-700 disabled:opacity-30 lg:col-span-2"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0b2543] p-5 text-white">
            <div>
              <small className="text-[#9db1c7]">QUOTE SUBTOTAL</small>
              <strong className="block text-2xl">{php(total)}</strong>
              <small className="text-[#9db1c7]">
                Tax is explicitly selected during approval; products and prices remain unchanged.
              </small>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={submit}
                className="rounded-lg bg-white px-5 py-2 text-sm font-bold text-[#0b2543] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Create quotation"}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}
function Num({ label, value, onChange }: any) {
  return (
    <label className="block lg:col-span-2">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="number"
        min="0"
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}
