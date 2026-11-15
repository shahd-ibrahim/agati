import { NextResponse } from "next/server";
import { allItemIds, buildItem, findItem, mutateMenu, slugify, uniqueId, validateItem } from "@/lib/menu-store";
import { isAdmin } from "@/lib/auth";
import type { BulkAction, MenuItem } from "@/lib/types";

const MAX_BATCH = 500;

/**
 * Admin bulk operations, applied in a single write:
 *   setAvailability · move · adjustPrice (±%) · delete · create (many dishes at once)
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as BulkAction | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.action === "create") {
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > MAX_BATCH)
      return NextResponse.json({ error: `items must be a non-empty array (max ${MAX_BATCH})` }, { status: 400 });
    for (const [i, it] of body.items.entries()) {
      const error = validateItem(it, false);
      if (error) return NextResponse.json({ error: `Row ${i + 1}: ${error}` }, { status: 400 });
    }
    const created = await mutateMenu((data) => {
      const category = data.categories.find((c) => c.id === body.categoryId);
      if (!category) return null;
      const taken = allItemIds(data);
      const items: MenuItem[] = body.items.map((it) => buildItem(it, uniqueId(slugify(it.name?.en || ""), taken)));
      category.items.push(...items);
      return items.length;
    });
    if (created === null) return NextResponse.json({ error: "Unknown categoryId" }, { status: 400 });
    return NextResponse.json({ ok: true, count: created });
  }

  if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > MAX_BATCH)
    return NextResponse.json({ error: `ids must be a non-empty array (max ${MAX_BATCH})` }, { status: 400 });

  const result = await mutateMenu((data) => {
    const ids = new Set(body.ids);
    let count = 0;
    switch (body.action) {
      case "setAvailability":
        for (const c of data.categories) for (const it of c.items) if (ids.has(it.id)) (it.isAvailable = !!body.value), count++;
        return { count };
      case "adjustPrice": {
        const p = Number(body.percent);
        if (!Number.isFinite(p) || p <= -100 || p > 500) return { error: "percent must be between -99 and 500" };
        for (const c of data.categories)
          for (const it of c.items) if (ids.has(it.id)) (it.price = Math.max(0, Math.round(it.price * (1 + p / 100)))), count++;
        return { count };
      }
      case "move": {
        const target = data.categories.find((c) => c.id === body.categoryId);
        if (!target) return { error: "Unknown categoryId" };
        for (const id of body.ids) {
          const found = findItem(data, id);
          if (!found || found.category === target) continue;
          found.category.items.splice(found.index, 1);
          target.items.push(found.item);
          count++;
        }
        return { count };
      }
      case "delete":
        for (const c of data.categories) {
          const before = c.items.length;
          c.items = c.items.filter((it) => !ids.has(it.id));
          count += before - c.items.length;
        }
        return { count };
      default:
        return { error: "Unknown action" };
    }
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, ...result });
}
