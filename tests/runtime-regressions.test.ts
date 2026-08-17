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

test("TALA runtime does not depend on undeployed Supabase functions", () => {
  assert.doesNotMatch(agent, /supabase\.functions\.invoke/);
  assert.match(agent, /saveOpenRouterSessionKey/);
  assert.match(agent, /process\.env\.OPENROUTER_API_KEY/);
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
