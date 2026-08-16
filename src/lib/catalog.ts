// Azarraga product & glass catalogue — preserved from the existing ICM catalog files.
export const PRODUCT_FAMILIES = [
  "900 Series sliding systems",
  "Pocket sliding systems",
  "Frameless swing doors",
  "Shower enclosures / shower partitions",
  "Jalousie / Jalouplus",
  "Fixed glass",
  "Awning windows",
  "Casement windows",
  "Bi-fold doors",
  "Slide-up systems",
  "Mullions",
  "Glass railings",
  "Canopies",
  "Storefront systems",
  "ACP",
  "Roll-up doors",
  "Screen doors",
  "Tabletop glass",
  "Glass shelves",
  "Aquariums",
] as const;

export const GLASS_TYPES = [
  "6mm bronze annealed",
  "10mm tempered clear",
  "10mm tempered frosted",
  "12mm tempered clear",
] as const;

export const PALAWAN_TARGET_LOCATIONS = ["Puerto Princesa", "El Nido", "San Vicente", "Port Barton"] as const;

export const LEAD_STATUSES = [
  "DISCOVERED",
  "QUALIFIED",
  "CONTACT_IDENTIFIED",
  "CONTACTED",
  "PLANS_REQUESTED",
  "PLANS_RECEIVED",
  "QUOTE_CREATED",
  "WON",
  "LOST",
] as const;

export const QUOTE_STATUSES = ["DRAFT", "REVIEW", "APPROVED", "SENT", "ACCEPTED", "LOST"] as const;
export const INVOICE_TYPES = ["DOWN_PAYMENT", "PROGRESS", "DELIVERY", "FINAL"] as const;
export const INVOICE_STATUSES = ["DRAFT", "REVIEW", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "customer_po", label: "Customer PO" },
  { value: "plan", label: "Plans / drawings" },
  { value: "photo", label: "Site photo" },
  { value: "quotation", label: "Quotation" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment document" },
  { value: "other", label: "Other" },
] as const;
