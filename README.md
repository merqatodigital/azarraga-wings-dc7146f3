# Azarraga Data Connect

Connect this existing Azarraga Glass & Aluminum application to Supabase.

DO NOT redesign the UI.

DO NOT rewrite the existing ICM, lead, quote, PO, invoice, or deterministic pricing logic.

DO NOT create demo data.

First inspect the entire existing codebase and all existing Supabase migrations.

Then:

1. Connect/create the Supabase project.

2. Run/fix the existing migrations already in /supabase/migrations.

3. Make Supabase the persistent database for the existing:

   - customers

   - contacts

   - leads

   - projects

   - quotes + quote lines

   - purchase orders + line items

   - invoices + invoice lines

   - payments

   - client documents

   - items purchased

   - commercial memory / ICM

   - source evidence/provenance

4. Create/configure Supabase Storage for customer POs, plans, photos, quotations, invoices and payment documents.

5. Add proper RLS and owner/admin authentication.

6. Replace any temporary/in-memory persistence with Supabase, but preserve the existing business engines.

7. Connect every existing frontend page and button to the real Supabase data.

8. Quotes and invoices must save permanently and be downloadable/printable as professional PDFs.

9. Preserve PHP as the authoritative/default currency and the existing PHP/USD/EUR display toggle.

10. Connect the existing OpenRouter agent settings securely server-side. Never expose API keys in the browser.

11. The agent can extract documents, assist with takeoffs, search ICM and draft commercial data. The deterministic engine calculates money. A human approves quotes and invoices.

12. Do not fabricate historical records or prices. Preserve source-document provenance.

Test the actual workflow end-to-end:

quote request → lead → documents → customer/project → quote → approval → PO → invoice → payment → commercial memory.

Fix failures yourself.

Do the implementation now. Do not give me a plan.

When finished, report only:

- migrations applied

- database/storage connected

- workflows tested

- anything genuinely blocking completion

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c79e3c6a-b15b-49f6-9cb6-7131e2250700).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
