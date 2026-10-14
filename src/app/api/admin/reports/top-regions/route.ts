import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

// Brazilian state names lookup
const STATE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createServerClient();

  let query = supabase
    .from("orders")
    .select("address, total_cents")
    .in("status", ["approved", "shipped", "delivered"]);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: orders } = await query;

  if (!orders || orders.length === 0) {
    return NextResponse.json({ by_state: [], by_city: [] });
  }

  // Aggregate by state
  const stateMap = new Map<
    string,
    { order_count: number; revenue_cents: number }
  >();

  // Aggregate by city
  const cityMap = new Map<
    string,
    { state: string; order_count: number; revenue_cents: number }
  >();

  for (const order of orders) {
    const addr = order.address as {
      state?: string;
      city?: string;
      zip?: string;
    } | null;
    if (!addr) continue;

    const state = addr.state?.toUpperCase() ?? "??";
    const city = addr.city ?? "Desconhecido";
    const cityKey = `${city}|${state}`;

    // State aggregation
    const stateData = stateMap.get(state) ?? {
      order_count: 0,
      revenue_cents: 0,
    };
    stateData.order_count += 1;
    stateData.revenue_cents += order.total_cents;
    stateMap.set(state, stateData);

    // City aggregation
    const cityData = cityMap.get(cityKey) ?? {
      state,
      order_count: 0,
      revenue_cents: 0,
    };
    cityData.order_count += 1;
    cityData.revenue_cents += order.total_cents;
    cityMap.set(cityKey, cityData);
  }

  const byState = Array.from(stateMap.entries())
    .sort((a, b) => b[1].revenue_cents - a[1].revenue_cents)
    .map(([state, data]) => ({
      state,
      state_name: STATE_NAMES[state] ?? state,
      order_count: data.order_count,
      revenue_cents: data.revenue_cents,
    }));

  const byCity = Array.from(cityMap.entries())
    .sort((a, b) => b[1].revenue_cents - a[1].revenue_cents)
    .slice(0, 20)
    .map(([key, data]) => {
      const [city] = key.split("|");
      return {
        city,
        state: data.state,
        order_count: data.order_count,
        revenue_cents: data.revenue_cents,
      };
    });

  return NextResponse.json({ by_state: byState, by_city: byCity });
}
