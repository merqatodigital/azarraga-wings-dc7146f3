import { z } from 'zod'
import { Currency } from './domain'

export const ExchangeRate=z.object({
 base:z.literal('PHP'), quote:z.enum(['USD','EUR']), rate:z.number().positive(), source:z.string().min(1), timestamp:z.string().min(1), humanApproved:z.boolean()
})
export function convertFromPHP(amountCentavosPHP:number,target:z.infer<typeof Currency>,rate?:z.infer<typeof ExchangeRate>){
 if(target==='PHP') return {amountCentavos:amountCentavosPHP,currency:'PHP' as const,rateUsed:1,source:'base currency'}
 if(!rate||rate.quote!==target||!rate.humanApproved) throw new Error('A matching verified/manual human-approved exchange rate is required')
 return {amountCentavos:Math.round(amountCentavosPHP*rate.rate),currency:target,rateUsed:rate.rate,source:rate.source,timestamp:rate.timestamp}
}
