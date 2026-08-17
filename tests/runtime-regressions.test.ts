import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const agent = readFileSync(new URL("../src/lib/agent.functions.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
const workflow = readFileSync(
  new URL("../src/lib/commercial-workflow.ts", import.meta.url),
  "utf8",
);

test("TALA runtime does not depend on undeployed Supabase functions", () => {
  assert.doesNotMatch(agent, /supabase\.functions\.invoke/);
  assert.match(agent, /saveOpenRouterSessionKey/);
  assert.match(agent, /process\.env\.OPENROUTER_API_KEY/);
  assert.doesNotMatch(agent, /import\.meta.*OPENROUTER_API_KEY/);
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
