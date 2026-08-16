import { z } from 'zod'

export const Currency = z.enum(['PHP','USD','EUR'])
export const EvidenceKind = z.enum(['FACT','DERIVED','AGENT_INFERENCE','HUMAN_APPROVED'])
export const SourceRef = z.object({
  documentId:z.string().min(1), sourceReference:z.string().min(1), sourceDate:z.string().optional(), page:z.number().int().positive().optional(), note:z.string().optional()
})
export const Provenance = z.object({ kind:EvidenceKind, confidence:z.number().min(0).max(1), source:SourceRef.optional(), humanReviewRequired:z.boolean().default(false) })
export const Money = z.object({ amountCentavos:z.number().int(), currency:Currency.default('PHP') })
export const Contact = z.object({ id:z.string(), name:z.string(), role:z.string().optional(), phone:z.string().optional(), email:z.string().email().optional() })
export const Customer = z.object({ id:z.string(), name:z.string(), company:z.string().optional(), billingAddress:z.string().optional(), projectAddress:z.string().optional(), contacts:z.array(Contact).default([]) })
export const LeadStatus = z.enum(['DISCOVERED','QUALIFIED','CONTACT_IDENTIFIED','CONTACTED','PLANS_REQUESTED','PLANS_RECEIVED','QUOTE_CREATED','WON','LOST'])
export const Lead = z.object({ id:z.string(), project:z.string(), location:z.string(), projectType:z.string(), projectStage:z.string().optional(), owner:z.string().optional(), developer:z.string().optional(), architect:z.string().optional(), contractor:z.string().optional(), contacts:z.array(Contact).default([]), sourceUrl:z.string().url().optional(), sourceDate:z.string().optional(), evidence:z.array(SourceRef).default([]), relevance:z.string().optional(), score:z.number().min(0).max(100), nextAction:z.string().optional(), status:LeadStatus })
export const Project = z.object({ id:z.string(), customerId:z.string().optional(), sourceLeadId:z.string().optional(), name:z.string(), location:z.string(), status:z.string() })
export const GlassSpecification = z.object({ thicknessMm:z.number().positive().optional(), treatment:z.enum(['annealed','tempered','laminated','other']).optional(), finish:z.string().optional(), color:z.string().optional() })
export const ProductSystem = z.object({ id:z.string(), family:z.string(), system:z.string().optional(), openingType:z.string().optional() })
export const Configuration = z.object({ widthMm:z.number().positive().optional(), heightMm:z.number().positive().optional(), panelCount:z.number().int().positive().optional(), bladeCount:z.number().int().positive().optional(), frameSystem:z.string().optional(), frameColor:z.string().optional(), hardware:z.array(z.string()).default([]), openingMechanism:z.string().optional(), glass:GlassSpecification.optional() })
export const Measurement = z.object({ widthMm:z.number().positive(), heightMm:z.number().positive(), quantity:z.number().int().positive(), provenance:Provenance })
export const SourceDocument = z.object({ id:z.string(), type:z.string(), filename:z.string().optional(), reference:z.string().optional(), customer:z.string().optional(), project:z.string().optional(), date:z.string().optional(), ingestionStatus:z.enum(['PENDING','EXTRACTED','REVIEWED']).default('PENDING') })
export const CommercialEvidence = z.object({ id:z.string(), customer:z.string().optional(), project:z.string().optional(), location:z.string().optional(), productFamily:z.string(), configuration:Configuration.optional(), quantity:z.number().positive().optional(), historicalUnitPrice:Money.optional(), includedServices:z.array(z.string()).default([]), source:SourceRef, provenance:Provenance })
export const QuoteLine = z.object({ id:z.string(), description:z.string(), quantity:z.number().int().positive(), unitPrice:Money.optional(), pricingStatus:z.enum(['CURRENT_APPROVED','HISTORICAL_EVIDENCE','NEEDS_PRICE_REVIEW']).default('NEEDS_PRICE_REVIEW'), evidenceIds:z.array(z.string()).default([]) })
export const Quote = z.object({ id:z.string(), projectId:z.string(), status:z.enum(['DRAFT','REVIEW','APPROVED','SENT','ACCEPTED','LOST']), lines:z.array(QuoteLine), discount:Money.optional(), crating:Money.optional(), shipping:Money.optional(), trucking:Money.optional(), delivery:Money.optional(), installation:Money.optional(), taxRateBasisPoints:z.number().int().min(0).optional(), taxTreatment:z.string().optional(), terms:z.string().optional(), provenance:z.array(Provenance).default([]) })
export const PurchaseOrder = z.object({ id:z.string(), projectId:z.string(), quoteId:z.string().optional(), customerReference:z.string(), date:z.string().optional(), source:SourceRef })
export const InvoiceLine = z.object({ id:z.string(), description:z.string(), quantity:z.number().int().positive(), unitPrice:Money })
export const Payment = z.object({ id:z.string(), invoiceId:z.string(), amount:Money, date:z.string(), reference:z.string().optional() })
export const Invoice = z.object({ id:z.string(), projectId:z.string(), quoteId:z.string(), poReference:z.string().optional(), type:z.enum(['DOWN_PAYMENT','PROGRESS','DELIVERY','FINAL']), status:z.enum(['DRAFT','REVIEW','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']).default('DRAFT'), lines:z.array(InvoiceLine), subtotal:Money, tax:Money.optional(), total:Money, payments:z.array(Payment).default([]), balance:Money, humanApproved:z.boolean().default(false) })

export type QuoteType=z.infer<typeof Quote>
export type InvoiceType=z.infer<typeof Invoice>
export type EvidenceType=z.infer<typeof CommercialEvidence>
