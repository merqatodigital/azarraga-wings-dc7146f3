import type { EvidenceType } from '../engine/domain'

const norm=(s?:string)=>String(s??'').trim().toLowerCase()
export function findCommercialEvidence(rows:EvidenceType[],q:{customer?:string;project?:string;location?:string;productFamily?:string}){
 return rows.filter(r=>(!q.customer||norm(r.customer).includes(norm(q.customer)))&&(!q.project||norm(r.project).includes(norm(q.project)))&&(!q.location||norm(r.location).includes(norm(q.location)))&&(!q.productFamily||norm(r.productFamily).includes(norm(q.productFamily))))
}
export const findHistoricalPrices=(rows:EvidenceType[],productFamily:string)=>findCommercialEvidence(rows,{productFamily}).filter(r=>r.historicalUnitPrice)
export const findCustomerHistory=(rows:EvidenceType[],customer:string)=>findCommercialEvidence(rows,{customer})
export const findProjectHistory=(rows:EvidenceType[],project:string)=>findCommercialEvidence(rows,{project})
export function findSimilarDimensions(rows:EvidenceType[],widthMm:number,toleranceMm=150){return rows.filter(r=>r.configuration?.widthMm!==undefined&&Math.abs(r.configuration.widthMm-widthMm)<=toleranceMm).sort((a,b)=>Math.abs((a.configuration?.widthMm??0)-widthMm)-Math.abs((b.configuration?.widthMm??0)-widthMm))}
export function findSimilarProducts(rows:EvidenceType[],productFamily:string){return findCommercialEvidence(rows,{productFamily})}
export function nearestEvidence(rows:EvidenceType[],q:{productFamily:string;widthMm?:number;location?:string}){
 return findSimilarProducts(rows,q.productFamily).map(r=>({evidence:r,score:(q.location&&norm(r.location)===norm(q.location)?25:0)+(q.widthMm&&r.configuration?.widthMm?Math.max(0,50-Math.abs(r.configuration.widthMm-q.widthMm)/10):0)})).sort((a,b)=>b.score-a.score)
}
