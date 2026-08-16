import type { QuoteType } from './domain'
export function quoteReadiness(q:QuoteType){
 const issues:string[]=[]
 if(!q.lines.length) issues.push('At least one quote line is required')
 q.lines.forEach((l,i)=>{if(!l.description.trim())issues.push(`Line ${i+1}: description required`);if(!l.unitPrice)issues.push(`Line ${i+1}: current unit price required`);if(l.pricingStatus!=='CURRENT_APPROVED')issues.push(`Line ${i+1}: price requires human approval`)})
 if(q.taxTreatment===undefined) issues.push('Tax/VAT treatment requires explicit review')
 if(q.taxRateBasisPoints===undefined) issues.push('Tax rate requires explicit input, including zero when applicable')
 return {ready:issues.length===0,humanReviewRequired:true,issues}
}
