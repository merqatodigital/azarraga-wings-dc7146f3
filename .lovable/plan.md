# Fix the OCR → TALA document workflow

## What is actually wrong today

Verified against the live backend:

- Both TALA services (`tala-document-extract`, `tala-agent`) return **404** — they exist in the repo but were never deployed. Every upload therefore falls into the "needs review" fallback path unless the owner pastes a temporary key in the browser.
- `OPENROUTER_API_KEY` exists as a project secret, but nothing has been deployed that uses it, so its availability to the document service is still unverified.
- Current data: 4 uploaded documents, 1 extracted source document with 12 line items, and **0** purchase orders, 0 line items, 0 purchased items, 0 commercial evidence rows. So even the one document that reached "learned" never produced downstream records — that document also has no reference number, which is the field the PO write requires. The exact cause of that gap is not yet confirmed; confirming it is the first step of the work.

No UI redesign, no schema changes, no SQL migrations.

## Work

1. **Deploy the two existing services** and confirm the OpenRouter key is readable by them; wire the key through if it is not reaching the runtime.
2. **Repair the extraction service** so a real vision call succeeds:
   - fix the model-selection logic (today it can fall back to a non-existent model id and it filters models too aggressively, including preferring free-only models that cannot read documents),
   - confirm the private Storage download → base64 → vision request path works for both images and PDFs,
   - keep the existing extraction prompt, field set and JSON contract unchanged.
3. **Trace the one already-learned document** to find why 12 extracted lines produced no purchase order, purchased items or evidence rows, and fix that break in the existing save path (missing reference handling, a silently swallowed error, or a guard that exits early). Fix the cause, not the symptom, and check the sibling writes (PO lines, items purchased, commercial evidence, financial adjustments) for the same failure.
4. **Preserve the existing safety rules** already coded in the save path: a customer PO is never turned into an Azarraga invoice, uncertain extractions stay in review and are not taught, and previously saved product lines are never wiped by an empty re-extraction. Re-verify each of these still holds after the fix.
5. **Keep the review UI as-is** — extraction beside the original, "Save corrections & teach TALA" as the single approval action.
6. **Make TALA answers source-grounded** by confirming the agent service reads the taught rows and cites the source document.

## End-to-end test

Run against the real app with a signed-in owner session and a real uploaded PO/invoice image or PDF:

1. Upload → private file stored → extraction returns populated customer, supplier, project, document, financial, dimension and product-line fields.
2. Review panel shows the extraction beside the original.
3. Approve with "Save corrections & teach TALA".
4. Verify in the database: `source_documents`, customer/project, `purchase_orders` + `purchase_order_lines`, `items_purchased`, `commercial_evidence`.
5. Reload, ask TALA a question about that document, and confirm the answer cites the source document.

## Report at the end

- Products extracted from the test document
- Records written per table
- One TALA answer quoting its source document
- Anything genuinely blocking

## Technical notes

Changes are limited to `supabase/functions/tala-document-extract`, `supabase/functions/tala-agent`, their shared helper, and — only where the trace proves a defect — `src/lib/document-learning.ts` / `src/lib/commercial-workflow.ts`. Business engines, pricing, currency handling and page layouts are untouched.
