"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Dispatch = {
  id: string; plate: string; carrier: string; weight: number; capacity: number;
  occupancy: number; fare: number; createdAt: string;
};
type Range = "7" | "30" | "90" | "all";
const carriers = ["P & E", "Milla Siete", "Deco"];
const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const compact = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)} M` : n >= 1000 ? `$${Math.round(n / 1000)} mil` : `$${n}`;
const num = (n: number, d = 0) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(n);
const card = "rounded-2xl border border-[#dfe9ed] bg-white shadow-[0_6px_24px_rgba(30,59,70,.04)]";

export default function FinancePage() {
  const [records, setRecords] = useState<Dispatch[]>([]);
  const [range, setRange] = useState<Range>("30");
  const [carrier, setCarrier] = useState("Todos");
  const [plate, setPlate] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  async function refresh() {
    try {
      const response = await fetch("/api/dispatches", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo consultar el historial.");
      const data = await response.json() as { dispatches?: Dispatch[] };
      setRecords(data.dispatches ?? []);
      setNow(Date.now());
      setUpdated(new Date());
      setError("");
    } catch { setError("No se pudo actualizar el panel. Se muestran los últimos datos disponibles."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  const plates = useMemo(() => [...new Set(records.filter(r => carrier === "Todos" || r.carrier === carrier).map(r => r.plate))].sort(), [records, carrier]);
  const filtered = useMemo(() => {
    const start = range === "all" ? -Infinity : now - Number(range) * 86400000;
    return records.filter(r => {
      const time = new Date(r.createdAt).getTime();
      return time >= start && (carrier === "Todos" || r.carrier === carrier) && (plate === "Todas" || r.plate === plate);
    });
  }, [records, range, carrier, plate, now]);
  const metrics = useMemo(() => {
    const expense = filtered.reduce((sum, r) => sum + r.fare, 0);
    const kg = filtered.reduce((sum, r) => sum + r.weight, 0);
    const capacity = filtered.reduce((sum, r) => sum + r.capacity, 0);
    const efficient = filtered.filter(r => r.occupancy >= 70 && r.occupancy <= 100);
    const low = filtered.filter(r => r.occupancy < 50);
    return {
      expense, kg, trips: filtered.length,
      costPerKg: kg ? expense / kg : 0,
      averageFare: filtered.length ? expense / filtered.length : 0,
      occupancy: capacity ? kg / capacity * 100 : 0,
      efficient: filtered.length ? efficient.length / filtered.length * 100 : 0,
      lowTrips: low.length,
      lowExpense: low.reduce((sum, r) => sum + r.fare, 0),
    };
  }, [filtered]);
  const daily = useMemo(() => {
    const grouped = new Map<string, { date: string; expense: number; trips: number }>();
    for (const r of filtered) {
      const key = r.createdAt.slice(0, 10);
      const item = grouped.get(key) ?? { date: key, expense: 0, trips: 0 };
      item.expense += r.fare; item.trips += 1; grouped.set(key, item);
    }
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).map(x => ({
      ...x, label: new Date(`${x.date}T12:00:00Z`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "UTC" }),
    }));
  }, [filtered]);
  const byCarrier = useMemo(() => carriers.map(name => {
    const items = filtered.filter(r => r.carrier === name);
    const expense = items.reduce((sum, r) => sum + r.fare, 0);
    const kg = items.reduce((sum, r) => sum + r.weight, 0);
    return { name, expense, trips: items.length, costPerKg: kg ? expense / kg : 0 };
  }), [filtered]);
  const byVehicle = useMemo(() => [...new Set(filtered.map(r => r.plate))].map(name => {
    const items = filtered.filter(r => r.plate === name);
    const expense = items.reduce((sum, r) => sum + r.fare, 0);
    const kg = items.reduce((sum, r) => sum + r.weight, 0);
    const capacity = items.reduce((sum, r) => sum + r.capacity, 0);
    return { name, carrier: items[0].carrier, trips: items.length, expense, kg, costPerKg: kg ? expense / kg : 0, occupancy: capacity ? kg / capacity * 100 : 0 };
  }).sort((a, b) => b.expense - a.expense), [filtered]);
  function exportCsv() {
    const rows = [["fecha","transportador","placa","peso_kg","capacidad_kg","aforo_pct","flete_cop","costo_kg_cop"],
      ...filtered.map(r => [r.createdAt, r.carrier, r.plate, r.weight, r.capacity, r.occupancy.toFixed(2), r.fare, (r.fare / r.weight).toFixed(2)])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "aurora-finanzas.csv"; link.click(); URL.revokeObjectURL(url);
  }
  const empty = filtered.length === 0;
  return <main className="min-h-screen bg-[#f3f7f8] text-[#19323b]">
    <header className="border-b border-[#dce7eb] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-8">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0b5961] text-2xl font-black text-white">A</span><div><p className="text-lg font-black">Aurora <span className="text-[#0b7980]">SmartFreight</span></p><p className="text-xs text-slate-500">Inteligencia financiera de transporte</p></div></div>
        <div className="flex items-center gap-3"><a href="/" className="rounded-xl border border-[#c9dbe0] px-4 py-2.5 text-sm font-bold hover:bg-[#f3f8f9]">← Registro de despachos</a><span className="hidden rounded-full bg-[#e8f5ef] px-3 py-2 text-xs font-semibold text-[#24634f] sm:inline">● En vivo · 3 s</span></div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 md:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#0b7980]">Panel de Finanzas</p><h1 className="text-3xl font-black tracking-tight md:text-4xl">Control de gasto y eficiencia</h1><p className="mt-2 text-slate-600">Cada indicador usa despachos confirmados. Filtra para encontrar dónde se concentra el costo.</p></div><div className="text-sm text-slate-500">{updated ? `Actualizado ${updated.toLocaleTimeString("es-CO")}` : "Cargando datos…"}</div></div>
      {error && <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
      <section aria-label="Filtros del panel" className={`${card} mb-6 grid gap-4 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end md:p-5`}>
        <div><p className="mb-2 text-sm font-bold">Período</p><div className="flex flex-wrap gap-1 rounded-xl bg-[#eef4f5] p-1">{([["7","7 días"],["30","30 días"],["90","90 días"],["all","Todo"]] as [Range,string][]).map(([value,label]) => <button key={value} onClick={() => setRange(value)} aria-pressed={range === value} className={`rounded-lg px-3 py-2 text-sm font-semibold ${range === value ? "bg-[#0b5961] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>{label}</button>)}</div></div>
        <label className="text-sm font-bold">Transportador<select value={carrier} onChange={e => { setCarrier(e.target.value); setPlate("Todas"); }} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option>Todos</option>{carriers.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm font-bold">Placa<select value={plate} onChange={e => setPlate(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option>Todas</option>{plates.map(p => <option key={p}>{p}</option>)}</select></label>
        <button onClick={exportCsv} disabled={empty} className="h-11 rounded-xl border border-[#0b5961] px-4 text-sm font-bold text-[#0b5961] hover:bg-[#e8f5ef] disabled:cursor-not-allowed disabled:opacity-40">↓ Exportar CSV</button>
      </section>
      {loading ? <div className={`${card} p-12 text-center text-slate-500`}>Cargando indicadores…</div> : empty ? <div className={`${card} p-12 text-center`}><p className="text-lg font-bold">No hay despachos para estos filtros</p><p className="mt-2 text-slate-500">Cambia el período o confirma un despacho para empezar a medir el gasto.</p></div> : <>
        <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Gasto en fletes" value={cop(metrics.expense)} hint={`${num(metrics.trips)} viajes confirmados`} accent />
          <Kpi label="Costo por kg transportado" value={cop(metrics.costPerKg)} hint="Gasto total ÷ kg totales" />
          <Kpi label="Aforo global" value={`${num(metrics.occupancy,1)}%`} hint="Kg totales ÷ capacidad total" />
          <Kpi label="Viajes eficientes" value={`${num(metrics.efficient,1)}%`} hint="Aforo entre 70 % y 100 %" />
        </section>
        <section aria-label="Indicadores complementarios" className="mt-4 grid gap-4 sm:grid-cols-3">
          <Kpi label="Peso transportado" value={`${num(metrics.kg)} kg`} hint="Suma de la carga confirmada" />
          <Kpi label="Flete promedio por viaje" value={cop(metrics.averageFare)} hint="Gasto total ÷ viajes" />
          <Kpi label="Gasto en viajes subutilizados" value={cop(metrics.lowExpense)} hint={`${num(metrics.lowTrips)} viajes con aforo menor a 50 %`} warning={metrics.lowTrips > 0} />
        </section>
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className={`${card} p-5 md:p-6`}><div className="mb-4"><h2 className="text-lg font-bold">Evolución del gasto</h2><p className="text-sm text-slate-500">Flete confirmado por día · COP</p></div><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{ top: 10, right: 14, left: -12, bottom: 0 }}><defs><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b7980" stopOpacity={0.28}/><stop offset="100%" stopColor="#0b7980" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#e7eff1" vertical={false}/><XAxis dataKey="label" tick={{ fontSize: 12, fill: "#607982" }} axisLine={false} tickLine={false}/><YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "#607982" }} axisLine={false} tickLine={false}/><Tooltip formatter={(value) => [cop(Number(value)), "Gasto"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}/><Area type="monotone" dataKey="expense" stroke="#0b7980" strokeWidth={3} fill="url(#expenseFill)"/></AreaChart></ResponsiveContainer></div></div>
          <div className={`${card} p-5 md:p-6`}><h2 className="text-lg font-bold">Gasto por transportador</h2><p className="mb-5 text-sm text-slate-500">Participación del gasto filtrado</p><div className="space-y-5">{byCarrier.map(c => <div key={c.name}><div className="mb-2 flex justify-between gap-2 text-sm"><span className="font-semibold">{c.name}</span><b>{cop(c.expense)}</b></div><div className="h-3 overflow-hidden rounded-full bg-[#e8eff1]"><div className="h-full rounded-full bg-[#0b7980]" style={{ width: `${metrics.expense ? c.expense / metrics.expense * 100 : 0}%` }}/></div><p className="mt-1 text-xs text-slate-500">{num(c.trips)} viajes · {num(metrics.expense ? c.expense / metrics.expense * 100 : 0, 1)} % del gasto</p></div>)}</div></div>
        </section>
        <section className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          <div className={`${card} p-5 md:p-6`}><h2 className="text-lg font-bold">Costo por kg por transportador</h2><p className="mb-4 text-sm text-slate-500">Menor costo indica mejor aprovechamiento del flete.</p><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={byCarrier} layout="vertical" margin={{ left: 8, right: 28 }}><CartesianGrid stroke="#e7eff1" horizontal={false}/><XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/><Tooltip formatter={(value) => [cop(Number(value)), "Costo por kg"]}/><Bar dataKey="costPerKg" fill="#0b7980" radius={[0, 6, 6, 0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div></div>
          <div className={`${card} overflow-hidden`}><div className="p-5 pb-3 md:px-6"><h2 className="text-lg font-bold">Detalle por vehículo</h2><p className="text-sm text-slate-500">Ordenado por gasto para detectar concentración.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f3f8f9] text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Placa</th><th className="px-4 py-3">Viajes</th><th className="px-4 py-3">Aforo</th><th className="px-4 py-3">Costo/kg</th><th className="px-5 py-3 text-right">Gasto</th></tr></thead><tbody>{byVehicle.map(v => <tr key={v.name} className="border-t border-slate-100"><td className="px-5 py-3"><b>{v.name}</b><span className="block text-xs text-slate-500">{v.carrier}</span></td><td className="px-4 py-3">{num(v.trips)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${v.occupancy >= 70 ? "bg-green-100 text-green-800" : v.occupancy >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{num(v.occupancy,1)} %</span></td><td className="px-4 py-3">{cop(v.costPerKg)}</td><td className="px-5 py-3 text-right font-bold">{cop(v.expense)}</td></tr>)}</tbody></table></div></div>
        </section>
        <p className="mt-5 text-xs leading-relaxed text-slate-500">Fuente: despachos confirmados en Aurora SmartFreight. El aforo global pondera cada viaje por su capacidad; el costo por kg divide el gasto total entre los kg totales. Los valores en COP se muestran redondeados, pero se calculan con los importes registrados.</p>
      </>}
    </div>
  </main>;
}

function Kpi({ label, value, hint, accent = false, warning = false }: { label: string; value: string; hint: string; accent?: boolean; warning?: boolean }) {
  return <div className={`${card} min-w-0 p-5 ${accent ? "border-[#0b7980] bg-[#0b5961] text-white" : ""}`}><p className={`text-sm font-semibold ${accent ? "text-[#bde6df]" : "text-slate-500"}`}>{label}</p><p className={`mt-2 break-words text-2xl font-black tracking-tight md:text-3xl ${warning ? "text-red-600" : ""}`}>{value}</p><p className={`mt-2 text-xs ${accent ? "text-[#bde6df]" : "text-slate-500"}`}>{hint}</p></div>;
}
