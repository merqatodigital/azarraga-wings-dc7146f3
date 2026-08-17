// ============================================================
// TALA DOCUMENT EXTRACT EDGE FUNCTION
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

// ============================================================
// EXTRACTION PROMPTS 
// ============================================================

const extractionRules = `You are TALA, the Azarraga Commercial Document Extractor for glass, doors, and aluminum products.

**EXTRACT EVERY FIELD WITH MAXIMUM ACCURACY:**

For ALL documents, extract:
- Document type: purchase_order | invoice | quotation | lead | supplier_quote
- Reference/Number: PO-XXXXX, INV-XXXXX, Q-XXXXX
- Date: Philippine format (MM/DD/YYYY or DD-MM-YYYY)
- Customer: name, company, address, contact person, email, phone, TIN
- Project: name, location, description
- Products/Line items: ALL visible items with their specs

For GLASS/ALUMINUM products, extract these SPECIFIC fields:
- GLASS: thickness (mm), type (tempered/annealed/laminated), color (clear/bronze/gray/blue), dimensions
- FRAME: material (aluminum/stainless/wood), finish (analok/painted/anodized)
- SYSTEM: sliding/swing/frameless/fixed/bi-fold/awning/casement
- HARDWARE: handles, hinges, locks, rollers, tracks
- DIMENSIONS: width_mm, height_mm, thickness_mm
- QUANTITY: number of units (doors, windows, panels)
- UNIT PRICE: PHP per unit (convert to centavos)
- TOTAL: PHP total (convert to centavos)

For LEADS, extract:
- Project name, location, description
- Contact: name, phone, email, company
- Requirements: glass type, door type, aluminum specs, quantity
- Budget range (if mentioned)

For QUOTES, extract:
- Quote number, date, customer, project
- ALL line items with descriptions, quantities, prices
- Payment terms, delivery terms, validity period
- Subtotal, tax, total

For INVOICES, extract:
- Invoice number, date, customer, project
- ALL line items with descriptions, quantities, prices
- Payment terms, due date
- Subtotal, tax, total, balance

Return ONLY valid JSON with this structure:
{
  "docType": "purchase_order|invoice|quotation|lead|supplier_quote|unknown",
  "reference": null,
  "docDate": null,
  "expectedDate": null,
  "customer": {
    "name": null,
    "company": null,
    "address": null,
    "contact": null,
    "email": null,
    "phone": null,
    "tin": null
  },
  "project": {
    "name": null,
    "location": null,
    "description": null
  },
  "lines": [
    {
      "lineNo": 1,
      "rawDescription": null,
      "quantity": 0,
      "unit": "pc",
      "unitPriceCentavos": 0,
      "amountCentavos": 0,
      "productFamily": null,
      "system": null,
      "glass": null,
      "glassThicknessMm": null,
      "glassType": null,
      "glassColor": null,
      "frame": null,
      "frameColor": null,
      "widthMm": null,
      "heightMm": null,
      "hardware": [],
      "confidence": 1,
      "humanReviewRequired": false
    }
  ],
  "financialSummary": {
    "subtotalCentavos": null,
    "taxCentavos": null,
    "totalCentavos": null,
    "balanceCentavos": null
  },
  "paymentTerms": null,
  "deliveryTerms": null,
  "validityPeriod": null,
  "notes": null,
  "missingInformation": [],
  "conflicts": []
}

**CRITICAL:** 
- Amounts MUST be in integer centavos (₱1,000.00 = 100000 centavos)
- If ANY field cannot be extracted, return null - NEVER invent data
- If confidence is low, set confidence < 1 and humanReviewRequired: true
- Preserve raw descriptions exactly as they appear

**DO NOT** include markdown, explanations, or text outside the JSON object.`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseExtractionText(text: string) {
  let cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();

  const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      // Continue
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Failed to parse extraction JSON');
  }
}

function normalizeExtraction(value: any) {
  if (!value || typeof value !== "object") throw new Error("missing extraction object");
  if (!Array.isArray(value.lines)) value.lines = [];
  
  value.lines = value.lines.map((line: any, index: number) => ({
    ...line,
    lineNo: Number(line.lineNo) || index + 1,
    quantity: Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0,
    unit: String(line.unit || "pc"),
    rawDescription: String(line.rawDescription || line.raw_description || line.description || ""),
    productFamily: String(line.productFamily || line.product_family || null) || null,
    system: String(line.system || null) || null,
    glass: String(line.glass || null) || null,
    glassThicknessMm: Number.isFinite(Number(line.glassThicknessMm || line.glass_thickness_mm)) 
      ? Number(line.glassThicknessMm || line.glass_thickness_mm) 
      : null,
    glassType: String(line.glassType || line.glass_type || null) || null,
    glassColor: String(line.glassColor || line.glass_color || null) || null,
    frame: String(line.frame || null) || null,
    frameColor: String(line.frameColor || line.frame_color || null) || null,
    widthMm: Number.isFinite(Number(line.widthMm || line.width_mm)) 
      ? Number(line.widthMm || line.width_mm) 
      : null,
    heightMm: Number.isFinite(Number(line.heightMm || line.height_mm)) 
      ? Number(line.heightMm || line.height_mm) 
      : null,
    hardware: Array.isArray(line.hardware) ? line.hardware : [],
    unitPriceCentavos: Number.isFinite(Number(line.unitPriceCentavos || line.unit_price_centavos)) 
      ? Number(line.unitPriceCentavos || line.unit_price_centavos) 
      : 0,
    amountCentavos: Number.isFinite(Number(line.amountCentavos || line.amount_centavos)) 
      ? Number(line.amountCentavos || line.amount_centavos) 
      : 0,
    confidence: Number.isFinite(Number(line.confidence)) ? Number(line.confidence) : 1,
    humanReviewRequired: Boolean(
      line.humanReviewRequired ||
      !String(line.rawDescription || line.raw_description || line.description || "").trim(),
    ),
  }));
  
  value.adjustments = Array.isArray(value.adjustments) ? value.adjustments : [];
  value.paymentMilestones = Array.isArray(value.paymentMilestones) ? value.paymentMilestones : [];
  value.missingInformation = Array.isArray(value.missingInformation)
    ? value.missingInformation
    : [];
  value.conflicts = Array.isArray(value.conflicts) ? value.conflicts : [];
  
  if (!value.customer) value.customer = {};
  if (!value.project) value.project = {};
  if (!value.financialSummary) value.financialSummary = {};
  
  return value;
}

// ============================================================
// MAIN EDGE FUNCTION HANDLER
// ============================================================

export default async function handler(req: Request, env: any) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { clientDocumentId, expectedType } = body;

    if (!clientDocumentId) {
      return new Response(JSON.stringify({ error: 'clientDocumentId is required' }), {
        status: 400,
        headers,
      });
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: doc, error: docError } = await supabase
      .from('client_documents')
      .select('*')
      .eq('id', clientDocumentId)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ 
        error: 'Document not found', 
        details: docError?.message 
      }), {
        status: 404,
        headers,
      });
    }

    const { data: fileData, error: fileError } = await supabase.storage
      .from(doc.bucket)
      .download(doc.storage_path);

    if (fileError || !fileData) {
      return new Response(JSON.stringify({ 
        error: 'Failed to download document', 
        details: fileError?.message 
      }), {
        status: 500,
        headers,
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${doc.mime_type || 'application/octet-stream'};base64,${base64}`;

    const openRouterKey = env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenRouter API key not configured',
        extractionStatus: 'ERROR',
        documentId: clientDocumentId,
      }), {
        status: 500,
        headers,
      });
    }

    const media = doc.mime_type?.startsWith('image/')
      ? { type: 'image_url', image_url: { url: dataUrl } }
      : { type: 'file', file: { filename: doc.title, file_data: dataUrl } };

    const models = [
      'google/gemini-2.0-flash-exp',
      'openrouter/free',
    ];

    let extractionResult = null;
    let lastError = null;

    for (const modelId of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/merqatodigital/azarraga-wings-dc7146f3',
            'X-Title': 'Azarraga Commercial Agent',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              {
                role: 'system',
                content: extractionRules,
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Extract ALL data from ${doc.title}. ${expectedType ? `Expected document type: ${expectedType}` : ''}`,
                  },
                  media,
                ],
              },
            ],
            temperature: 0,
            max_tokens: 12000,
          }),
        });

        const raw = await response.text();
        let result;
        try {
          result = JSON.parse(raw);
        } catch {
          throw new Error('OpenRouter returned non-JSON response');
        }

        if (!response.ok) {
          throw new Error(result?.error?.message || `HTTP ${response.status}`);
        }

        const content = result?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('No content in response');
        }

        extractionResult = parseExtractionText(content);
        extractionResult.extractionModel = modelId;
        extractionResult = normalizeExtraction(extractionResult);
        
        if (extractionResult.lines?.length > 0 || extractionResult.customer?.name) {
          break;
        }

      } catch (error: any) {
        lastError = error;
        continue;
      }
    }

    if (!extractionResult) {
      return new Response(JSON.stringify({
        error: 'All extraction models failed',
        details: lastError?.message || 'Unknown error',
        extractionStatus: 'FAILED',
        documentId: clientDocumentId,
      }), {
        status: 500,
        headers,
      });
    }

    const category = extractionResult.docType || 'unknown';
    await supabase
      .from('client_documents')
      .update({ category })
      .eq('id', clientDocumentId);

    const { data: sourceDoc, error: sourceError } = await supabase
      .from('source_documents')
      .insert({
        doc_type: extractionResult.docType,
        reference: extractionResult.reference,
        filename: doc.title,
        storage_bucket: doc.bucket,
        storage_path: doc.storage_path,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        customer_name: extractionResult.customer?.name,
        project_name: extractionResult.project?.name,
        location: extractionResult.project?.location,
        doc_date: extractionResult.docDate,
        expected_date: extractionResult.expectedDate,
        payment_terms_raw: extractionResult.paymentTerms,
        extracted: extractionResult,
        missing_information: extractionResult.missingInformation || [],
        conflicts: extractionResult.conflicts || [],
        human_review_required: extractionResult.lines?.some((l: any) => l.humanReviewRequired) || false,
        ingestion_status: 'EXTRACTED',
        extraction_version: 'tala-document-v2',
        learned_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sourceError) {
      return new Response(JSON.stringify({
        error: 'Failed to save extraction',
        details: sourceError.message,
        extractionStatus: 'SAVE_FAILED',
        documentId: clientDocumentId,
        extraction: extractionResult,
      }), {
        status: 500,
        headers,
      });
    }

    await supabase
      .from('client_documents')
      .update({ source_document_id: sourceDoc.id })
      .eq('id', clientDocumentId);

    return new Response(JSON.stringify({
      success: true,
      documentId: clientDocumentId,
      sourceDocumentId: sourceDoc.id,
      extractionStatus: 'COMPLETE',
      docType: extractionResult.docType,
      reference: extractionResult.reference,
      linesExtracted: extractionResult.lines?.length || 0,
      humanReviewRequired: extractionResult.lines?.some((l: any) => l.humanReviewRequired) || false,
      extraction: extractionResult,
      model: extractionResult.extractionModel,
    }), {
      status: 200,
      headers,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Document extraction failed',
      details: error?.message || 'Unknown error',
      extractionStatus: 'ERROR',
    }), {
      status: 500,
      headers,
    });
  }
}
