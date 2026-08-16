import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Calculator, FileText, Search, ShieldCheck, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const BLUE = "#0F4C81";

function Index() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-bold tracking-tight">Azarraga Glass & Aluminum</div>
            <div className="text-xs text-slate-500">Puerto Princesa · Projects across Palawan</div>
          </div>
          <a href="#quote" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{backgroundColor:BLUE}}>Request a Quote</a>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-28">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.22em]" style={{color:BLUE}}>Glass · Aluminum · Fabrication · Installation</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[1.02] tracking-[-.04em] sm:text-6xl">Built for Palawan projects, from measurement to installation.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Residential and commercial glass and aluminum systems with practical specification support, project documentation and professional installation.</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="#quote" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white" style={{backgroundColor:BLUE}}>Start a Project <ArrowRight size={18}/></a><a href="#systems" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold">Explore Systems</a></div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white shadow-xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-slate-400">Commercial workflow</p><h2 className="mt-3 text-2xl font-semibold">One project record from inquiry to payment.</h2><div className="mt-8 space-y-4">{['Capture project requirements','Review drawings, photos and POs','Build evidence-backed quotation','Human approval before commercial issue','Track PO, invoice and payment'].map((x,i)=><div key={x} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">{i+1}</span><span className="text-sm font-medium">{x}</span></div>)}</div></div>
        </div>
      </section>

      <section id="systems" className="mx-auto max-w-7xl px-6 py-20"><div className="max-w-2xl"><p className="text-sm font-semibold" style={{color:BLUE}}>What we build</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Specify the system, not just “glass and aluminum.”</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{[[Building2,'Windows & Sliding Systems','Sliding windows, sliding doors, fixed panels and framed architectural systems.'],[ShieldCheck,'Tempered & Frameless Glass','Doors, partitions, shower enclosures and commercial glazing with appropriate hardware.'],[Wrench,'Fabrication & Installation','Site measurement, fabrication coordination, delivery, installation and project closeout.']].map(([Icon,t,d]:any)=><article key={t} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="inline-flex rounded-xl p-3" style={{backgroundColor:'#e9f1f8',color:BLUE}}><Icon size={22}/></div><h3 className="mt-5 text-xl font-semibold">{t}</h3><p className="mt-2 leading-7 text-slate-600">{d}</p></article>)}</div></section>

      <section className="border-y border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-6 py-20"><div className="grid gap-6 lg:grid-cols-3">{[[Search,'Understand','Project type, location, opening dimensions, drawings, photos and requirements are captured first.'],[Calculator,'Specify','Glass, aluminum system, finish, hardware and commercial assumptions stay explicit and reviewable.'],[FileText,'Document','Quotation, PO, invoice, payment and source evidence stay connected to the same project history.']].map(([Icon,t,d]:any)=><div key={t} className="flex gap-4"><Icon className="mt-1 shrink-0" style={{color:BLUE}}/><div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{d}</p></div></div>)}</div></div></section>

      <section id="quote" className="mx-auto max-w-7xl px-6 py-20"><div className="rounded-3xl p-8 text-white sm:p-12" style={{backgroundColor:BLUE}}><div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-white/70">Start with the project</p><h2 className="mt-3 text-3xl font-bold">Need windows, doors, partitions or architectural glass?</h2><p className="mt-3 max-w-2xl leading-7 text-white/80">Prepare your project location, approximate dimensions and any drawings or photos. We can organize the specification from there.</p></div><a href="mailto:azarragaglass@gmail.com?subject=Project%20Quote%20Request" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950">Request Project Review <ArrowRight size={18}/></a></div></div></section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-900">Azarraga Glass & Aluminum</span><span>Palawan, Philippines</span></div></footer>
    </main>
  );
}
