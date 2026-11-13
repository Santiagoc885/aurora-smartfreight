import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { dispatches } from "../../../db/schema";

export const dynamic = "force-dynamic";
const vehicles = [
  { plate: "WLY214", carrier: "P & E", capacity: 2000, fare: 400000 },
  { plate: "SNX467", carrier: "P & E", capacity: 3000, fare: 424000 },
  { plate: "JYX696", carrier: "Milla Siete", capacity: 1000, fare: 509065 },
  { plate: "WPS783", carrier: "Milla Siete", capacity: 3000, fare: 424000 },
  { plate: "JYP022", carrier: "Milla Siete", capacity: 2000, fare: 449175 },
  { plate: "SNU752", carrier: "Deco", capacity: 3000, fare: 702000 },
] as const;
const weights = { confeccion: 25, preconfeccion: 20, bolsa: 8, caja: 15 };
type Key = keyof typeof weights;
const areas = ["logistica", "finanzas", "planta"] as const;
function destinations() {
  const config = env as unknown as Record<string, string | undefined>;
  return {
    logistica: config.LOGISTICS_WEBHOOK_URL,
    finanzas: config.FINANCE_WEBHOOK_URL,
    planta: config.PLANT_WEBHOOK_URL,
  };
}
function publicRow(row: typeof dispatches.$inferSelect) {
  return { ...row, quantities: JSON.parse(row.quantities), deliveries: JSON.parse(row.deliveries) };
}
export async function GET() {
  try {
    const rows = await getDb().select().from(dispatches).orderBy(desc(dispatches.createdAt));
    const urls = destinations();
    return Response.json({ dispatches: rows.map(publicRow), webhooks: Object.fromEntries(areas.map(a => [a, Boolean(urls[a])])) });
  } catch {
    return Response.json({ error: "No se pudo consultar el historial" }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as { id?: string; plate?: string; quantities?: Record<string, unknown> };
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ error: "Identificador inválido" }, { status: 400 });
    const vehicle = vehicles.find(v => v.plate === body.plate);
    if (!vehicle) return Response.json({ error: "Selecciona una placa válida" }, { status: 400 });
    const quantities = {} as Record<Key, number>;
    for (const key of Object.keys(weights) as Key[]) {
      const value = body.quantities?.[key];
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99999)
        return Response.json({ error: "Las cantidades deben ser números enteros positivos" }, { status: 400 });
      quantities[key] = value;
    }
    const weight = (Object.keys(weights) as Key[]).reduce((sum, key) => sum + quantities[key] * weights[key], 0);
    if (weight <= 0 || weight > vehicle.capacity) return Response.json({ error: "La carga debe superar 0 kg y respetar la capacidad del vehículo" }, { status: 400 });
    const db = getDb();
    const existing = await db.select().from(dispatches).where(eq(dispatches.id, body.id));
    if (existing.length) return Response.json({ dispatch: publicRow(existing[0]), duplicate: true });
    const row = {
      id: body.id, plate: vehicle.plate, carrier: vehicle.carrier,
      quantities: JSON.stringify(quantities), weight, capacity: vehicle.capacity,
      occupancy: weight / vehicle.capacity * 100, fare: vehicle.fare,
      deliveries: JSON.stringify({}), createdAt: new Date().toISOString(),
    };
    await db.insert(dispatches).values(row);
    const urls = destinations();
    const statuses: Record<string,string> = {};
    await Promise.all(areas.map(async area => {
      const url = urls[area];
      if (!url) { statuses[area] = "sin configurar"; return; }
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") throw Error("URL inválida");
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": row.id },
          body: JSON.stringify({ event: "dispatch.confirmed", area, dispatch: { ...row, quantities, deliveries: undefined } }),
          signal: AbortSignal.timeout(8000),
        });
        statuses[area] = response.ok ? "entregado" : `error HTTP ${response.status}`;
      } catch { statuses[area] = "falló"; }
    }));
    await db.update(dispatches).set({ deliveries: JSON.stringify(statuses) }).where(eq(dispatches.id, row.id));
    return Response.json({ dispatch: { ...row, quantities, deliveries: statuses } }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo guardar el despacho" }, { status: 500 });
  }
}
