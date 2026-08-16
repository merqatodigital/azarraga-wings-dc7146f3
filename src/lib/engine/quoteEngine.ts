import type { QuoteType } from './domain'

const php=(n=0)=>({amountCentavos:n,currency:'PHP' as const})
const amount=(m?:{amountCentavos:number,currency:string})=>m?.amountCentavos ?? 0

export function calculateQuote(q:QuoteType){
  if(q.lines.some(l=>!l.unitPrice || l.pricingStatus!=='CURRENT_APPROVED')){
    return {status:'NEEDS_PRICE_REVIEW' as const, humanReviewRequired:true, lineSubtotal:php(0), total:php(0)}
  }
  if(q.lines.some(l=>l.unitPrice?.currency!=='PHP')) throw new Error('V1 arithmetic base currency must be PHP')
  const lineSubtotal=q.lines.reduce((sum,l)=>sum+l.quantity*amount(l.unitPrice),0)
  const preTax=Math.max(0,lineSubtotal-amount(q.discount)+amount(q.crating)+amount(q.shipping)+amount(q.trucking)+amount(q.delivery)+amount(q.installation))
  const tax=q.taxRateBasisPoints===undefined?undefined:Math.round(preTax*q.taxRateBasisPoints/10000)
  return {
    status:q.taxTreatment===undefined?'NEEDS_TAX_REVIEW' as const:'READY_FOR_HUMAN_REVIEW' as const,
    humanReviewRequired:true,
    lineSubtotal:php(lineSubtotal), discount:php(amount(q.discount)), logistics:php(amount(q.crating)+amount(q.shipping)+amount(q.trucking)+amount(q.delivery)), installation:php(amount(q.installation)), preTax:php(preTax), tax:tax===undefined?undefined:php(tax), total:php(preTax+(tax??0))
  }
}

export function convertDisplayCurrency(amountCentavosPHP:number, display:'PHP'|'USD'|'EUR', rateFromPHP?:number){
  if(display==='PHP') return {amountCentavos:amountCentavosPHP,currency:'PHP' as const,rate:1}
  if(!rateFromPHP || rateFromPHP<=0) throw new Error('Verified or manually approved exchange rate required')
  return {amountCentavos:Math.round(amountCentavosPHP*rateFromPHP),currency:display,rate:rateFromPHP}
}
