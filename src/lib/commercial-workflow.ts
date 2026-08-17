import { supabase } from "@/integrations/supabase/client";
import { extractCommercialDocument } from "@/lib/agent.functions";
import { learnCommercialDocument, type LearnedDocument } from "@/lib/document-learning";
import {
  calculateQuoteCommercialTotal,
  copyQuoteLinesToPurchaseOrder,
  normalizePurchaseOrderNumber,
  purchaseOrderComparison,
  purchaseOrderLineSubtotal,
} from "@/lib/purchase-order";

export type LeadDraft = {
  project: string;
  location: string;
  projectType: string;
  customerName?: string;
  email?: string;
  phone?: string;
  notes?: string;
};
export type QuoteLineDraft = {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCentavos: number;
  productFamily?: string;
  system?: string;
  glass?: string;
  frame?: string;
  widthMm?: number;
  heightMm?: number;
};
export type QuoteDraft = {
  leadId?: string;
  customerName: string;
  projectName: string;
  location?: string;
  terms?: string;
  leadTime?: string;
  lines: QuoteLineDraft[];
};
const fail = (label: string, error: any): never => {
  throw new Error(`${label}: ${error?.message || String(error)}`);
};

export async function createLeadWorkflow(input: LeadDraft) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  let customerId: string | null = null;
  if (input.customerName?.trim()) {
    const { data: c, error } = await supabase
      .from("customers")
      .insert({
        name: input.customerName.trim(),
        email: input.email || null,
        phone: input.phone || null,
        project_address: input.location,
        notes: input.notes || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) fail("Create customer", error);
    customerId = c.id;
  }
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      project: input.project.trim(),
      location: input.location.trim() || "Palawan",
      project_type: input.projectType || "Commercial",
      status: "DISCOVERED",
      score: 0,
      next_action: "Identify decision maker and request plans",
      customer_id: customerId,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) fail("Create lead", error);
  if (input.customerName?.trim()) {
    const { error: contactError } = await supabase.from("contacts").insert({
      name: input.customerName.trim(),
      email: input.email || null,
      phone: input.phone || null,
      lead_id: lead.id,
      customer_id: customerId,
      role: "Client",
      created_by: user.id,
    });
    if (contactError) fail("Create contact", contactError);
  }
  return lead;
}

export async function createQuoteWorkflow(input: QuoteDraft) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  if (!input.lines.length) throw new Error("Add at least one quote line");
  if (input.lines.some((l) => !l.description.trim() || l.quantity <= 0 || l.unitPriceCentavos < 0))
    throw new Error("Every line needs description, quantity and a valid price");
  let customerId: string | null = null,
    projectId: string | null = null;
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .ilike("name", input.customerName.trim())
    .limit(1)
    .maybeSingle();
  if (existing) customerId = existing.id;
  else {
    const { data: c, error } = await supabase
      .from("customers")
      .insert({
        name: input.customerName.trim(),
        project_address: input.location || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) fail("Create customer", error);
    customerId = c.id;
  }
  const { data: p, error: pe } = await supabase
    .from("projects")
    .insert({
      name: input.projectName.trim(),
      location: input.location || null,
      customer_id: customerId,
      source_lead_id: input.leadId || null,
      status: "QUOTING",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (pe) fail("Create project", pe);
  projectId = p.id;
  const { data: num, error: ne } = await supabase.rpc("next_quote_number");
  if (ne) fail("Quote number", ne);
  const subtotal = input.lines.reduce(
    (s, l) => s + Math.round(l.quantity * l.unitPriceCentavos),
    0,
  );
  const { data: q, error: qe } = await supabase
    .from("quotes")
    .insert({
      quote_number: num,
      customer_id: customerId,
      customer_name: input.customerName.trim(),
      project_id: projectId,
      project_name: input.projectName.trim(),
      lead_id: input.leadId || null,
      location: input.location || null,
      status: "REVIEW",
      currency: "PHP",
      subtotal_centavos: subtotal,
      total_centavos: subtotal,
      tax_centavos: 0,
      tax_treatment: null,
      terms: input.terms || null,
      lead_time: input.leadTime || null,
      warnings: ["Tax treatment requires human approval"],
      created_by: user.id,
    })
    .select("*")
    .single();
  if (qe) fail("Create quote", qe);
  const rows = input.lines.map((l, i) => ({
    quote_id: q.id,
    line_no: i + 1,
    description: l.description.trim(),
    quantity: l.quantity,
    unit: l.unit || "pc",
    unit_price_centavos: l.unitPriceCentavos,
    amount_centavos: Math.round(l.quantity * l.unitPriceCentavos),
    product_family: l.productFamily || null,
    system: l.system || null,
    glass: l.glass || null,
    frame: l.frame || null,
    width_mm: l.widthMm || null,
    height_mm: l.heightMm || null,
    pricing_status: "CURRENT_APPROVED",
  }));
  const { error: le } = await supabase.from("quote_lines").insert(rows);
  if (le) fail("Create quote lines", le);
  if (input.leadId)
    await supabase
      .from("leads")
      .update({
        status: "QUOTE_CREATED",
        customer_id: customerId,
        next_action: "Human review and approve quotation",
      })
      .eq("id", input.leadId);
  return q;
}

export async function approveQuoteWorkflow(quoteId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data: q, error: e } = await supabase
    .from("quotes")
    .select("*,quote_lines(*)")
    .eq("id", quoteId)
    .single();
  if (e) fail("Load quote", e);
  if (!q.quote_lines?.length) throw new Error("Cannot approve a quote with no line items");
  const subtotal = q.quote_lines.reduce(
    (s: number, l: any) => s + Number(l.amount_centavos || 0),
    0,
  );
  const extras =
    Number(q.crating_centavos || 0) +
    Number(q.shipping_centavos || 0) +
    Number(q.trucking_centavos || 0) +
    Number(q.delivery_centavos || 0) +
    Number(q.installation_centavos || 0) -
    Number(q.discount_centavos || 0);
  if (q.tax_treatment == null) throw new Error("Set tax treatment before approval");
  const tax =
    q.tax_rate_basis_points == null
      ? 0
      : Math.round(((subtotal + extras) * Number(q.tax_rate_basis_points)) / 10000);
  const total = Math.max(0, subtotal + extras + tax);
  const { error } = await supabase
    .from("quotes")
    .update({
      status: "APPROVED",
      subtotal_centavos: subtotal,
      tax_centavos: tax,
      total_centavos: total,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      warnings: [],
    })
    .eq("id", quoteId);
  if (error) fail("Approve quote", error);
  return { subtotal, total, tax };
}

export async function createPOWorkflow(quoteId: string, poNumber: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const normalizedPoNumber = normalizePurchaseOrderNumber(poNumber);
  const { data: q, error: e } = await supabase
    .from("quotes")
    .select("*,quote_lines(*)")
    .eq("id", quoteId)
    .single();
  if (e) fail("Load quote", e);
  if (!q) throw new Error("Quotation was not found");
  if (q.status !== "APPROVED") throw new Error("Quote must be approved before PO entry");
  const quoteLines = [...(q.quote_lines || [])].sort(
    (a: any, b: any) => Number(a.line_no || 0) - Number(b.line_no || 0),
  );
  const preparedLines = copyQuoteLinesToPurchaseOrder("pending", quoteLines);
  const copiedLineSubtotal = purchaseOrderLineSubtotal(preparedLines);
  const calculatedQuoteTotal = calculateQuoteCommercialTotal(q);
  const comparison = purchaseOrderComparison(
    Number(q.subtotal_centavos || 0),
    Number(q.total_centavos || 0),
    copiedLineSubtotal,
    calculatedQuoteTotal,
  );
  if (!comparison.lineSubtotalMatched || !comparison.totalMatched)
    throw new Error(
      "Approved quote totals do not match their deterministic line, tax and adjustment calculation. Review the quotation before receiving the PO.",
    );

  const { data: sameNumber, error: duplicateError } = await supabase
    .from("purchase_orders")
    .select("*")
    .ilike("po_number", normalizedPoNumber)
    .limit(2);
  if (duplicateError) fail("Check PO number", duplicateError);
  if ((sameNumber || []).some((existing: any) => existing.quote_id !== quoteId))
    throw new Error(`Client PO ${normalizedPoNumber} is already linked to another quotation`);

  const { data: quoteOrders, error: quoteOrderError } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("quote_id", quoteId)
    .limit(2);
  if (quoteOrderError) fail("Check quotation PO", quoteOrderError);
  const existingOrders = quoteOrders || [];
  if (existingOrders.length > 1)
    throw new Error("This quotation has duplicate purchase orders and requires owner review");
  const existing = existingOrders[0];
  if (existing) {
    if (existing.po_number.toLocaleLowerCase() !== normalizedPoNumber.toLocaleLowerCase())
      throw new Error(`This quotation already has client PO ${existing.po_number}`);
    const { data: existingLines, error: existingLineError } = await supabase
      .from("purchase_order_lines")
      .select("line_no,description,quantity,unit,unit_price_centavos,amount_centavos")
      .eq("purchase_order_id", existing.id)
      .order("line_no");
    if (existingLineError) fail("Verify existing PO lines", existingLineError);
    if (existingLines?.length === preparedLines.length) {
      const exact = existingLines.every((line: any, index: number) => {
        const expected = preparedLines[index]!;
        return (
          Number(line.line_no) === expected.line_no &&
          line.description === expected.description &&
          Number(line.quantity) === expected.quantity &&
          line.unit === expected.unit &&
          Number(line.unit_price_centavos) === expected.unit_price_centavos &&
          Number(line.amount_centavos) === expected.amount_centavos
        );
      });
      if (!exact)
        throw new Error(
          "Existing PO lines differ from the approved quotation; owner review required",
        );
      return existing;
    }
    if (existingLines?.length)
      throw new Error("Existing PO has an incomplete line copy; owner review required");
    const { error: repairError } = await supabase
      .from("purchase_order_lines")
      .insert(preparedLines.map((line) => ({ ...line, purchase_order_id: existing.id })) as any);
    if (repairError) fail("Repair PO lines", repairError);
    const { error: repairHeaderError } = await supabase
      .from("purchase_orders")
      .update({ status: "RECEIVED", comparison })
      .eq("id", existing.id);
    if (repairHeaderError) fail("Repair PO status", repairHeaderError);
    return existing;
  }

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      po_number: normalizedPoNumber,
      quote_id: q.id,
      project_id: q.project_id,
      customer_id: q.customer_id,
      status: "RECEIVED",
      currency: q.currency || "PHP",
      total_centavos: q.total_centavos,
      created_by: user.id,
      comparison,
    })
    .select("*")
    .single();
  if (error) fail("Create PO", error);
  if (!po) throw new Error("Purchase order was not returned after saving");
  const { error: lineError } = await supabase
    .from("purchase_order_lines")
    .insert(preparedLines.map((line) => ({ ...line, purchase_order_id: po.id })) as any);
  if (lineError) {
    await supabase
      .from("purchase_orders")
      .update({
        status: "ERROR",
        comparison: { ...comparison, persistenceError: lineError.message },
      })
      .eq("id", po.id);
    fail("Create PO lines", lineError);
  }
  return po;
}

export async function createInvoiceWorkflow(quoteId: string, poId?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data: q, error: e } = await supabase
    .from("quotes")
    .select("*,quote_lines(*)")
    .eq("id", quoteId)
    .single();
  if (e) fail("Load quote", e);
  if (q.status !== "APPROVED") throw new Error("Only approved quotes can be invoiced");
  const { data: num, error: ne } = await supabase.rpc("next_invoice_number");
  if (ne) fail("Invoice number", ne);
  const { data: i, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: num,
      quote_id: q.id,
      purchase_order_id: poId || null,
      project_id: q.project_id,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      project_name: q.project_name,
      status: "DRAFT",
      currency: "PHP",
      subtotal_centavos: q.subtotal_centavos,
      tax_centavos: q.tax_centavos,
      total_centavos: q.total_centavos,
      balance_centavos: q.total_centavos,
      terms: q.terms,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) fail("Create invoice", error);
  if (q.quote_lines?.length) {
    const { error: lineError } = await supabase.from("invoice_lines").insert(
      q.quote_lines.map((l: any, n: number) => ({
        invoice_id: i.id,
        line_no: n + 1,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_centavos: l.unit_price_centavos,
        amount_centavos: l.amount_centavos,
      })),
    );
    if (lineError) fail("Create invoice lines", lineError);
  }
  return i;
}

export async function recordPaymentWorkflow(
  invoiceId: string,
  amountCentavos: number,
  method: string,
  reference?: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  if (amountCentavos <= 0) throw new Error("Payment must be greater than zero");
  const { data: i, error: e } = await supabase
    .from("invoices")
    .select("balance_centavos")
    .eq("id", invoiceId)
    .single();
  if (e) fail("Load invoice", e);
  if (amountCentavos > Number(i.balance_centavos))
    throw new Error("Payment exceeds invoice balance");
  const { data: p, error } = await supabase
    .from("payments")
    .insert({
      invoice_id: invoiceId,
      amount_centavos: amountCentavos,
      currency: "PHP",
      method,
      reference: reference || null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) fail("Record payment", error);
  return p;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error("Could not read document"));
    r.readAsDataURL(file);
  });
}

/** One owner action: preserve original document, extract every field, normalize it, and teach TALA. */
export async function uploadCommercialDocument(
  file: File,
  category: string,
  links: {
    customerId?: string;
    projectId?: string;
    quoteId?: string;
    purchaseOrderId?: string;
    invoiceId?: string;
  } = {},
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  if (!file.type.startsWith("image/") && file.type !== "application/pdf")
    throw new Error("TALA learning currently accepts images and PDF documents");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
    path = `${user.id}/${Date.now()}-${safe}`;
  const { error: up } = await supabase.storage
    .from("commercial-documents")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (up) fail("Upload document", up);
  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      bucket: "commercial-documents",
      storage_path: path,
      title: file.name,
      category,
      mime_type: file.type || null,
      file_size: file.size,
      customer_id: links.customerId || null,
      project_id: links.projectId || null,
      quote_id: links.quoteId || null,
      purchase_order_id: links.purchaseOrderId || null,
      invoice_id: links.invoiceId || null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from("commercial-documents").remove([path]);
    fail("Save document record", error);
  }
  try {
    const dataUrl = await fileToDataUrl(file);
    const expectedType =
      category === "invoice"
        ? ("invoice" as const)
        : category === "purchase_order"
          ? ("purchase_order" as const)
          : null;
    const learned = (await extractCommercialDocument({
      data: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl,
        ...(expectedType ? { expectedType } : {}),
      },
    })) as LearnedDocument;
    const memory = await learnCommercialDocument(data.id, learned);
    const { data: updated, error: updateError } = await supabase
      .from("client_documents")
      .update({ category: learned.docType })
      .eq("id", data.id)
      .select("*")
      .single();
    if (updateError) fail("Update learned document", updateError);
    return {
      ...updated,
      learning: {
        status: "LEARNED",
        documentType: learned.docType,
        reference: learned.reference,
        lines: learned.lines?.length || 0,
        humanReviewRequired: Boolean(
          learned.missingInformation?.length ||
          learned.conflicts?.length ||
          learned.lines?.some((x) => x.humanReviewRequired),
        ),
        memory,
      },
    };
  } catch (e: any) {
    const failedCategory = category === "invoice" ? "invoice_needs_review" : "needs_review";
    const { data: updated } = await supabase
      .from("client_documents")
      .update({ category: failedCategory })
      .eq("id", data.id)
      .select("*")
      .single();
    return {
      ...(updated || data),
      learning: {
        status: "NEEDS_REVIEW",
        documentType: category,
        reference: null,
        lines: 0,
        humanReviewRequired: true,
        memory: null,
        error: `Document saved safely, but TALA learning needs review: ${e?.message || String(e)}`,
      },
    };
  }
}

export async function createCommercialDocumentSignedUrl(
  document: { bucket: string; storage_path: string },
  expiresIn = 90,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data, error } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.storage_path, expiresIn);
  if (error) fail("Open original document", error);
  if (!data?.signedUrl) throw new Error("Storage did not return a signed URL");
  return data.signedUrl;
}

export async function downloadCommercialDocument(document: {
  bucket: string;
  storage_path: string;
  title?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data, error } = await supabase.storage
    .from(document.bucket)
    .download(document.storage_path);
  if (error) fail("Download original document", error);
  const url = URL.createObjectURL(data);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.title || document.storage_path.split("/").pop() || "commercial-document";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Persist an owner-generated invoice PDF so it is visible in Documents and Overview. */
export async function archiveGeneratedInvoiceDocument(
  invoice: {
    id: string;
    customer_id?: string | null;
    project_id?: string | null;
    purchase_order_id?: string | null;
  },
  fileName: string,
  pdf: Blob,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/generated-invoices/${invoice.id}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("commercial-documents")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) fail("Archive invoice PDF", uploadError);
  const { data: existing, error: findError } = await supabase
    .from("client_documents")
    .select("*")
    .eq("invoice_id", invoice.id)
    .eq("category", "generated_invoice")
    .limit(1)
    .maybeSingle();
  if (findError) fail("Find archived invoice", findError);
  const record = {
    bucket: "commercial-documents",
    storage_path: path,
    title: fileName,
    category: "generated_invoice",
    mime_type: "application/pdf",
    file_size: pdf.size,
    customer_id: invoice.customer_id || null,
    project_id: invoice.project_id || null,
    purchase_order_id: invoice.purchase_order_id || null,
    invoice_id: invoice.id,
    created_by: user.id,
  };
  if (existing) {
    const { data, error } = await supabase
      .from("client_documents")
      .update(record)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) fail("Update archived invoice", error);
    return data;
  }
  const { data, error } = await supabase
    .from("client_documents")
    .insert(record)
    .select("*")
    .single();
  if (error) fail("Save archived invoice", error);
  return data;
}

export async function reprocessCommercialDocument(document: any) {
  const { data, error } = await supabase.storage
    .from(document.bucket)
    .download(document.storage_path);
  if (error) fail("Download document for reprocessing", error);
  const file = new File([data], document.title || "commercial-document", {
    type: document.mime_type || data.type || "application/octet-stream",
  });
  const dataUrl = await fileToDataUrl(file);
  const expectedType =
    document.category === "invoice" || document.category === "invoice_needs_review"
      ? ("invoice" as const)
      : document.category === "purchase_order"
        ? ("purchase_order" as const)
        : null;
  const learned = (await extractCommercialDocument({
    data: {
      fileName: file.name,
      mimeType: file.type,
      dataUrl,
      ...(expectedType ? { expectedType } : {}),
    },
  })) as LearnedDocument;
  const memory = await learnCommercialDocument(document.id, learned);
  const { error: updateError } = await supabase
    .from("client_documents")
    .update({ category: learned.docType })
    .eq("id", document.id);
  if (updateError) fail("Update document status", updateError);
  return { learned, memory };
}

export async function markCommercialDocumentReviewed(sourceDocumentId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { error } = await supabase
    .from("source_documents")
    .update({
      human_review_required: false,
      ingestion_status: "REVIEWED",
      notes: `Reviewed by owner ${user.id}`,
    })
    .eq("id", sourceDocumentId);
  if (error) fail("Review document intelligence", error);
}
