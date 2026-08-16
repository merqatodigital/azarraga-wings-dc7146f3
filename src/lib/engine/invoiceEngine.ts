import type { QuoteType,InvoiceType } from './domain'
import { calculateQuote } from './quoteEngine'

export function draftInvoiceFromApprovedQuote(q:QuoteType,opts:{invoiceId:string,type:'DOWN_PAYMENT'|'PROGRESS'|'DELIVERY'|'FINAL',poReference?:string,percentageBasisPoints?:number}):InvoiceType{
  if(q.status!=='APPROVED'&&q.status!=='ACCEPTED') throw new Error('Invoice drafting requires an approved or accepted quote')
  const calc=calculateQuote(q)
  if(calc.status!=='READY_FOR_HUMAN_REVIEW') throw new Error('Quote pricing/tax must be reviewed before billing')
  const bp=opts.percentageBasisPoints??10000
  if(bp<0||bp>10000) throw new Error('Billing percentage must be 0..10000 basis points')
  const lines=q.lines.map(l=>({id:`${opts.invoiceId}-${l.id}`,description:l.description,quantity:l.quantity,unitPrice:l.unitPrice!}))
  const total=Math.round(calc.total.amountCentavos*bp/10000)
  const subtotal=Math.round(calc.preTax.amountCentavos*bp/10000)
  const tax=calc.tax?Math.round(calc.tax.amountCentavos*bp/10000):0
  return {id:opts.invoiceId,projectId:q.projectId,quoteId:q.id,poReference:opts.poReference,type:opts.type,status:'DRAFT',lines,subtotal:{amountCentavos:subtotal,currency:'PHP'},tax:{amountCentavos:tax,currency:'PHP'},total:{amountCentavos:total,currency:'PHP'},payments:[],balance:{amountCentavos:total,currency:'PHP'},humanApproved:false}
}

export function invoiceBalance(invoice:InvoiceType){
 const paid=invoice.payments.reduce((s,p)=>s+p.amount.amountCentavos,0)
 return {amountCentavos:Math.max(0,invoice.total.amountCentavos-paid),currency:'PHP' as const}
}
