"use client";
import { useEffect, useMemo, useState } from "react";

type Vehicle = { plate: string; carrier: string; type: string; capacity: number; fare: number };
type Dispatch = { id: string; plate: string; carrier: string; weight: number; occupancy: number; fare: number; createdAt: string; deliveries: Record<string,string> };
const vehicles: Vehicle[] = [
  {plate:"WLY214",carrier:"P & E",type:"NHR",capacity:2000,fare:400000},
  {plate:"SNX467",carrier:"P & E",type:"Turbo",capacity:3000,fare:424000},
  {plate:"JYX696",carrier:"Milla Siete",type:"NPR",capacity:1000,fare:509065},
  {plate:"WPS783",carrier:"Milla Siete",type:"Turbo",capacity:3000,fare:424000},
  {plate:"JYP022",carrier:"Milla Siete",type:"Sencillo",capacity:2000,fare:449175},
  {plate:"SNU752",carrier:"Deco",type:"Turbo",capacity:3000,fare:702000}
];
const packages = [
  {key:"confeccion",name:"Tula confección",weight:25},
  {key:"preconfeccion",name:"Tula preconfección",weight:20},
  {key:"bolsa",name:"Bolsa",weight:8},
  {key:"caja",name:"Caja",weight:15}
] as const;
type Quantities = Record<(typeof packages)[number]["key"],number>;
const empty: Quantities = {confeccion:0,preconfeccion:0,bolsa:0,caja:0};
const cop = (n:number) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const fmt = (n:number,d=0) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:d}).format(n);
export default function Home() {
  const [carrier,setCarrier]=useState(""); const [plate,setPlate]=useState("");
  const [qty,setQty]=useState<Quantities>(empty); const [records,setRecords]=useState<Dispatch[]>([]);
  const [hooks,setHooks]=useState<Record<string,boolean>>({}); const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState(""); const [tab,setTab]=useState<"nuevo"|"historial">("nuevo");
  const vehicle=vehicles.find(v=>v.plate===plate);
  const weight=packages.reduce((s,p)=>s+qty[p.key]*p.weight,0);
  const occupancy=vehicle?weight/vehicle.capacity*100:0;
  const state=!vehicle||!weight?"pendiente":occupancy>100?"sobrecupo":occupancy>=70?"óptimo":occupancy>=50?"atención":"subutilizado";
  const color=state==="óptimo"?"bg-green-500":state==="atención"?"bg-yellow-400":state==="pendiente"?"bg-slate-300":"bg-red-500";
  const total=useMemo(()=>records.reduce((s,r)=>s+r.fare,0),[records]);
  async function refresh(){try{const r=await fetch("/api/dispatches",{cache:"no-store"});if(!r.ok)throw Error();const d=await r.json() as {dispatches?:Dispatch[];webhooks?:Record<string,boolean>};setRecords(d.dispatches||[]);setHooks(d.webhooks||{});}catch{setNotice("Sin conexión con el servidor. Reintentando…");}}
  useEffect(()=>{refresh();const t=setInterval(refresh,3000);return()=>clearInterval(t);},[]);
  async function confirm(){
    if(!vehicle||!weight||occupancy>100||busy)return;
    setBusy(true);setNotice("");
    try{const r=await fetch("/api/dispatches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:crypto.randomUUID(),plate,quantities:qty})});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||"No se pudo confirmar");setQty(empty);setNotice("Despacho confirmado. Revisa el estado de los avisos en Historial.");await refresh();}
    catch(e){setNotice(e instanceof Error?e.message:"Error de conexión");}finally{setBusy(false);}
  }
  return <main className="min-h-screen bg-[#f3f7f8] text-[#19323b]">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0b5961] text-2xl font-black text-white">A</span><div><p className="text-lg font-black">Aurora <span className="text-[#0b7980]">SmartFreight</span></p><p className="text-xs text-slate-500">Control de despachos y fletes</p></div></div><span className="rounded-full bg-[#e8f5ef] px-4 py-2 text-sm font-semibold text-[#24634f]">● Actualización cada 3 s</span></div></header>
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-9 md:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#0b7980]">Panel operativo</p><h1 className="text-3xl font-black tracking-tight md:text-4xl">Cada viaje, bajo control.</h1><p className="mt-2 text-slate-600">Ingresa la carga y revisa el aforo y el costo antes de salir.</p></div><nav className="flex rounded-xl bg-white p-1 shadow-sm"><button onClick={()=>setTab("nuevo")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab==="nuevo"?"bg-[#0b5961] text-white":"text-slate-600"}`}>Nuevo despacho</button><button onClick={()=>setTab("historial")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab==="historial"?"bg-[#0b5961] text-white":"text-slate-600"}`}>Historial ({records.length})</button></nav></div>
      {notice&&<div role="status" className="mb-5 rounded-xl border border-[#b9dce0] bg-[#edf8fa] p-4 text-sm">{notice}</div>}
      {tab==="nuevo"?<div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex gap-3"><b className="grid h-9 w-9 place-items-center rounded-full bg-[#dff2ef] text-[#0b5961]">1</b><div><h2 className="text-xl font-bold">Elige el transporte</h2><p className="text-sm text-slate-500">Primero el transportador y luego la placa.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Transportador<select value={carrier} onChange={e=>{setCarrier(e.target.value);setPlate("");}} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal"><option value="">Selecciona uno</option>{["P & E","Milla Siete","Deco"].map(n=><option key={n}>{n}</option>)}</select></label><label className="text-sm font-semibold">Vehículo y placa<select value={plate} disabled={!carrier} onChange={e=>setPlate(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal disabled:bg-slate-100"><option value="">Selecciona una placa</option>{vehicles.filter(v=>v.carrier===carrier).map(v=><option key={v.plate} value={v.plate}>{v.plate} · {v.type} · {fmt(v.capacity)} kg</option>)}</select></label></div>
          {vehicle&&<p className="mt-4 rounded-xl bg-[#f3f8f9] p-3 text-sm">Capacidad: <b>{fmt(vehicle.capacity)} kg</b> &nbsp;·&nbsp; Flete: <b>{cop(vehicle.fare)}</b></p>}
          <hr className="my-7 border-slate-200"/><div className="mb-5 flex gap-3"><b className="grid h-9 w-9 place-items-center rounded-full bg-[#dff2ef] text-[#0b5961]">2</b><div><h2 className="text-xl font-bold">Ingresa la carga</h2><p className="text-sm text-slate-500">Indica cuántas unidades llevarás.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">{packages.map(p=><label key={p.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><span><b className="block">{p.name}</b><small className="text-slate-500">{p.weight} kg por unidad</small></span><input aria-label={`Cantidad de ${p.name}`} type="number" min="0" step="1" inputMode="numeric" value={qty[p.key]} onChange={e=>setQty(q=>({...q,[p.key]:Math.max(0,Math.min(99999,Math.floor(Number(e.target.value)||0)))}))} className="h-12 w-20 rounded-lg border border-slate-300 bg-[#f8fafb] text-center text-lg font-bold"/></label>)}</div>
        </section>
        <aside className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-5 flex gap-3"><b className="grid h-9 w-9 place-items-center rounded-full bg-[#dff2ef] text-[#0b5961]">3</b><div><h2 className="text-xl font-bold">Revisa y confirma</h2><p className="text-sm text-slate-500">Resultados en tiempo real.</p></div></div><div className="rounded-2xl bg-[#eaf5f4] p-5"><p className="text-sm text-[#48656c]">Aforo del vehículo</p><div className="mt-1 flex items-center justify-between gap-2"><span className="text-4xl font-black">{vehicle?`${fmt(occupancy,1)}%`:"—"}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${color} ${state==="atención"?"text-[#493a00]":"text-white"}`}>{state}</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-white"><div className={`h-full ${color}`} style={{width:`${Math.min(100,occupancy)}%`}}/></div><p className="mt-3 text-sm text-[#48656c]">{state==="sobrecupo"?"Supera la capacidad. Reduce la carga.":state==="subutilizado"?"Viaje subutilizado. Puedes consolidar más carga.":state==="atención"?"Aforo medio. Revisa si hay una opción mejor.":state==="óptimo"?"Capacidad bien aprovechada.":"Selecciona un vehículo e ingresa la carga."}</p></div>
          <div className="mt-5 divide-y divide-slate-100">{[["Peso del despacho",`${fmt(weight)} kg`],["Capacidad disponible",vehicle?`${fmt(Math.max(0,vehicle.capacity-weight))} kg`:"—"],["Flete del viaje",vehicle?cop(vehicle.fare):"—"],["Costo por kg",vehicle&&weight?cop(vehicle.fare/weight):"—"]].map(([a,b])=><div key={a} className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-600">{a}</span><b>{b}</b></div>)}</div><button disabled={!vehicle||!weight||occupancy>100||busy} onClick={confirm} className="mt-5 h-14 w-full rounded-xl bg-[#0b5961] font-bold text-white hover:bg-[#0d737a] disabled:cursor-not-allowed disabled:bg-slate-300">{busy?"Confirmando…":"Confirmar despacho →"}</button><p className="mt-3 text-center text-xs text-slate-500">El sobrecupo bloquea la confirmación.</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="font-bold">Gasto acumulado</h2><p className="text-sm text-slate-500">Despachos confirmados</p></div><b className="text-xl text-[#0b5961]">{cop(total)}</b></div><div className="mt-4 space-y-2">{["P & E","Milla Siete","Deco"].map(c=><div key={c} className="flex justify-between rounded-lg bg-[#f3f8f9] p-2 text-sm"><span>{c}</span><b>{cop(records.filter(r=>r.carrier===c).reduce((s,r)=>s+r.fare,0))}</b></div>)}</div></section>
        </aside>
      </div>:<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><h2 className="text-xl font-bold">Despachos confirmados</h2><p className="mb-5 text-sm text-slate-500">El historial se actualiza en todos los dispositivos.</p>{records.length===0?<p className="rounded-xl bg-[#f3f8f9] p-8 text-center text-slate-500">Aún no hay despachos registrados.</p>:<div className="space-y-3">{records.map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><b>{r.plate} · {r.carrier}</b><p className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleString("es-CO")} · {fmt(r.weight)} kg · {fmt(r.occupancy,1)}% de aforo</p><p className="mt-1 text-xs text-slate-500">Avisos: {Object.entries(r.deliveries||{}).map(([a,s])=>`${a}: ${s}`).join(" · ")||"sin destinos configurados"}</p></div><b className="text-lg text-[#0b5961]">{cop(r.fare)}</b></article>)}</div>}</section>}
      <p className="mt-7 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><b className="text-[#19323b]">Comunicación entre áreas:</b> al confirmar, el servidor avisa por webhook a logística, finanzas y planta. {Object.values(hooks).some(Boolean)?"Los destinos activos reciben el aviso al instante.":"Faltan las URL de destino para activar los avisos."}</p>
    </div>
  </main>;
}
