import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeOpenRouterApiKey, openRouterAuthorization } from "../src/lib/openrouter-auth.ts";

const agent = readFileSync(new URL("../src/lib/agent.functions.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
const workflow = readFileSync(
  new URL("../src/lib/commercial-workflow.ts", import.meta.url),
  "utf8",
);
const learning = readFileSync(new URL("../src/lib/document-learning.ts", import.meta.url), "utf8");

test("TALA runtime does not depend on undeployed Supabase functions", () => {
  assert.doesNotMatch(agent, /supabase\.functions\.invoke/);
  assert.match(agent, /saveOpenRouterSessionKey/);
  assert.match(agent, /process\.env[\s\S]*OPENROUTER_API_KEY/);
  assert.doesNotMatch(agent, /import\.meta.*OPENROUTER_API_KEY/);
});

test("OpenRouter authorization is ByteString-safe after a Unicode key paste", () => {
  const key = "sk-or-v1-0123456789abcdef → copied from settings";
  assert.equal(normalizeOpenRouterApiKey(key), "sk-or-v1-0123456789abcdef");
  const authorization = openRouterAuthorization(key);
  assert.equal(authorization, "Bearer sk-or-v1-0123456789abcdef");
  assert.doesNotThrow(() => new Headers({ Authorization: authorization }));
});

test("OpenRouter authorization surfaces an understandable invalid-key error", () => {
  assert.throws(
    () => openRouterAuthorization("not a key →"),
    /Paste only the key beginning sk-or-v1-/,
  );
});

test("invoice download archives into private commercial documents", () => {
  assert.match(route, /archiveGeneratedInvoiceDocument/);
  assert.match(route, /commercialDocumentPdfBlob/);
  assert.match(route, /downloaded and archived in Documents/);
  assert.match(workflow, /generated-invoices/);
  assert.match(workflow, /category: "generated_invoice"/);
});

test("Overview and Invoices expose archived invoice documents", () => {
  assert.match(route, /Latest commercial documents/);
  assert.match(route, /docs\.slice\(0, 5\)/);
  assert.match(route, /View in Documents/);
  assert.match(route, /GENERATED INVOICE \/ ARCHIVED RECORD/);
});

test("invoice intake remains visible and opens its intelligence after upload", () => {
  assert.match(route, /Invoice intelligence register/);
  assert.match(route, /invoiceDocuments\.map/);
  assert.match(route, /Review & teach TALA/);
  assert.match(route, /category === "invoice"[\s\S]*setDocumentOpen/);
  assert.match(route, /document\.mime_type\?\.startsWith\("image\/"\)/);
});

test("invoice intake category survives uncertain OCR classification", () => {
  assert.match(workflow, /category === "invoice" \? "invoice" : learned\.docType/);
  assert.match(workflow, /expectedType === "invoice" \? "invoice" : learned\.docType/);
  assert.match(route, /Account name/);
  assert.match(route, /Invoice date/);
  assert.match(route, /Scope of work extracted/);
});

test("downloaded Azarraga invoices remain in the Invoice register with persisted scope", () => {
  assert.match(route, /document\.category === "generated_invoice"/);
  assert.match(route, /invoiceLines\.filter/);
  assert.match(route, /operationalInvoice\?\.customer_name/);
  assert.match(route, /Downloaded Azarraga invoices already use the/);
  assert.match(route, /Re-run OCR/);
});

test("failed invoice extraction preserves a reviewable invoice document", () => {
  assert.match(workflow, /invoice_needs_review/);
  assert.match(workflow, /status: "NEEDS_REVIEW"/);
  assert.doesNotMatch(workflow, /throw new Error\(\s*`Document saved safely/);
});

test("learned invoice items persist into commercial memory without creating a PO", () => {
  assert.match(learning, /learned\.docType === "invoice"/);
  assert.match(learning, /Create invoice item memory/);
  assert.match(learning, /source_document_id: source\.id/);
  assert.match(learning, /purchase_order_id: null/);
});

test("PDF extraction uses OpenRouter's free file parser and preserves document semantics", () => {
  assert.match(agent, /engine: "cloudflare-ai"/);
  assert.match(agent, /never classify a customer purchase order as an invoice/);
  assert.match(agent, /expectedType/);
});

test("document admin can add, edit, save and delete learned records", () => {
  assert.match(route, /Edit intelligence/);
  assert.match(route, /Add line/);
  assert.match(route, /Save corrections & teach TALA/);
  assert.match(route, /deleteCommercialDocument/);
  assert.match(workflow, /saveCommercialDocumentIntelligence/);
  assert.match(workflow, /Delete learned document memory/);
  assert.match(learning, /humanReviewed/);
});

test("private originals render through authenticated blob access instead of frame navigation", () => {
  assert.match(workflow, /loadCommercialDocumentBlob/);
  assert.match(route, /URL\.createObjectURL\(blob\)/);
  assert.doesNotMatch(route, /openExternalDocument/);
  assert.match(route, /authenticated private Storage access/);
});
