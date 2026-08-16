import type { QuoteType } from './domain'

export type POInput={customerReference:string;projectId:string;quoteId?:string;lineDescriptions:string[];totalCentavos?:number;currency?:'PHP'|'USD'|'EUR';terms?:string}
export function comparePOToQuote(po:POInput,quote:QuoteType,quoteTotalCentavos:number){
 const differences:{field:string;quoteValue:unknown;poValue:unknown;severity:'REVIEW'|'BLOCK'}[]=[]
 if(po.projectId!==quote.projectId) differences.push({field:'projectId',quoteValue:quote.projectId,poValue:po.projectId,severity:'BLOCK'})
 if(po.quoteId&&po.quoteId!==quote.id) differences.push({field:'quoteId',quoteValue:quote.id,poValue:po.quoteId,severity:'BLOCK'})
 if(po.currency&&po.currency!=='PHP') differences.push({field:'currency',quoteValue:'PHP',poValue:po.currency,severity:'REVIEW'})
 if(po.totalCentavos!==undefined&&po.currency==='PHP'&&po.totalCentavos!==quoteTotalCentavos) differences.push({field:'total',quoteValue:quoteTotalCentavos,poValue:po.totalCentavos,severity:'BLOCK'})
 if(po.terms&&quote.terms&&po.terms.trim()!==quote.terms.trim()) differences.push({field:'terms',quoteValue:quote.terms,poValue:po.terms,severity:'REVIEW'})
 return {matches:differences.length===0,canCreateProject:!differences.some(d=>d.severity==='BLOCK'),humanReviewRequired:true,differences}
}
