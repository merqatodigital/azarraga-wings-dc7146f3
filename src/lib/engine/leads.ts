import { LeadStatus } from './domain'

export const PALAWAN_TARGET_LOCATIONS=['Puerto Princesa','El Nido','San Vicente','Port Barton'] as const
export const TARGET_PROJECT_TYPES=['resort','hotel','villa','home','renovation','restaurant','commercial building','development'] as const
export const LEAD_PIPELINE=LeadStatus.options

export function canTransitionLead(from:string,to:string){
 if(to==='LOST') return from!=='WON'
 if(from==='LOST'||from==='WON') return false
 const normal=LEAD_PIPELINE.filter(x=>x!=='WON'&&x!=='LOST')
 const a=normal.indexOf(from as any),b=normal.indexOf(to as any)
 return a>=0&&(b===a+1||to==='WON'&&from==='QUOTE_CREATED')
}
export function qualifyLead(input:{location:string;projectType:string;evidenceCount:number;decisionMakerKnown:boolean}){
 const locationFit=PALAWAN_TARGET_LOCATIONS.some(x=>x.toLowerCase()===input.location.toLowerCase())
 const typeFit=TARGET_PROJECT_TYPES.some(x=>x===input.projectType.toLowerCase())
 const score=(locationFit?35:0)+(typeFit?35:0)+Math.min(20,input.evidenceCount*5)+(input.decisionMakerKnown?10:0)
 return {score,qualified:score>=60,nextAction:input.decisionMakerKnown?'Request plans':'Identify owner, architect, developer or contractor'}
}
