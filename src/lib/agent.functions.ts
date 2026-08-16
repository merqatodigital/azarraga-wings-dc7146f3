import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const FREE_ROUTER = { id: "openrouter/free", name: "OpenRouter Free Router", contextLength: null as number | null, free: true };
const zero = (v: unknown) => Number(v ?? 1) === 0;
function runtimeSecret(name:string){const p=typeof process!=="undefined"?process.env?.[name]:undefined;if(p)return p;const m=(import.meta as any)?.env?.[name];if(m)return m;return (globalThis as any)?.env?.[name] as string|undefined}

export const listAgentModels=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async()=>{
 const key=runtimeSecret("OPENROUTER_API_KEY");
 try{
  const res=await fetch(OPENROUTER_MODELS,{headers:{Accept:"application/json",...(key?{Authorization:`Bearer ${key}`}:{})}});
  if(!res.ok)throw new Error(`OpenRouter models returned ${res.status}`);
  const json=await res.json() as {data?:Array<Record<string,any>>};
  const discovered=(json.data??[]).map(m=>({id:String(m.id),name:String(m.name??m.id),contextLength:(m.context_length as number)??null,free:zero(m?.pricing?.prompt)&&zero(m?.pricing?.completion)})).filter(m=>m.free);
  const models=[FREE_ROUTER,...discovered.filter(m=>m.id!==FREE_ROUTER.id)];
  models.sort((a,b)=>(b.contextLength??0)-(a.contextLength??0));
  return {provider:"openrouter" as const,models,error:key?null:"OpenRouter secret is not visible to this runtime."};
 }catch(error){console.error("[Azarraga Agent] model discovery failed",error);return {provider:"openrouter" as const,models:[FREE_ROUTER],error:key?null:"OpenRouter secret is not visible to this runtime."};}
});

const AskInput=z.object({message:z.string().min(1),model:z.string().min(1),intent:z.enum(["leads","quotes","invoices","icm","documents","general"]).default("general")});
const SYSTEM_RULES=`You are the Azarraga Commercial Agent for Azarraga Glass & Aluminum in Palawan, Philippines.
Your jobs are FIND BUSINESS, WIN BUSINESS and BILL BUSINESS. Use commercial memory as evidence, never permission to invent a current price. Never infer VAT/tax treatment. Never issue or send a quote or invoice. Deterministic code performs final arithmetic and a human approves commercial documents. Never fabricate historical records, prices, customers or documents. Clearly separate FACT, DERIVED VALUE, AGENT INFERENCE and HUMAN-APPROVED VALUE. Base currency is PHP.`;

export const askAgent=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>AskInput.parse(input)).handler(async({data,context})=>{
 const key=runtimeSecret("OPENROUTER_API_KEY");if(!key)return{error:"OpenRouter secret is not visible to the deployed app runtime.",reply:"",model:data.model};
 const{supabase}=context;
 const[evidence,quotes,invoices,leads,docs,customers]=await Promise.all([
  supabase.from("commercial_evidence").select("product_family, system, customer_name, project_name, location, width_mm, height_mm, quantity, historical_unit_price_centavos, currency, source_reference, source_date, pricing_type").order("source_date",{ascending:false}).limit(60),
  supabase.from("quotes").select("quote_number, customer_name, project_name, status, total_centavos, warnings, quote_date").order("created_at",{ascending:false}).limit(20),
  supabase.from("invoices").select("invoice_number, customer_name, project_name, status, total_centavos, balance_centavos, invoice_type").order("created_at",{ascending:false}).limit(20),
  supabase.from("leads").select("project, location, project_type, status, score, next_action").order("created_at",{ascending:false}).limit(20),
  supabase.from("source_documents").select("doc_type, reference, customer_name, project_name, ingestion_status, doc_date, extracted").order("created_at",{ascending:false}).limit(20),
  supabase.from("customers").select("name, company, project_address").order("created_at",{ascending:false}).limit(30)
 ]);
 const dbError=[evidence,quotes,invoices,leads,docs,customers].find((r:any)=>r.error)?.error;if(dbError)return{error:`Commercial memory query failed: ${dbError.message}`,reply:"",model:data.model};
 const contextJson=JSON.stringify({note:"Amounts are integer centavos in PHP. Historical prices are evidence only.",commercialMemory:evidence.data??[],quotes:quotes.data??[],invoices:invoices.data??[],leads:leads.data??[],sourceDocuments:docs.data??[],customers:customers.data??[]});
 try{const res=await fetch(OPENROUTER_CHAT,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":"https://azarraga.vercel.app","X-Title":"Azarraga Commercial Agent"},body:JSON.stringify({model:data.model||"openrouter/free",messages:[{role:"system",content:`${SYSTEM_RULES}\nCurrent intent: ${data.intent}.\nLIVE COMMERCIAL CONTEXT:\n${contextJson}`},{role:"user",content:data.message}],temperature:.2})});const json=await res.json() as any;if(!res.ok)return{error:json?.error?.message??`OpenRouter returned ${res.status}`,reply:"",model:data.model};return{error:null as string|null,reply:String(json?.choices?.[0]?.message?.content??""),model:data.model,humanReviewRequired:true};}catch(error){console.error("[Azarraga Agent] request failed",error);return{error:"Agent request failed.",reply:"",model:data.model};}
});
