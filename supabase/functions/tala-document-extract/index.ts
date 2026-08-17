// ============================================================
// TALA DOCUMENT EXTRACT EDGE FUNCTION
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

// ============================================================
// EXTRACTION PROMPTS (same as main code)
// ============================================================

const extractionRules = `You are TALA, the Azarraga Commercial Document Extractor for glass, doors, and aluminum products.

**EXTRACT EVERY FIELD WITH MAXIMUM ACCURACY:**

For ALL documents, extract:
- Document type: purchase_order | invoice | quotation | lead | supplier_quote
- Reference/Number: PO-XXXXX, INV-XXXXX, Q-XXXXX
- Date: Philippine format
- Customer: name, company, address, contact, email, phone, TIN
- Project: name, location, description

For GLASS/ALUMIN
