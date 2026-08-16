import type { QuoteType } from './domain'
import { calculateQuote } from './quoteEngine'
import { comparePOToQuote, type POInput } from './poComparison'

export function createProjectFromWonQuote(input:{quote:QuoteType;po:POInput;projectName:string;location:string}){
 const calc=calculateQuote(input.quote)
 if(input.quote.status!=='APPROVED'&&input.quote.status!=='ACCEPTED') throw new Error('Quote must be approved before project creation')
 if(calc.status!=='READY_FOR_HUMAN_REVIEW') throw new Error('Quote must have reviewed pricing and tax treatment')
 const comparison=comparePOToQuote(input.po,input.quote,calc.total.amountCentavos)
 if(!comparison.canCreateProject) return {created:false,humanReviewRequired:true,comparison}
 return {created:true,humanReviewRequired:true,comparison,project:{id:input.quote.projectId,name:input.projectName,location:input.location,status:'PO_RECEIVED',quoteId:input.quote.id,customerPO:input.po.customerReference,commercialTotal:calc.total}}
}
export const BILLING_STAGES=['DOWN_PAYMENT','PROGRESS','DELIVERY','FINAL'] as const
export function nextBillingStage(completed:string[]){return BILLING_STAGES.find(s=>!completed.includes(s))??null}
