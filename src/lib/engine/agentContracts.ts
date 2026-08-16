import { z } from 'zod'
import { SourceRef } from './domain'

export const AgentEnvelope=z.object({confidence:z.number().min(0).max(1),assumptions:z.array(z.string()).default([]),missingInformation:z.array(z.string()).default([]),sourceEvidence:z.array(SourceRef).default([]),humanReviewRequired:z.literal(true)})
export const DocumentIngestion=AgentEnvelope.extend({documentId:z.string(),documentType:z.string(),extractedFacts:z.array(z.object({field:z.string(),value:z.unknown(),source:SourceRef}))})
export const PlanExtraction=AgentEnvelope.extend({openings:z.array(z.object({mark:z.string().optional(),widthMm:z.number().positive().optional(),heightMm:z.number().positive().optional(),quantity:z.number().int().positive().optional(),productFamily:z.string().optional()}))})
export const TakeoffProposal=AgentEnvelope.extend({projectId:z.string(),items:z.array(z.object({productFamily:z.string(),quantity:z.number().int().positive(),widthMm:z.number().positive().optional(),heightMm:z.number().positive().optional(),notes:z.string().optional()}))})
export const QuoteDraft=AgentEnvelope.extend({projectId:z.string(),takeoffId:z.string().optional(),pricingEvidenceIds:z.array(z.string()).default([])})
export const HistoricalPriceRetrieval=AgentEnvelope.extend({evidenceIds:z.array(z.string())})
export const POComparison=AgentEnvelope.extend({quoteId:z.string(),poDocumentId:z.string(),differences:z.array(z.object({field:z.string(),quoteValue:z.unknown(),poValue:z.unknown()}))})
export const InvoiceDraft=AgentEnvelope.extend({quoteId:z.string(),poReference:z.string().optional(),billingType:z.enum(['DOWN_PAYMENT','PROGRESS','DELIVERY','FINAL'])})
export const LeadQualification=AgentEnvelope.extend({leadId:z.string(),score:z.number().min(0).max(100),nextAction:z.string()})
