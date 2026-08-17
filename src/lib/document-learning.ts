import { supabase } from "@/integrations/supabase/client";
import { calculateLineAmount, normalizePurchaseOrderNumber } from "@/lib/purchase-order";
import { learnedProductFamily, statedDocumentTotalCentavos } from "@/lib/document-intelligence";

export type LearnedDocument = {
  docType: "purchase_order" | "invoice" | "quotation" | "receipt" | "supplier_quote" | "unknown";
  reference?: string;
  docDate?: string;
  expectedDate?: string;
  mrsNumber?: string;
  prNumber?: string;
  prsNumber?: string;
  paymentTerms?: string;
  paymentMilestones?: Array<{ percent?: number; trigger?: string; rawText: string }>;
  deliverySchedule?: string;
  contractType?: string;
  warranty?: string;
  serviceScope?: string;
  memo?: string;
  transactionId?: string;
  supplier?: {
    name?: string;
    address?: string;
    tin?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  buyer?: {
    name?: string;
    businessStyle?: string;
    address?: string;
    tin?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  project?: { name?: string; location?: string };
  instructions?: string;
  lines: Array<{
    lineNo: number;
    openingCode?: string;
    quantity: number;
    unit: string;
    rawDescription: string;
    productFamily?: string;
    system?: string;
    configuration?: string;
    glassThicknessMm?: number;
    glassType?: string;
    glassColor?: string;
    frameColor?: string;
    widthMm?: number;
    heightMm?: number;
    rawDimensions?: string;
    hardware?: string[];
    class?: string;
    unitPriceCentavos?: number;
    vatCentavos?: number;
    amountCentavos?: number;
    confidence?: number;
    humanReviewRequired?: boolean;
  }>;
  adjustments?: Array<{
    type: "CRATING" | "SHIPPING" | "TRUCKING" | "DELIVERY" | "INSTALLATION" | "DISCOUNT" | "OTHER";
    description: string;
    amountCentavos: number;
    rawText?: string;
  }>;
  financialSummary?: {
    subtotalCentavos?: number;
    amountWithoutTaxCentavos?: number;
    vatCentavos?: number;
    totalCentavos?: number;
  };
  totalCentavos?: number;
  missingInformation?: string[];
  conflicts?: string[];
  extractionModel?: string;
};
const fail = (label: string, e: any): never => {
  throw new Error(`${label}: ${e?.message || String(e)}`);
};

/** Save a human-reviewed extraction and turn it into queryable TALA memory. The original file remains authoritative provenance. */
export async function learnCommercialDocument(
  clientDocumentId: string,
  learned: LearnedDocument,
  options: { humanReviewed?: boolean } = {},
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  if (!Array.isArray(learned.lines)) throw new Error("Document extraction has no line-item array");
  const normalizedReference = learned.reference?.trim()
    ? normalizePurchaseOrderNumber(learned.reference)
    : null;
  if (learned.docType === "purchase_order" && !normalizedReference)
    throw new Error("Purchase order reference is required before this document can be learned");
  if (learned.docType === "purchase_order")
    learned.lines.forEach((line, index) => {
      if (!line.rawDescription?.trim())
        throw new Error(`Purchase order line ${index + 1} is missing its raw description`);
      if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)
        throw new Error(`Purchase order line ${index + 1} requires a quantity greater than zero`);
    });
  const { data: cd, error: cde } = await supabase
    .from("client_documents")
    .select("*")
    .eq("id", clientDocumentId)
    .single();
  if (cde) fail("Load uploaded document", cde);
  if (!cd) throw new Error("Uploaded document was not found");
  if (cd.source_document_id && learned.lines.length === 0) {
    const [existingSourceResult, purchaseLineResult, purchasedItemResult] = await Promise.all([
      supabase
        .from("source_documents")
        .select("extracted")
        .eq("id", cd.source_document_id)
        .single(),
      supabase
        .from("purchase_order_lines")
        .select("id")
        .eq("source_document_id", cd.source_document_id)
        .limit(1),
      supabase
        .from("items_purchased")
        .select("id")
        .eq("source_document_id", cd.source_document_id)
        .limit(1),
    ]);
    const protectionError = [existingSourceResult, purchaseLineResult, purchasedItemResult].find(
      (result) => result.error,
    )?.error;
    if (protectionError) fail("Protect existing learned products", protectionError);
    const existingSource = existingSourceResult.data;
    const existingLines = Array.isArray((existingSource?.extracted as any)?.lines)
      ? (existingSource?.extracted as any).lines
      : [];
    const savedProductCount = Math.max(
      existingLines.length,
      purchaseLineResult.data?.length || 0,
      purchasedItemResult.data?.length || 0,
    );
    if (savedProductCount) {
      throw new Error(`TALA returned no products. Previously saved product lines were preserved.`);
    }
  }
  const reviewRequired = Boolean(
    learned.missingInformation?.length ||
    learned.conflicts?.length ||
    learned.lines.some((line) => line.humanReviewRequired),
  );
  const header = {
    doc_type: learned.docType,
    reference: normalizedReference,
    document_number: normalizedReference,
    filename: cd.title,
    storage_bucket: cd.bucket,
    storage_path: cd.storage_path,
    mime_type: cd.mime_type,
    file_size: cd.file_size,
    customer_name: learned.buyer?.name || null,
    project_name: learned.project?.name || null,
    location: learned.project?.location || null,
    doc_date: learned.docDate || null,
    expected_date: learned.expectedDate || null,
    mrs_number: learned.mrsNumber || learned.prsNumber || null,
    payment_terms_raw: learned.paymentTerms || null,
    memo: learned.memo || null,
    transaction_id: learned.transactionId || null,
    supplier_name: learned.supplier?.name || null,
    supplier_address: learned.supplier?.address || null,
    supplier_contact_person: learned.supplier?.contactPerson || null,
    supplier_phone: learned.supplier?.phone || null,
    buyer_name: learned.buyer?.name || null,
    buyer_address: learned.buyer?.address || null,
    buyer_tin: learned.buyer?.tin || null,
    instructions: learned.instructions || null,
    ingestion_status: options.humanReviewed
      ? "REVIEWED"
      : reviewRequired
        ? "NEEDS_REVIEW"
        : "LEARNED",
    extracted: learned,
    missing_information: learned.missingInformation || [],
    conflicts: learned.conflicts || [],
    human_review_required: options.humanReviewed ? false : reviewRequired,
    extraction_version: "tala-document-v1",
    learned_at: new Date().toISOString(),
    created_by: user.id,
  };
  let source: any;
  let priorExtractionReset = false;
  const resetPriorExtraction = async (sourceDocumentId: string) => {
    if (!cd.source_document_id || priorExtractionReset) return;
    const cleanup = await Promise.all([
      supabase.from("commercial_evidence").delete().eq("source_document_id", sourceDocumentId),
      supabase.from("items_purchased").delete().eq("source_document_id", sourceDocumentId),
      supabase.from("purchase_order_lines").delete().eq("source_document_id", sourceDocumentId),
      supabase
        .from("document_financial_adjustments")
        .delete()
        .eq("source_document_id", sourceDocumentId),
    ]);
    const cleanupError = cleanup.find((result) => result.error)?.error;
    if (cleanupError) fail("Reset prior extraction for reprocessing", cleanupError);
    priorExtractionReset = true;
  };
  if (cd.source_document_id) {
    const { data, error } = await supabase
      .from("source_documents")
      .update(header)
      .eq("id", cd.source_document_id)
      .select("*")
      .single();
    if (error) fail("Update source document", error);
    source = data;
  } else {
    const { data, error } = await supabase
      .from("source_documents")
      .insert(header)
      .select("*")
      .single();
    if (error) fail("Create source document", error);
    source = data;
    const { error: linkError } = await supabase
      .from("client_documents")
      .update({ source_document_id: source.id })
      .eq("id", clientDocumentId);
    if (linkError) fail("Link source document", linkError);
  }
  // Keep uncertain OCR visible beside the private original, but do not teach TALA or
  // mutate canonical customer, project, PO, invoice or pricing records until an owner
  // explicitly reviews and saves the extraction.
  if (!options.humanReviewed && reviewRequired) {
    return {
      sourceDocument: source,
      customer: null,
      project: null,
      purchaseOrder: null,
      learnedLines: learned.lines.length,
      pendingReview: true,
    };
  }
  let customer: any = null;
  if (learned.buyer?.name) {
    const { data: found } = await supabase
      .from("customers")
      .select("*")
      .ilike("name", learned.buyer.name)
      .limit(1)
      .maybeSingle();
    customer = found;
    if (!customer) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: learned.buyer.name,
          company: learned.buyer.businessStyle || learned.buyer.name,
          billing_address: learned.buyer.address || null,
          tin: learned.buyer.tin || null,
          email: learned.buyer.email || null,
          phone: learned.buyer.phone || null,
          source_document_id: source.id,
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) fail("Create customer", error);
      customer = data;
    } else {
      const { error } = await supabase
        .from("customers")
        .update({
          company: options.humanReviewed
            ? learned.buyer.businessStyle || learned.buyer.name
            : customer.company || learned.buyer.businessStyle || learned.buyer.name,
          billing_address: options.humanReviewed
            ? learned.buyer.address || null
            : customer.billing_address || learned.buyer.address || null,
          tin: options.humanReviewed
            ? learned.buyer.tin || null
            : customer.tin || learned.buyer.tin || null,
          email: options.humanReviewed
            ? learned.buyer.email || null
            : customer.email || learned.buyer.email || null,
          phone: options.humanReviewed
            ? learned.buyer.phone || null
            : customer.phone || learned.buyer.phone || null,
        })
        .eq("id", customer.id);
      if (error) fail("Update customer account", error);
    }
    if (customer && learned.buyer.contactPerson?.trim()) {
      const { data: existingContact, error: contactFindError } = await supabase
        .from("contacts")
        .select("id")
        .eq("customer_id", customer.id)
        .ilike("name", learned.buyer.contactPerson.trim())
        .limit(1)
        .maybeSingle();
      if (contactFindError) fail("Find customer contact", contactFindError);
      if (existingContact && options.humanReviewed) {
        const { error } = await supabase
          .from("contacts")
          .update({
            email: learned.buyer.email || null,
            phone: learned.buyer.phone || null,
          })
          .eq("id", existingContact.id);
        if (error) fail("Update customer contact", error);
      } else if (!existingContact) {
        const { error } = await supabase.from("contacts").insert({
          customer_id: customer.id,
          name: learned.buyer.contactPerson.trim(),
          email: learned.buyer.email || null,
          phone: learned.buyer.phone || null,
          role: "Document contact",
          notes: `Learned from ${normalizedReference || cd.title}`,
          created_by: user.id,
        });
        if (error) fail("Create customer contact", error);
      }
    }
  }
  let project: any = null;
  if (learned.project?.name) {
    const { data: found } = await supabase
      .from("projects")
      .select("*")
      .eq("customer_id", customer?.id || "00000000-0000-0000-0000-000000000000")
      .ilike("name", learned.project.name)
      .limit(1)
      .maybeSingle();
    project = found;
    if (!project) {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          customer_id: customer?.id || null,
          name: learned.project.name,
          location: learned.project.location || null,
          status: "ACTIVE",
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) fail("Create project", error);
      project = data;
    } else if (options.humanReviewed) {
      const { data, error } = await supabase
        .from("projects")
        .update({ location: learned.project.location || null })
        .eq("id", project.id)
        .select("*")
        .single();
      if (error) fail("Update project", error);
      project = data;
    }
  }
  const { error: sourceRelationshipError } = await supabase
    .from("source_documents")
    .update({ customer_id: customer?.id || null, project_id: project?.id || null })
    .eq("id", source.id);
  if (sourceRelationshipError) fail("Link source document relationships", sourceRelationshipError);
  const { error: clientRelationshipError } = await supabase
    .from("client_documents")
    .update({ customer_id: customer?.id || null, project_id: project?.id || null })
    .eq("id", clientDocumentId);
  if (clientRelationshipError)
    fail("Link uploaded document relationships", clientRelationshipError);
  let po: any = null;
  if (learned.docType === "purchase_order" && normalizedReference) {
    for (const [index, adjustment] of (learned.adjustments || []).entries()) {
      const amount = Number(adjustment.amountCentavos);
      if (!Number.isInteger(amount) || amount < 0)
        throw new Error(`Purchase order adjustment ${index + 1} has an invalid amount`);
    }
    const { data: linkedOrders, error: linkedOrderError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("source_document_id", source.id)
      .limit(2);
    if (linkedOrderError) fail("Find source purchase order", linkedOrderError);
    if ((linkedOrders || []).length > 1)
      throw new Error("This source document is linked to duplicate purchase orders");
    const { data: matches, error: findError } = await supabase
      .from("purchase_orders")
      .select("*")
      .ilike("po_number", normalizedReference)
      .limit(2);
    if (findError) fail("Find purchase order", findError);
    if ((matches || []).length > 1)
      throw new Error(`Duplicate purchase orders already exist for ${normalizedReference}`);
    const linkedOrder = linkedOrders?.[0] || null;
    const numberMatch = matches?.[0] || null;
    if (linkedOrder && numberMatch && linkedOrder.id !== numberMatch.id)
      throw new Error(
        `Purchase order ${normalizedReference} is already linked to a different source document`,
      );
    po = linkedOrder || numberMatch;
    if (po && po.source_document_id && po.source_document_id !== source.id)
      throw new Error(
        `Purchase order ${normalizedReference} is already linked to a different source document`,
      );
    const normalizedLines = learned.lines.map((line, index) => {
      const quantity = Number(line.quantity);
      const unitPrice = line.unitPriceCentavos == null ? 0 : Number(line.unitPriceCentavos);
      const amount =
        line.amountCentavos == null
          ? calculateLineAmount(quantity, unitPrice)
          : Number(line.amountCentavos);
      if (!Number.isInteger(unitPrice) || unitPrice < 0)
        throw new Error(`Purchase order line ${index + 1} has an invalid unit price`);
      if (!Number.isInteger(amount) || amount < 0)
        throw new Error(`Purchase order line ${index + 1} has an invalid line amount`);
      return { line, quantity, unitPrice, amount };
    });
    const lineSubtotalCentavos = normalizedLines.reduce((sum, row) => sum + row.amount, 0);
    const adjustmentTotalCentavos = (learned.adjustments || []).reduce(
      (sum, adjustment) =>
        sum +
        (adjustment.type === "DISCOUNT"
          ? -Math.abs(Number(adjustment.amountCentavos || 0))
          : Number(adjustment.amountCentavos || 0)),
      0,
    );
    const calculatedTotalCentavos = Math.max(0, lineSubtotalCentavos + adjustmentTotalCentavos);
    const statedTotal = statedDocumentTotalCentavos(learned);
    const documentTotalCentavos =
      statedTotal == null ? calculatedTotalCentavos : Number(statedTotal);
    const totalMatched = documentTotalCentavos === calculatedTotalCentavos;
    const comparison = {
      source: "DOCUMENT_INGESTION",
      mrsNumber: learned.mrsNumber,
      prNumber: learned.prNumber,
      prsNumber: learned.prsNumber,
      expectedDate: learned.expectedDate,
      deliverySchedule: learned.deliverySchedule,
      contractType: learned.contractType,
      warranty: learned.warranty,
      serviceScope: learned.serviceScope,
      paymentMilestones: learned.paymentMilestones || [],
      financialSummary: learned.financialSummary || null,
      memo: learned.memo,
      transactionId: learned.transactionId,
      lineSubtotalCentavos,
      adjustmentTotalCentavos,
      calculatedTotalCentavos,
      documentTotalCentavos,
      totalMatched,
      humanReviewRequired: !totalMatched || source.human_review_required,
    };
    await resetPriorExtraction(source.id);
    if (!totalMatched) {
      const conflict = `Document total ${documentTotalCentavos} does not match calculated PO total ${calculatedTotalCentavos}`;
      const conflicts = Array.from(new Set([...(learned.conflicts || []), conflict]));
      const { error: reviewError } = await supabase
        .from("source_documents")
        .update({ conflicts, human_review_required: true })
        .eq("id", source.id);
      if (reviewError) fail("Flag PO total conflict", reviewError);
      source = { ...source, conflicts, human_review_required: true };
    }
    if (!po) {
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: normalizedReference,
          customer_id: customer?.id || null,
          project_id: project?.id || null,
          po_date: learned.docDate || null,
          currency: "PHP",
          total_centavos: documentTotalCentavos,
          terms: learned.paymentTerms || null,
          status: "RECEIVED",
          comparison,
          source_document_id: source.id,
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) fail("Create purchase order", error);
      po = data;
    } else {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({
          po_number: normalizedReference,
          source_document_id: source.id,
          customer_id: po.customer_id || customer?.id || null,
          project_id: po.project_id || project?.id || null,
          po_date: learned.docDate || po.po_date || null,
          terms: learned.paymentTerms || po.terms || null,
          total_centavos: documentTotalCentavos,
          currency: po.currency || "PHP",
          status: "RECEIVED",
          comparison,
        })
        .eq("id", po.id)
        .select("*")
        .single();
      if (error) fail("Link purchase order source", error);
      po = data;
    }
    if (po) {
      const rows = normalizedLines.map(({ line: l, quantity, unitPrice, amount }) => ({
        purchase_order_id: po.id,
        line_no: l.lineNo,
        description: l.rawDescription,
        raw_description: l.rawDescription,
        opening_code: l.openingCode || null,
        product_family: l.productFamily || null,
        system: l.system || null,
        configuration: l.configuration || null,
        glass_thickness_mm: l.glassThicknessMm || null,
        glass_type: l.glassType || null,
        glass_color: l.glassColor || null,
        frame_color: l.frameColor || null,
        width_mm: l.widthMm || null,
        height_mm: l.heightMm || null,
        raw_dimensions: l.rawDimensions || null,
        hardware: l.hardware || [],
        class: l.class || null,
        quantity,
        unit: l.unit || "set",
        unit_price_centavos: unitPrice,
        vat_centavos: l.vatCentavos || 0,
        amount_centavos: amount,
        source_document_id: source.id,
        confidence: l.confidence ?? 1,
        human_review_required: l.humanReviewRequired ?? false,
      }));
      if (rows.length) {
        const { error } = await supabase.from("purchase_order_lines").insert(rows);
        if (error) fail("Create PO line memory", error);
      }
      const items = normalizedLines.map(({ line: l, quantity, unitPrice }) => ({
        customer_id: customer?.id || null,
        project_id: project?.id || null,
        purchase_order_id: po.id,
        product_family: learnedProductFamily(l),
        system: l.system || null,
        description: l.rawDescription,
        glass:
          [l.glassThicknessMm ? `${l.glassThicknessMm}mm` : null, l.glassType, l.glassColor]
            .filter(Boolean)
            .join(" ") || null,
        frame_color: l.frameColor || null,
        width_mm: l.widthMm || null,
        height_mm: l.heightMm || null,
        quantity,
        unit_price_centavos: unitPrice,
        currency: "PHP",
        purchased_on: learned.docDate || null,
        source_reference: learned.reference,
        source_document_id: source.id,
        created_by: user.id,
      }));
      if (items.length) {
        const { error } = await supabase.from("items_purchased").insert(items);
        if (error) fail("Create purchased-item memory", error);
      }
      const evidence = normalizedLines.map(({ line: l, quantity, unitPrice, amount }) => ({
        customer_name: learned.buyer?.name || null,
        project_name: learned.project?.name || null,
        location: learned.project?.location || null,
        product_family: learnedProductFamily(l),
        system: l.system || null,
        configuration: {
          openingCode: l.openingCode,
          configuration: l.configuration,
          hardware: l.hardware,
          rawDescription: l.rawDescription,
          rawDimensions: l.rawDimensions,
          class: l.class,
          vatCentavos: l.vatCentavos,
        },
        glass: { thicknessMm: l.glassThicknessMm, type: l.glassType, color: l.glassColor },
        frame_color: l.frameColor || null,
        width_mm: l.widthMm || null,
        height_mm: l.heightMm || null,
        quantity,
        historical_unit_price_centavos: unitPrice,
        historical_line_amount_centavos: amount,
        currency: "PHP",
        included_services: [],
        pricing_type: "HISTORICAL_EVIDENCE",
        source_reference: learned.reference!,
        source_date: learned.docDate || null,
        source_document_id: source.id,
        evidence_kind: "FACT",
        confidence: l.confidence ?? 1,
        human_review_required: l.humanReviewRequired ?? false,
        raw: l,
        created_by: user.id,
      }));
      if (evidence.length) {
        const { error } = await supabase.from("commercial_evidence").insert(evidence);
        if (error) fail("Create commercial evidence", error);
      }
      const adjustments = (learned.adjustments || []).map((a, n) => ({
        source_document_id: source.id,
        purchase_order_id: po.id,
        line_no: n + 1,
        adjustment_type: a.type,
        description: a.description,
        amount_centavos: a.amountCentavos,
        currency: "PHP",
        raw_text: a.rawText || null,
        created_by: user.id,
      }));
      if (adjustments.length) {
        const { error } = await supabase.from("document_financial_adjustments").insert(adjustments);
        if (error) fail("Create document adjustments", error);
      }
    }
  } else {
    await resetPriorExtraction(source.id);
    const sourceReference = normalizedReference || learned.reference?.trim() || cd.title;
    const evidence = learned.lines.map((line, index) => {
      const quantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0;
      const unitPrice = Number.isInteger(Number(line.unitPriceCentavos))
        ? Number(line.unitPriceCentavos)
        : 0;
      const amount = Number.isInteger(Number(line.amountCentavos))
        ? Number(line.amountCentavos)
        : calculateLineAmount(quantity, unitPrice);
      return {
        customer_name: learned.buyer?.name || null,
        project_name: learned.project?.name || null,
        location: learned.project?.location || null,
        product_family: learnedProductFamily(line),
        system: line.system || null,
        configuration: {
          openingCode: line.openingCode,
          configuration: line.configuration,
          hardware: line.hardware,
          rawDescription: line.rawDescription,
          rawDimensions: line.rawDimensions,
          class: line.class,
          vatCentavos: line.vatCentavos,
          unit: line.unit,
          documentType: learned.docType,
          lineNo: line.lineNo || index + 1,
        },
        glass: {
          thicknessMm: line.glassThicknessMm,
          type: line.glassType,
          color: line.glassColor,
        },
        frame_color: line.frameColor || null,
        width_mm: line.widthMm || null,
        height_mm: line.heightMm || null,
        quantity,
        historical_unit_price_centavos: unitPrice,
        historical_line_amount_centavos: amount,
        currency: "PHP",
        included_services: learned.serviceScope ? [learned.serviceScope] : [],
        pricing_type:
          learned.docType === "quotation" || learned.docType === "supplier_quote"
            ? "QUOTED_EVIDENCE"
            : "HISTORICAL_EVIDENCE",
        source_reference: sourceReference,
        source_date: learned.docDate || null,
        source_document_id: source.id,
        evidence_kind: "FACT",
        confidence: line.confidence ?? 1,
        human_review_required: line.humanReviewRequired ?? false,
        raw: line,
        created_by: user.id,
      };
    });
    if (evidence.length) {
      const { error } = await supabase.from("commercial_evidence").insert(evidence);
      if (error) fail("Create document item evidence", error);
    }
    if (learned.docType === "invoice" && learned.lines.length) {
      const invoiceItems = learned.lines.map((line) => {
        const quantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0;
        const unitPrice = Number.isInteger(Number(line.unitPriceCentavos))
          ? Number(line.unitPriceCentavos)
          : null;
        return {
          customer_id: customer?.id || null,
          project_id: project?.id || null,
          purchase_order_id: null,
          quote_id: null,
          product_family: learnedProductFamily(line),
          system: line.system || null,
          description: line.rawDescription || null,
          glass:
            [
              line.glassThicknessMm ? `${line.glassThicknessMm}mm` : null,
              line.glassType,
              line.glassColor,
            ]
              .filter(Boolean)
              .join(" ") || null,
          frame_color: line.frameColor || null,
          width_mm: line.widthMm || null,
          height_mm: line.heightMm || null,
          quantity,
          unit_price_centavos: unitPrice,
          currency: "PHP",
          purchased_on: learned.docDate || null,
          source_reference: sourceReference || null,
          source_document_id: source.id,
          created_by: user.id,
        };
      });
      const { error } = await supabase.from("items_purchased").insert(invoiceItems);
      if (error) fail("Create invoice item memory", error);
    }
  }
  return {
    sourceDocument: source,
    customer,
    project,
    purchaseOrder: po,
    learnedLines: learned.lines.length,
  };
}
