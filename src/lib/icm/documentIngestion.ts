import { z } from 'zod'
import { SourceDocument, SourceRef, Provenance } from '../engine/domain'

export const ExtractedFact=z.object({
 field:z.string().min(1),
 value:z.unknown(),
 provenance:Provenance,
 source:SourceRef
})
export const IngestionRecord=z.object({
 document:SourceDocument,
 customerId:z.string().optional(),
 projectId:z.string().optional(),
 facts:z.array(ExtractedFact).default([]),
 missingInformation:z.array(z.string()).default([]),
 conflicts:z.array(z.object({field:z.string(),values:z.array(z.unknown()),message:z.string()})).default([]),
 humanReviewRequired:z.boolean().default(true)
})
export type IngestionRecordType=z.infer<typeof IngestionRecord>

export function createPendingIngestion(input:z.input<typeof SourceDocument>):IngestionRecordType{
 return IngestionRecord.parse({document:{...input,ingestionStatus:'PENDING'},facts:[],missingInformation:[],conflicts:[],humanReviewRequired:true})
}
export function addExtractedFact(record:IngestionRecordType,fact:z.input<typeof ExtractedFact>){
 const parsed=ExtractedFact.parse(fact)
 if(parsed.source.documentId!==record.document.id) throw new Error('Fact source must match ingested document')
 return IngestionRecord.parse({...record,document:{...record.document,ingestionStatus:'EXTRACTED'},facts:[...record.facts,parsed],humanReviewRequired:true})
}
export function markIngestionReviewed(record:IngestionRecordType){
 if(record.conflicts.length||record.missingInformation.length) throw new Error('Resolve missing information and conflicts before review completion')
 return IngestionRecord.parse({...record,document:{...record.document,ingestionStatus:'REVIEWED'},humanReviewRequired:false})
}
