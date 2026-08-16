export const TALA_INTENTS = [
  "leads",
  "quotes",
  "invoices",
  "icm",
  "documents",
  "customers",
  "email",
  "general",
] as const;

export type TalaIntent = (typeof TALA_INTENTS)[number];

export const TALA_QUICK_ACTIONS: Array<{
  id: string;
  label: string;
  description: string;
  intent: TalaIntent;
  prompt: string;
}> = [
  {
    id: "leads",
    label: "Leads",
    description: "Rank next actions",
    intent: "leads",
    prompt:
      "Review the live lead pipeline. Rank the best opportunities, identify the next action for each, and clearly say when contact information is missing.",
  },
  {
    id: "email",
    label: "Email follow-ups",
    description: "Draft messages",
    intent: "email",
    prompt:
      "Using only recorded leads, customers and contacts, identify who needs an email follow-up and draft a short follow-up for each. Show the recorded email address when present; say it is absent when missing. Do not claim anything was sent.",
  },
  {
    id: "accounts",
    label: "Customer accounts",
    description: "Review customer status",
    intent: "customers",
    prompt:
      "Review customer accounts. For each relevant customer, summarize recorded contacts, projects, quotations, purchase orders, invoices and current account status. Do not invent missing details.",
  },
  {
    id: "owed",
    label: "Money owed",
    description: "Prioritize collections",
    intent: "invoices",
    prompt:
      "Review live invoices and balances. Tell me exactly who owes money, the invoice number, the PHP balance, status, and the next collection action. Exclude fully paid invoices.",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Review learned files",
    intent: "documents",
    prompt:
      "Review learned source documents. List each document, reference, date, extraction status, and anything requiring human review. If no documents exist, say so.",
  },
  {
    id: "pricing",
    label: "PO & pricing",
    description: "Trace source evidence",
    intent: "icm",
    prompt:
      "Review purchase-order and historical pricing memory. Summarize products, dimensions, quantities and prices, and identify the exact source PO and date for every price mentioned.",
  },
];
